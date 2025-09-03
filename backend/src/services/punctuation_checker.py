"""
标点符号检查服务
检查中文标点符号的规范使用
"""

import re

class PunctuationChecker:
    def __init__(self):
        # 中文标点符号
        self.chinese_punctuation = '，。！？；：""''（）【】《》'
        # 英文标点符号 - 使用原始字符串避免转义问题
        self.english_punctuation = r',.!?;:"\'()[]<>'
        
        # 标点符号配对
        self.paired_punctuation = {
            '"': '"',
            "'": "'",
            '（': '）',
            '【': '】',
            '《': '》'
        }
    
    def check_punctuation(self, text):
        """检查标点符号使用规范"""
        issues = []
        
        # 检查中英文标点混用
        issues.extend(self._check_mixed_punctuation(text))
        
        # 检查标点符号配对
        issues.extend(self._check_paired_punctuation(text))
        
        # 检查标点符号位置
        issues.extend(self._check_punctuation_position(text))
        
        return issues
    
    def _check_mixed_punctuation(self, text):
        """检查中英文标点混用"""
        issues = []
        
        # 常见的中英文标点对应关系
        replacements = {
            ',': '，',
            '.': '。',
            '!': '！',
            '?': '？',
            ';': '；',
            ':': '：'
        }
        
        for english, chinese in replacements.items():
            # 查找英文标点在中文文本中的使用
            pattern = r'[\u4e00-\u9fff]' + re.escape(english)
            matches = re.finditer(pattern, text)
            
            for match in matches:
                issues.append({
                    'type': 'punctuation',
                    'category': '标点符号',
                    'position': {
                        'start': match.end() - 1,
                        'end': match.end()
                    },
                    'original': english,
                    'suggestion': chinese,
                    'description': f'建议使用中文标点符号 "{chinese}" 替换 "{english}"',
                    'severity': 'low'
                })
        
        return issues
    
    def _check_paired_punctuation(self, text):
        """检查配对标点符号"""
        issues = []
        
        for open_punct, close_punct in self.paired_punctuation.items():
            open_count = text.count(open_punct)
            close_count = text.count(close_punct)
            
            if open_count != close_count:
                # 找到不配对的位置
                if open_count > close_count:
                    # 缺少闭合标点
                    last_pos = text.rfind(open_punct)
                    if last_pos != -1:
                        issues.append({
                            'type': 'punctuation',
                            'category': '标点符号',
                            'position': {
                                'start': last_pos,
                                'end': last_pos + 1
                            },
                            'original': open_punct,
                            'suggestion': f'{open_punct}...{close_punct}',
                            'description': f'配对标点符号 "{open_punct}" 缺少对应的 "{close_punct}"',
                            'severity': 'medium'
                        })
                else:
                    # 多余的闭合标点
                    last_pos = text.rfind(close_punct)
                    if last_pos != -1:
                        issues.append({
                            'type': 'punctuation',
                            'category': '标点符号',
                            'position': {
                                'start': last_pos,
                                'end': last_pos + 1
                            },
                            'original': close_punct,
                            'suggestion': '',
                            'description': f'多余的闭合标点符号 "{close_punct}"',
                            'severity': 'medium'
                        })
        
        return issues
    
    def _check_punctuation_position(self, text):
        """检查标点符号位置"""
        issues = []
        
        # 临时禁用"句号后空格"规则，因为在中文写作中通常不需要
        # 如果未来需要可以通过配置重新启用
        # pattern = r'[。！？][^\s\n]'
        # matches = re.finditer(pattern, text)
        # 
        # for match in matches:
        #     issues.append({
        #         'type': 'punctuation',
        #         'category': '标点符号',
        #         'position': {
        #             'start': match.start() + 1,
        #             'end': match.end()
        #         },
        #         'original': match.group(),
        #         'suggestion': match.group()[0] + ' ' + match.group()[1],
        #         'description': '句号、问号、感叹号后建议添加空格',
        #         'severity': 'low'
        #     })
        
        return issues

# 创建全局实例
punctuation_checker = PunctuationChecker()

def check_punctuation(text):
    """检查标点符号规范"""
    return punctuation_checker.check_punctuation(text)

