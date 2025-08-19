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
            all_issues.extend(sensitive_issues)
            print(f"[Performance] Sensitive content check: {time.time() - sensitive_start:.2f}s")
        
        return all_issues
    
    def _process_chunked(self, content, options):
        """分块处理长文本"""
        all_issues = []
        chunks = self._split_text_smart(content)
        
        for i, (chunk_text, chunk_offset) in enumerate(chunks):
            print(f"[Performance] Processing chunk {i+1}/{len(chunks)} (offset: {chunk_offset}, size: {len(chunk_text)})")
            
            chunk_issues = self._process_single(chunk_text, options)
            
            # 调整位置偏移
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

