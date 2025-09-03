"""
千问大模型集成模块
提供智能审校功能的接口封装
"""

import os
import json
import requests
import re
import time
from typing import Dict, List, Optional

class QwenProofreader:
    def __init__(self, api_key=None, base_url=None, model_name="qwen-plus"):
        """
        初始化千问审校模块。
        :param api_key: 千问 API Key (优先级: 参数 > 环境变量)
        :param base_url: 千问 API 接入点
        :param model_name: 使用的千问模型名称
        """
        self.api_key = api_key or os.getenv("QWEN_API_KEY")
        self.base_url = base_url or os.getenv("QWEN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
        self.model_name = model_name or os.getenv("QWEN_MODEL", "qwen-plus")
        self.timeout = 30  # 请求超时时间（秒）
        self.max_retries = 2  # 最大重试次数

    def proofread(self, content: str) -> Dict:
        """
        使用千问大模型对文本进行审校

        Args:
            content (str): 要审校的文本内容

        Returns:
            dict: 审校结果，包括问题列表和统计信息
        """
        try:
            print(f"[Qwen] Starting proofreading for {len(content)} characters")
            start_time = time.time()
            
            # 调用千问 API
            corrections = self._call_qwen_api(content)
            
            # 解析 API 返回结果为标准格式
            issues = self._parse_corrections(content, corrections)
            
            end_time = time.time()
            print(f"[Qwen] Proofreading completed in {end_time - start_time:.2f}s, found {len(issues)} issues")
            
            return {
                'issues': issues,
                'statistics': self._calculate_statistics(issues)
            }
            
        except Exception as e:
            print(f"[Qwen] Error during proofreading: {str(e)}")
            # 返回空结果，不影响整体审校流程
            return {
                'issues': [],
                'statistics': {
                    'total_issues': 0,
                    'typos': 0,
                    'grammar': 0,
                    'punctuation': 0,
                    'sensitive': 0
                }
            }

    def _call_qwen_api(self, content: str) -> str:
        """
        调用千问 API 进行文本审校
        """
        # 基础校验：必须提供 API Key
        if not self.api_key:
            raise Exception("缺少 QWEN_API_KEY 环境变量")
        
        url = f"{self.base_url}/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # 构建审校提示词（新增 sensitive 类型与 few-shot 示例）
        system_prompt = """你是一个专业的中文文本审校助手。请严格且只输出如下 JSON 结构：
{
  "corrections": [
    {
      "original": "原始错误文本",
      "corrected": "修正后文本",
      "type": "typo|grammar|punctuation|sensitive|style",
      "reason": "简洁说明修改原因（不超过40字）",
      "start": 数字,  // 在原文中的起始索引（包含，0 基）
      "end": 数字     // 在原文中的结束索引（不包含）
    }
  ]
}

分类说明：
- typo：错别字、用词错误（如“的地得”误用、常见混淆词）。
- grammar：语序/搭配/语法性错误；风格表达建议请用 style。
- punctuation：中英文标点混用、成对标点缺失、标点位置不当等。
- sensitive：涉政、涉黄、暴恐、违法合规风险、辱骂歧视等（当存在潜在风险或不当表述时使用）。
- style：非刚性问题的表达/风格优化，保留为建议。

严格要求：
- 仅输出 JSON，不要包含任何多余文本或解释。
- start/end 必须精准对应 original 在用户原文中的片段（0<=start<end<=len(原文)）。
- type 仅限上述五类；风格类用 style，合规风险用 sensitive。
- 没有问题时返回 {"corrections": []}。

示例（仅供学习格式，不要包含在输出中）：
{
  "corrections": [
    {"original": "基于这个原理。", "corrected": "基于这一原理。", "type": "grammar", "reason": "用词更规范", "start": 0, "end": 7},
    {"original": "Hello，世界", "corrected": "Hello, 世界", "type": "punctuation", "reason": "英文逗号用半角", "start": 0, "end": 8},
    {"original": "“数据分析(DA”", "corrected": "“数据分析(DA)”", "type": "punctuation", "reason": "补全成对标点", "start": 0, "end": 8},
    {"original": "某些群体都是…", "corrected": "某些群体往往……", "type": "sensitive", "reason": "避免刻板/歧视性表达", "start": 0, "end": 7}
  ]
}
"""

        user_prompt = f"请审校以下文本，按上面的 JSON 结构返回；注意：优先识别语法、标点与合规风险，精确给出 start/end：\n\n{content}"
        
        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.1,
            "max_tokens": 2000
        }
        
        # 重试机制
        for attempt in range(self.max_retries + 1):
            try:
                print(f"[Qwen] Calling API (attempt {attempt + 1}/{self.max_retries + 1})")
                
                response = requests.post(
                    url, 
                    headers=headers, 
                    json=payload, 
                    timeout=self.timeout
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if 'choices' in result and result['choices']:
                        return result['choices'][0]['message']['content']
                    else:
                        raise Exception("API 返回格式异常")
                else:
                    raise Exception(f"API 请求失败: {response.status_code} - {response.text}")
                    
            except requests.exceptions.Timeout:
                print(f"[Qwen] API timeout on attempt {attempt + 1}")
                if attempt == self.max_retries:
                    raise Exception("API 请求超时")
                time.sleep(1)  # 等待1秒后重试
                
            except requests.exceptions.RequestException as e:
                print(f"[Qwen] Network error on attempt {attempt + 1}: {str(e)}")
                if attempt == self.max_retries:
                    raise Exception(f"网络请求错误: {str(e)}")
                time.sleep(1)
                
        raise Exception("API 调用失败")

    def _parse_corrections(self, original_text: str, api_response: str) -> List[Dict]:
        """
        解析千问 API 返回的审校结果
        """
        issues = []
        
        try:
            # 尝试解析 JSON 响应
            response_data = json.loads(api_response)
            corrections = response_data.get('corrections', [])
            
            for correction in corrections:
                original = correction.get('original', '')
                corrected = correction.get('corrected', '')
                error_type = (correction.get('type') or 'typo').strip()
                reason = correction.get('reason', '建议修改')

                # 解析 start/end 或 position
                start = correction.get('start')
                end = correction.get('end')
                if (start is None or end is None) and isinstance(correction.get('position'), dict):
                    pos_obj = correction.get('position')
                    start = pos_obj.get('start')
                    end = pos_obj.get('end')
                
                if original and corrected and original != corrected:
                    normalized_type = self._normalize_type(error_type)

                    # 优先使用结构化位置（合法性校验）
                    if isinstance(start, int) and isinstance(end, int) and 0 <= start < end <= len(original_text):
                        # 防御：确认切片文本与 original 一致，否则回退到搜索
                        if original_text[start:end] == original:
                            issue = {
                                'type': normalized_type,
                                'message': f'{reason}："{original}" → "{corrected}"',
                                'position': {
                                    'start': start,
                                    'end': end
                                },
                                'original': original,
                                'suggestion': corrected,
                                'suggestions': [corrected],
                                'severity': 'warning',
                                'source': 'qwen'
                            }
                            if error_type.lower() == 'style':
                                issue['subtype'] = 'style'
                            issues.append(issue)
                            continue
                    
                    # 否则退回到基于文本搜索的匹配（可能产生多处）
                    positions = self._find_text_positions(original_text, original)
                    for pos in positions:
                        issue = {
                            'type': normalized_type,
                            'message': f'{reason}："{original}" → "{corrected}"',
                            'position': {
                                'start': pos,
                                'end': pos + len(original)
                            },
                            'original': original,
                            'suggestion': corrected,
                            'suggestions': [corrected],
                            'severity': 'warning',
                            'source': 'qwen'
                        }
                        if error_type.lower() == 'style':
                            issue['subtype'] = 'style'
                        issues.append(issue)
                        
        except json.JSONDecodeError:
            print(f"[Qwen] Failed to parse API response as JSON: {api_response[:200]}...")
            # 尝试从自然语言中提取修改建议
            issues = self._parse_natural_language_response(original_text, api_response)
            
        except Exception as e:
            print(f"[Qwen] Error parsing corrections: {str(e)}")
            
        return issues

    def _find_text_positions(self, text: str, target: str) -> List[int]:
        """在文本中查找目标字符串的所有位置"""
        positions = []
        start = 0
        while True:
            pos = text.find(target, start)
            if pos == -1:
                break
            positions.append(pos)
            start = pos + 1
        return positions

    def _parse_natural_language_response(self, original_text: str, response: str) -> List[Dict]:
        """
        从自然语言响应中提取修改建议
        """
        issues = []
        
        # 使用正则表达式匹配常见的修改建议格式
        patterns = [
            r'"([^"]+)"\s*(?:→|应改为|改为|修改为)\s*"([^"]+)"',
            r'将\s*"([^"]+)"\s*(?:改为|修改为)\s*"([^"]+)"',
            r'"([^"]+)"\s*错误.*?正确.*?"([^"]+)"'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, response, re.IGNORECASE)
            for original, corrected in matches:
                if original and corrected and original != corrected:
                    positions = self._find_text_positions(original_text, original)
                    for pos in positions:
                        issue = {
                            'type': 'typo',
                            'message': f'建议修改："{original}" → "{corrected}"',
                            'position': {
                                'start': pos,
                                'end': pos + len(original)
                            },
                            'original': original,  # 添加 original 字段，兼容前端高亮校验
                            'suggestion': corrected,  # 兼容前端字段
                            'suggestions': [corrected],
                            'severity': 'warning'
                        }
                        issues.append(issue)
        
        return issues

    def _normalize_type(self, error_type: str) -> str:
        """标准化错误类型"""
        type_mapping = {
            'typo': 'typo',
            'grammar': 'grammar', 
            'punctuation': 'punctuation',
            'sensitive': 'sensitive',
            'style': 'grammar'
        }
        return type_mapping.get(error_type.lower(), 'typo')

    # 新增：敏感内容解释与重写（批量）
    def explain_sensitive(self, content: str, detections: List[Dict]) -> List[Dict]:
        """
        基于 DFA 召回的敏感片段，调用 LLM 给出解释(reason)与更安全的替代表述(corrected)。
        detections: [{start:int, end:int, word:str, category:str}]
        返回: [{start,end, reason, corrected}]（仅对有建议的项返回）
        """
        if not detections:
            return []
        if not self.api_key:
            # 无法出网时返回空，保持静默降级
            return []

        # 组装窗口上下文，避免模型脱离语境给建议
        def window(text, s, e, radius=40):
            left = max(0, s - radius)
            right = min(len(text), e + radius)
            return text[left:right]

        # 限制单次批量，避免 prompt 超长
        batch = detections[:30]
        items = []
        for det in batch:
            s = int(det.get('start', 0))
            e = int(det.get('end', 0))
            if not (0 <= s < e <= len(content)):
                continue
            items.append({
                'start': s,
                'end': e,
                'span': content[s:e],
                'category': det.get('category') or '敏感内容',
                'context': window(content, s, e)
            })
        if not items:
            return []

        system_prompt = """你是合规与用语规范专家。仅输出严格的 JSON：
{
  "explanations": [
    {"start": 数字, "end": 数字, "reason": "不超过40字，说明风险或不当点", "corrected": "更安全更中性的表述"}
  ]
}
要求：
- 只针对提供的片段给出建议，不要引入未出现的信息。
- 若原表达合理且无风险，可不返回该项（不要强行修改）。
- 保持上下文语义，尽量保留信息但消解风险（避免歧视、煽动、涉黄、暴恐、违法等）。
- 仅输出 JSON，不要任何额外文字。
"""
        # 将 detections 编成用户提示，模型需逐项给出 start/end 定位，便于合并
        user_items = []
        for it in items:
            user_items.append({
                'start': it['start'],
                'end': it['end'],
                'span': it['span'],
                'category': it['category'],
                'context': it['context']
            })
        user_prompt = json.dumps({
            'task': 'provide_sensitive_explanations',
            'text_length': len(content),
            'items': user_items
        }, ensure_ascii=False)

        url = f"{self.base_url}/chat/completions"
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {
            'model': self.model_name,
            'messages': [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt}
            ],
            'temperature': 0.0,
            'max_tokens': 1500
        }

        # 调用并解析
        for attempt in range(self.max_retries + 1):
            try:
                resp = requests.post(url, headers=headers, json=payload, timeout=self.timeout)
                if resp.status_code != 200:
                    raise Exception(f"API 请求失败: {resp.status_code} - {resp.text}")
                data = resp.json()
                content_msg = (data.get('choices') or [{}])[0].get('message', {}).get('content')
                parsed = json.loads(content_msg)
                exps = parsed.get('explanations', [])
                results = []
                for ex in exps:
                    s = ex.get('start'); e = ex.get('end')
                    reason = (ex.get('reason') or '').strip()
                    corrected = (ex.get('corrected') or '').strip()
                    if isinstance(s, int) and isinstance(e, int) and 0 <= s < e <= len(content) and corrected:
                        results.append({'start': s, 'end': e, 'reason': reason or '优化表述', 'corrected': corrected})
                return results
            except (requests.exceptions.RequestException, json.JSONDecodeError, KeyError) as e:
                if attempt == self.max_retries:
                    return []
                time.sleep(1)
        return []

    def _calculate_statistics(self, issues: List[Dict]) -> Dict:
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
            if issue_type in stats:
                stats[issue_type] += 1
        
        return stats