"""
错别字与语法检查模块
优先使用 pycorrector，如不可用则回退至 Aho-Corasick + 规则
"""

import re
import time

try:
    import pycorrector  # type: ignore
    PYCORRECTOR_AVAILABLE = True
except Exception as e:
    pycorrector = None
    PYCORRECTOR_AVAILABLE = False

try:
    import ahocorasick  # type: ignore
    AHO_AVAILABLE = True
except Exception:
    ahocorasick = None
    AHO_AVAILABLE = False

# 常见错别字混淆集（可扩展）
COMMON_MIXUPS = {
    '的地得': [('的', '地'), ('的', '得'), ('地', '的'), ('得', '的')],
    '与与和': [('与', '和')],
    '再在': [('再', '在'), ('在', '再')],
    '因该应该': [('因该', '应该')],
    '有意于有益于': [('有意于', '有益于')],
    '作做': [('作', '做')],
    '侯候': [('侯', '候')],
    '象像': [('象', '像')],
}

# 预编译语法与常见错误模式
GRAMMAR_PATTERNS = [
    (re.compile(r"[一二两三四五六七八九十][个|名|位]{2,}"), '量词重复，建议保留一个'),
    (re.compile(r"(被){2,}"), '可能存在被动语态叠用'),
]

class TypoChecker:
    def __init__(self):
        self._init_automaton()
        if PYCORRECTOR_AVAILABLE:
            print('[TypoChecker] pycorrector is available and will be used for typo detection')
        else:
            print('[TypoChecker] pycorrector is NOT available; fallback to automaton + rules')

    def _init_automaton(self):
        self.automaton = None
        if AHO_AVAILABLE:
            automaton = ahocorasick.Automaton()
            # 将所有混淆词加入自动机
            for pairs in COMMON_MIXUPS.values():
                for wrong, right in pairs:
                    automaton.add_word(wrong, (wrong, right))
            automaton.make_automaton()
            self.automaton = automaton

    def check_typos(self, text: str):
        issues = []
        if PYCORRECTOR_AVAILABLE:
            t0 = time.time()
            # 句子级处理可显著提升长文本性能
            sentences = re.split(r'([。！？\n])', text)
            merged = []
            # 将标点重新合并回句子
            for i in range(0, len(sentences), 2):
                s = sentences[i]
                p = sentences[i+1] if i+1 < len(sentences) else ''
                merged.append(s + p)
            offset = 0
            for s in merged:
                corrected, details = pycorrector.correct(s)
                for wrong, right, begin, end in details:
                    issues.append({
                        'type': 'typo',
                        'message': f'疑似错别字："{wrong}" → "{right}"',
                        'position': {
                            'start': offset + begin,
                            'end': offset + end
                        },
                        'suggestions': [right],
                        'severity': 'warning'
                    })
                offset += len(s)
            print(f"[TypoChecker] pycorrector typos took {time.time() - t0:.2f}s, sentences={len(merged)}")
            return issues
        
        # Fallback: Aho-Corasick + 简单规则
        if self.automaton:
            for end_idx, (wrong, right) in self.automaton.iter(text):
                start_idx = end_idx - len(wrong) + 1
                issues.append({
                    'type': 'typo',
                    'message': f'疑似错别字："{wrong}" → "{right}"',
                    'position': {
                        'start': start_idx,
                        'end': end_idx + 1
                    },
                    'suggestions': [right],
                    'severity': 'warning'
                })
        else:
            # 如果自动机不可用，回退到简单查找
            for pairs in COMMON_MIXUPS.values():
                for wrong, right in pairs:
                    start = 0
                    while True:
                        idx = text.find(wrong, start)
                        if idx == -1:
                            break
                        issues.append({
                            'type': 'typo',
                            'message': f'疑似错别字："{wrong}" → "{right}"',
                            'position': {
                                'start': idx,
                                'end': idx + len(wrong)
                            },
                            'suggestions': [right],
                            'severity': 'warning'
                        })
                        start = idx + len(wrong)
        return issues

    def check_grammar(self, text: str):
        issues = []
        for pattern, msg in GRAMMAR_PATTERNS:
            for m in pattern.finditer(text):
                issues.append({
                    'type': 'grammar',
                    'message': msg,
                    'position': {
                        'start': m.start(),
                        'end': m.end()
                    },
                    'suggestions': [],
                    'severity': 'info'
                })
        return issues


# 模块级单例，避免重复初始化
_typo_checker_singleton = TypoChecker()

def check_typos_and_grammar(text: str):
    issues = []
    issues.extend(_typo_checker_singleton.check_typos(text))
    issues.extend(_typo_checker_singleton.check_grammar(text))
    return issues

