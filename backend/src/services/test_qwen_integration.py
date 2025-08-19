"""
测试 qwen_integration 模块
"""

import pytest
from .qwen_integration import QwenProofreader

def test_qwen_proofreader():
    proofreader = QwenProofreader()
    content = "这是一个例子。"
    result = proofreader.proofread(content)

    assert 'issues' in result
    assert 'statistics' in result
    assert result['statistics']['total_issues'] == 1
    assert result['issues'][0]['type'] == 'typo'
    assert result['issues'][0]['message'] == '疑似错别字："例子" → "例子2"'