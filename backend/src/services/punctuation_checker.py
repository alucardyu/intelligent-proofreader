"""
标点符号检查服务
检查中文标点符号的规范使用
"""

import re

class PunctuationChecker:
    def __init__(self):
        # 中文标点符号
        self.chinese_punctuation = '，。！？；：""''（）【】《》'
        # 英文标点符号
        self.english_punctuation = ',.!?;:"\'\(\)\[\]<>'
        
        # 标点符号规则
        self.rules = [
            {
                'name': '中英文标点混用',
                'pattern': r'[a-zA-Z\u4e00-\u9fff][,.!?;:"\'\(\)\[\]<>]',
                'description': '中文语境中应使用中文标点符号',
                'severity': 'medium'
            },
            {
                'name': '句末缺少标点',
                'pattern': r'[\u4e00-\u9fff][a-zA-Z0-9]?\s*\n',
                'description': '句末可能缺少标点符号',
                'severity': 'low'
            },
            {
                'name': '重复标点',
                'pattern': r'[，。！？；：]{2,}',
                'description': '存在重复的标点符号',
                'severity': 'medium'
            },
            {
                'name': '空格使用不当',
                'pattern': r'[\u4e00-\u9fff]\s+[\u4e00-\u9fff]',
                'description': '中文字符间不应有空格',
                'severity': 'low'
            },
            {
                'name': '引号不匹配',
                'pattern': r'"[^"]*$|\'[^\']*$',
                'description': '引号可能不匹配',
                'severity': 'medium'
            }
        ]
    
    def check_punctuation(self, text):
        """检查标点符号问题"""
        issues = []
        
        for rule in self.rules:
            pattern = rule['pattern']
            matches = re.finditer(pattern, text)
            
            for match in matches:
                issues.append({
                    'type': 'punctuation',
                    'category': '标点符号',
                    'position': {
                        'start': match.start(),
                        'end': match.end()
                    },
                    'original': match.group(),
                    'suggestion': self._get_suggestion(rule['name'], match.group()),
                    'description': rule['description'],
                    'severity': rule['severity']
                })
        
        return issues
    
    def _get_suggestion(self, rule_name, original_text):
        """根据规则名称生成修改建议"""
        if rule_name == '中英文标点混用':
            # 将英文标点转换为中文标点
            mapping = {
                ',': '，',
                '.': '。',
                '!': '！',
                '?': '？',
                ';': '；',
                ':': '：',
                '"': '"',
                "'": "'",
                '(': '（',
                ')': '）',
                '[': '【',
                ']': '】',
                '<': '《',
                '>': '》'
            }
            
            suggestion = original_text
            for eng, chn in mapping.items():
                suggestion = suggestion.replace(eng, chn)
            return suggestion
        
        elif rule_name == '重复标点':
            # 移除重复的标点，只保留一个
            return re.sub(r'([，。！？；：])\1+', r'\1', original_text)
        
        elif rule_name == '空格使用不当':
            # 移除中文字符间的空格
            return re.sub(r'([\u4e00-\u9fff])\s+([\u4e00-\u9fff])', r'\1\2', original_text)
        
        else:
            return original_text

# 创建全局实例
punctuation_checker = PunctuationChecker()

def check_punctuation(text):
    """检查标点符号问题"""
    return punctuation_checker.check_punctuation(text)

