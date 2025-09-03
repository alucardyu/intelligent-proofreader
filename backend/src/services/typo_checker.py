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
    # 新增：用户示例中常见错拼，增强在无 pycorrector 环境下的召回
    '散步相关': [('散不', '散步')],
    '盛开相关': [('盛升', '盛开')],
    '蝴蝶相关': [('胡蝶', '蝴蝶')],
    '悠闲相关': [('忧闲', '悠闲')],
    '夕阳相关': [('夕羊', '夕阳')],
}

# 预编译语法与常见错误模式
GRAMMAR_PATTERNS = [
    (re.compile(r"[一二两三四五六七八九十][个|名|位]{2,}"), '量词重复，建议保留一个'),
    (re.compile(r"(被){2,}"), '可能存在被动语态叠用'),
]

# 新增：的/地/得 简易启发式校验（尽量降低误报）
_DE_DI_DE_HEURISTIC = re.compile(r"(的|地|得)")
_ADJ_VERB_AFTER = re.compile(r"^[一-龥a-zA-Z]{0,2}(?:地|得)?[一-龥a-zA-Z]{1,3}")

# 过滤误报词汇：加入常见误报的白名单
FALSE_POSITIVE_WHITELIST = {
    '周末', '咖啡', '可乐', '电脑', '手机', '网络', '软件', '程序', '数据', '系统',
    '文档', '项目', '会议', '邮件', '沟通', '合作', '效率', '质量', '服务', '产品',
    '技术', '开发', '设计', '测试', '维护', '支持', '管理', '培训', '学习', '成长'
}

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

    def _is_valid_typo(self, original: str, corrected: str) -> bool:
        """验证错别字是否为有效的纠错，过滤误报"""
        # 过滤掉单字符变化（容易误报）
        if len(original) <= 1 or len(corrected) <= 1:
            return False
        
        # 过滤掉仅标点符号的变化
        if original.strip('。，！？；：""''（）【】') == corrected.strip('。，！？；：""''（）【】'):
            return False
        
        # 过滤掉白名单中的词汇
        if original in FALSE_POSITIVE_WHITELIST or corrected in FALSE_POSITIVE_WHITELIST:
            return False
        
        # 过滤掉纯数字/字母的变化
        if original.isdigit() or corrected.isdigit():
            return False
        if original.isalpha() or corrected.isalpha():
            return False
        
        # 过滤掉长度差异过大的变化（可能是误识别）
        if abs(len(original) - len(corrected)) > min(len(original), len(corrected)) * 0.5:
            return False
        
        # 过滤掉相似度过低的变化（编辑距离判断）
        if self._edit_distance(original, corrected) > min(len(original), len(corrected)) * 0.6:
            return False
        
        return True

    def _edit_distance(self, s1: str, s2: str) -> int:
        """计算编辑距离"""
        m, n = len(s1), len(s2)
        dp = [[0] * (n + 1) for _ in range(m + 1)]
        
        for i in range(m + 1):
            dp[i][0] = i
        for j in range(n + 1):
            dp[0][j] = j
            
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if s1[i-1] == s2[j-1]:
                    dp[i][j] = dp[i-1][j-1]
                else:
                    dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
        
        return dp[m][n]

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
                    # 增加验证步骤，过滤误报
                    if not self._is_valid_typo(wrong, right):
                        continue
                    
                    issues.append({
                        'type': 'typo',
                        'message': f'疑似错别字："{wrong}" → "{right}"',
                        'original': wrong,  # 添加 original 字段兼容前端
                        'suggestion': right,  # 添加 suggestion 字段兼容前端
                        'position': {
                            'start': offset + begin,
                            'end': offset + end
                        },
                        'suggestions': [right],
                        'severity': 'warning'
                    })
                offset += len(s)
            print(f"[TypoChecker] pycorrector typos took {time.time() - t0:.2f}s, sentences={len(merged)}, valid_issues={len(issues)}")
            return issues
        
        # Fallback: Aho-Corasick + 简单规则
        if self.automaton:
            for end_idx, (wrong, right) in self.automaton.iter(text):
                start_idx = end_idx - len(wrong) + 1
                issues.append({
                    'type': 'typo',
                    'message': f'疑似错别字："{wrong}" → "{right}"',
                    'original': wrong,
                    'suggestion': right,
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
                            'original': wrong,
                            'suggestion': right,
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
                    'original': text[m.start():m.end()],  # 添加 original 字段
                    'suggestion': '',  # 语法问题通常不提供具体建议
                    'position': {
                        'start': m.start(),
                        'end': m.end()
                    },
                    'suggestions': [],
                    'severity': 'info'
                })
        
        # 轻量“的/地/得”启发式：仅在较明显的情况下提示
        for m in _DE_DI_DE_HEURISTIC.finditer(text):
            char = m.group(1)
            start = m.start()
            end = m.end()
            # 启发式：
            # - 若后面紧跟明显的副词性短语/动词短语迹象，且使用为“地/得/的”的不合常例，则提示；否则忽略。
            window = text[end:end+4]
            confident = False
            message = None
            if char == '的':
                # 若后面更像是动词性短语，可能应为“地”
                if _ADJ_VERB_AFTER.match(window):
                    message = '可能应为“地”，请根据上下文判断'
                    confident = False
            elif char == '地':
                # 若后面紧跟名词性的短词，更可能用“的”
                message = '“地”的使用可能不当，请检查是否应为“的”'
                confident = False
            elif char == '得':
                # “得”多接补语，若后面不是补语特征，给出弱提示
                message = '“得”的使用可能不当，请检查是否应为“的/地”'
                confident = False
            
            if message:
                issues.append({
                    'type': 'grammar',
                    'message': message,
                    'original': char,
                    'suggestion': '',
                    'position': {
                        'start': start,
                        'end': end
                    },
                    'suggestions': [],
                    'severity': 'low' if not confident else 'info'
                })
        return issues


# 模块级单例，避免重复初始化
_typo_checker_singleton = TypoChecker()

def check_typos_and_grammar(text: str):
    issues = []
    issues.extend(_typo_checker_singleton.check_typos(text))
    issues.extend(_typo_checker_singleton.check_grammar(text))
    return issues

