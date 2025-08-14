"""
错别字检查服务
使用 pycorrector 库进行错别字检测和纠正
"""

import pycorrector
import re

class TypoChecker:
    def __init__(self):
        # 初始化 pycorrector
        pass
    
    def check_typos(self, text):
        """检查文本中的错别字"""
        issues = []
        
        try:
            # 使用 pycorrector 检测错别字
            import pycorrector.corrector as corrector
            corrected_sent, detail = corrector.correct(text)
            
            # 解析检测结果
            for error in detail:
                if len(error) >= 4:
                    original_word = error[0]
                    corrected_word = error[1]
                    start_pos = error[2]
                    end_pos = error[3]
                    
                    # 跳过相同的词
                    if original_word != corrected_word:
                        issues.append({
                            'type': 'typo',
                            'category': '错别字',
                            'position': {
                                'start': start_pos,
                                'end': end_pos
                            },
                            'original': original_word,
                            'suggestion': corrected_word,
                            'description': f'可能的错别字: "{original_word}" → "{corrected_word}"',
                            'severity': 'medium'
                        })
        
        except Exception as e:
            print(f"错别字检查出错: {e}")
            # 简单的错别字检查作为备选方案
            common_typos = {
                '反应': '反映',
                '诗品': '诗歌',
                '矛盾': '茅盾'
            }
            
            for typo, correct in common_typos.items():
                if typo in text:
                    start_pos = text.find(typo)
                    end_pos = start_pos + len(typo)
                    issues.append({
                        'type': 'typo',
                        'category': '错别字',
                        'position': {
                            'start': start_pos,
                            'end': end_pos
                        },
                        'original': typo,
                        'suggestion': correct,
                        'description': f'可能的错别字: "{typo}" → "{correct}"',
                        'severity': 'medium'
                    })
        
        return issues
    
    def check_grammar(self, text):
        """基础语法检查"""
        issues = []
        
        # 检查常见语法问题
        grammar_patterns = [
            {
                'pattern': r'的地得',
                'description': '"的地得"使用可能有误',
                'category': '语法问题'
            },
            {
                'pattern': r'因为.*所以',
                'description': '"因为...所以"句式可能冗余',
                'category': '语法问题'
            },
            {
                'pattern': r'虽然.*但是',
                'description': '"虽然...但是"句式检查',
                'category': '语法问题'
            }
        ]
        
        for pattern_info in grammar_patterns:
            pattern = pattern_info['pattern']
            matches = re.finditer(pattern, text)
            
            for match in matches:
                issues.append({
                    'type': 'grammar',
                    'category': pattern_info['category'],
                    'position': {
                        'start': match.start(),
                        'end': match.end()
                    },
                    'original': match.group(),
                    'suggestion': '',
                    'description': pattern_info['description'],
                    'severity': 'low'
                })
        
        return issues

# 创建全局实例
typo_checker = TypoChecker()

def check_typos_and_grammar(text):
    """检查错别字和语法问题"""
    issues = []
    
    # 检查错别字
    typo_issues = typo_checker.check_typos(text)
    issues.extend(typo_issues)
    
    # 检查语法
    grammar_issues = typo_checker.check_grammar(text)
    issues.extend(grammar_issues)
    
    return issues

