"""
审校引擎核心服务
整合各种检查服务，提供统一的审校接口
"""

import uuid
import time
from .typo_checker import check_typos_and_grammar
from .punctuation_checker import check_punctuation
from .dfa_filter import check_sensitive_content, init_filters
from .qwen_integration import QwenProofreader

class ProofreadingEngine:
    def __init__(self):
        # 初始化敏感词过滤器
        init_filters()
        # 长文本分块阈值
        self.chunk_size = 5000
        self.qwen_proofreader = QwenProofreader()
    
    def proofread(self, content, options=None):
        """
        对文本进行全面审校
        
        Args:
            content (str): 要审校的文本内容
            options (dict): 审校选项
                - check_typos: 是否检查错别字
                - check_grammar: 是否检查语法
                - check_punctuation: 是否检查标点符号
                - check_sensitive: 是否检查敏感内容
        
        Returns:
            dict: 审校结果
        """
        start_time = time.time()
        
        if options is None:
            options = {
                'check_typos': True,
                'check_grammar': True,
                'check_punctuation': True,
                'check_sensitive': True
            }
        
        all_issues = []
        
        # 判断是否需要分块处理
        if len(content) > self.chunk_size:
            print(f"[Performance] Long text detected ({len(content)} chars), using chunked processing")
            all_issues = self._process_chunked(content, options)
        else:
            all_issues = self._process_single(content, options)
        
        # 为每个问题分配唯一ID
        for issue in all_issues:
            issue['id'] = str(uuid.uuid4())
        
        # 按位置排序
        all_issues.sort(key=lambda x: x['position']['start'])
        
        # 新增：权重与去噪处理（上调标点权重、突出LLM风格与语法、敏感可见度）
        def _weight(issue):
            t = issue.get('type')
            sev = issue.get('severity', '')
            source = issue.get('source', '')
            subtype = issue.get('subtype', '')
            
            # 基础权重：LLM style > typo > grammar/sensitive > punctuation
            if source == 'qwen' and subtype == 'style':
                base = 4.5
            elif t == 'typo':
                base = 3.0
            elif t == 'grammar':
                base = 2.7 if source == 'qwen' else 2.2
            elif t == 'sensitive':
                base = 2.6
            elif t == 'punctuation':
                base = 1.25  # 从0.8上调至1.25，提高可见度
            else:
                base = 1.0
                
            # severity 加成：high>medium>low
            sev_bonus = {'high': 1.0, 'medium': 0.5, 'low': 0.0, 'warning': 0.5, 'info': 0.2}.get(sev, 0.0)
            return base + sev_bonus
        
        # 重叠和解：同一区间优先保留权重高者
        suppressed = [False] * len(all_issues)
        for i in range(len(all_issues)):
            if suppressed[i]:
                continue
            a = all_issues[i]
            a_s, a_e = a['position']['start'], a['position']['end']
            for j in range(i+1, len(all_issues)):
                if suppressed[j]:
                    continue
                b = all_issues[j]
                b_s, b_e = b['position']['start'], b['position']['end']
                # 有交集则和解
                if not (b_s >= a_e or b_e <= a_s):
                    if _weight(b) > _weight(a):
                        suppressed[i] = True
                        break
                    else:
                        suppressed[j] = True
        filtered_issues = [it for k, it in enumerate(all_issues) if not suppressed[k]]
        
        # 分离 LLM style 和其他类型，确保 LLM style 优先展示
        llm_style = [it for it in filtered_issues if it.get('source') == 'qwen' and it.get('subtype') == 'style']
        punct = [it for it in filtered_issues if it.get('type') == 'punctuation']
        other = [it for it in filtered_issues if it not in llm_style and it not in punct]
        
        # 对标点进行温和限流（最多前 12 条），但较之前更宽松
        punct = punct[:12]
        
        # 重组：LLM style + 其他问题 + 有限标点
        all_issues = llm_style + other + punct
        
        # 统计信息
        statistics = self._calculate_statistics(all_issues)
        
        end_time = time.time()
        processing_time = end_time - start_time
        print(f"[Performance] Total processing time: {processing_time:.2f}s for {len(content)} chars")
        
        return {
            'issues': all_issues,
            'statistics': statistics
        }
    
    def _process_single(self, content, options):
        """处理单个文本块"""
        all_issues = []
        
        # 0. 千问大模型辅助审校（可选）
        if options.get('qwen', True):
            qwen_start = time.time()
            try:
                qwen_result = self.qwen_proofreader.proofread(content)
                qwen_issues = qwen_result.get('issues', [])
                # 简单去重：基于 (start,end,message)
                seen = set()
                for issue in qwen_issues:
                    key = (issue['position']['start'], issue['position']['end'], issue['message'])
                    if key not in seen:
                        all_issues.append(issue)
                        seen.add(key)
                print(f"[Performance] Qwen check: {time.time() - qwen_start:.2f}s, issues: {len(qwen_issues)}")
            except Exception as e:
                print(f"[Qwen] 调用失败，跳过大模型审校：{str(e)}")
        
        # 1. 错别字和语法检查
        if options.get('check_typos', True) or options.get('check_grammar', True):
            typo_start = time.time()
            typo_issues = check_typos_and_grammar(content)
            all_issues.extend(typo_issues)
            print(f"[Performance] Typo/Grammar check: {time.time() - typo_start:.2f}s")
        
        # 2. 标点符号检查
        if options.get('check_punctuation', True):
            punct_start = time.time()
            punctuation_issues = check_punctuation(content)
            all_issues.extend(punctuation_issues)
            print(f"[Performance] Punctuation check: {time.time() - punct_start:.2f}s")
        
        # 3. 敏感内容检查
        if options.get('check_sensitive', True):
            sensitive_start = time.time()
            sensitive_issues = check_sensitive_content(content)
        
            # 混合方案：DFA 召回 + LLM 解释与重写（可选，静默降级）
            try:
                if options.get('qwen', True) and sensitive_issues:
                    detections = []
                    for it in sensitive_issues:
                        pos = it.get('position') or {}
                        s = pos.get('start'); e = pos.get('end')
                        if isinstance(s, int) and isinstance(e, int) and 0 <= s < e <= len(content):
                            detections.append({
                                'start': s,
                                'end': e,
                                'word': content[s:e],
                                'category': it.get('category') or '敏感内容'
                            })
                    if detections:
                        exps = self.qwen_proofreader.explain_sensitive(content, detections)
                        # 按区间索引合并
                        exp_map = { (ex['start'], ex['end']): ex for ex in exps }
                        for it in sensitive_issues:
                            pos = it.get('position') or {}
                            key = (pos.get('start'), pos.get('end'))
                            ex = exp_map.get(key)
                            if ex and ex.get('corrected'):
                                reason = (ex.get('reason') or '优化表述').strip()
                                corrected = ex.get('corrected').strip()
                                # 用更安全的改写替换建议，同时补充友好解释
                                it['suggestion'] = corrected
                                # 兼容前端：message/description 至少一项包含解释
                                category = it.get('category') or '敏感内容'
                                msg = f"敏感内容（{category}）：{reason}"
                                if 'message' not in it or not it.get('message'):
                                    it['message'] = msg
                                # 保留原描述，或叠加解释
                                desc = (it.get('description') or '').strip()
                                it['description'] = (desc + ('；' if desc else '') + reason)[:120]
                                it['source'] = it.get('source') or 'hybrid'
                                it['subtype'] = it.get('subtype') or 'sensitive_explain'
            except Exception as e:
                # 安全降级：不中断流程
                print(f"[Sensitive-Hybrid] 解释阶段降级：{str(e)}")

            all_issues.extend(sensitive_issues)
            print(f"[Performance] Sensitive content check: {time.time() - sensitive_start:.2f}s, issues: {len(sensitive_issues)}")
        
        return all_issues
    
    def _process_chunked(self, content, options):
        """分块处理长文本"""
        all_issues = []
        chunks = self._split_text_smart(content)
        
        for i, (chunk_text, chunk_offset) in enumerate(chunks):
            print(f"[Performance] Processing chunk {i+1}/{len(chunks)} (offset: {chunk_offset}, size: {len(chunk_text)})")
            
            chunk_issues = self._process_single(chunk_text, options)
            
            # 调整位置偏移（全局偏移）
            for issue in chunk_issues:
                issue['position']['start'] += chunk_offset
                issue['position']['end'] += chunk_offset
            
            all_issues.extend(chunk_issues)
        
        return all_issues
    
    def _split_text_smart(self, text):
        """智能分割文本，尽量在句子边界分割"""
        chunks = []
        current_pos = 0
        
        while current_pos < len(text):
            chunk_end = min(current_pos + self.chunk_size, len(text))
            
            # 如果不是最后一块，尝试在句子边界分割
            if chunk_end < len(text):
                # 寻找句号、问号、感叹号等句子结束符
                for i in range(chunk_end, max(current_pos + self.chunk_size // 2, chunk_end - 200), -1):
                    if text[i-1] in '。！？\n':
                        chunk_end = i
                        break
            
            chunk_text = text[current_pos:chunk_end]
            chunks.append((chunk_text, current_pos))
            current_pos = chunk_end
        
        return chunks
    
    def _calculate_statistics(self, issues):
        """计算统计信息"""
        stats = {
            'total_issues': len(issues),
            'typos': 0,
            'grammar': 0,
            'punctuation': 0,
            'sensitive': 0
        }
        
        for issue in issues:
            issue_type = issue['type']
            if issue_type == 'typo':
                stats['typos'] += 1
            elif issue_type == 'grammar':
                stats['grammar'] += 1
            elif issue_type == 'punctuation':
                stats['punctuation'] += 1
            elif issue_type == 'sensitive':
                stats['sensitive'] += 1
        
        return stats

# 创建全局实例
proofreading_engine = ProofreadingEngine()

