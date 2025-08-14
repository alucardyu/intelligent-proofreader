"""
审校引擎核心服务
整合各种检查服务，提供统一的审校接口
"""

import uuid
from .typo_checker import check_typos_and_grammar
from .punctuation_checker import check_punctuation
from .dfa_filter import check_sensitive_content, init_filters

class ProofreadingEngine:
    def __init__(self):
        # 初始化敏感词过滤器
        init_filters()
    
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
        if options is None:
            options = {
                'check_typos': True,
                'check_grammar': True,
                'check_punctuation': True,
                'check_sensitive': True
            }
        
        all_issues = []
        
        # 1. 错别字和语法检查
        if options.get('check_typos', True) or options.get('check_grammar', True):
            typo_issues = check_typos_and_grammar(content)
            all_issues.extend(typo_issues)
        
        # 2. 标点符号检查
        if options.get('check_punctuation', True):
            punctuation_issues = check_punctuation(content)
            all_issues.extend(punctuation_issues)
        
        # 3. 敏感内容检查
        if options.get('check_sensitive', True):
            sensitive_issues = check_sensitive_content(content)
            all_issues.extend(sensitive_issues)
        
        # 为每个问题分配唯一ID
        for issue in all_issues:
            issue['id'] = str(uuid.uuid4())
        
        # 按位置排序
        all_issues.sort(key=lambda x: x['position']['start'])
        
        # 统计信息
        statistics = self._calculate_statistics(all_issues)
        
        return {
            'issues': all_issues,
            'statistics': statistics
        }
    
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

