"""
DFA (Deterministic Finite Automaton) 敏感词过滤算法
用于高效检测文本中的敏感词汇
"""

class DFAFilter:
    def __init__(self):
        self.keyword_chains = {}
        self.delimit = '\x00'
    
    def add_word(self, keyword):
        """添加敏感词到DFA树中"""
        keyword = str(keyword).strip().lower()
        if not keyword:
            return
        
        chars = keyword
        level = self.keyword_chains
        
        for char in chars:
            if char in level:
                level = level[char]
            else:
                level[char] = {}
                level = level[char]
        
        level[self.delimit] = 0
    
    def parse_words(self, path):
        """从文件中解析敏感词"""
        try:
            with open(path, encoding='utf-8') as f:
                for line in f:
                    word = line.strip()
                    if word:
                        self.add_word(word)
        except FileNotFoundError:
            print(f"敏感词文件 {path} 不存在")
    
    def filter(self, message, repl="*"):
        """过滤敏感词，返回过滤后的文本和检测到的敏感词列表"""
        message = str(message).lower()
        ret = []
        detected_words = []
        start = 0
        
        while start < len(message):
            level = self.keyword_chains
            step_ins = 0
            
            for char in message[start:]:
                if char in level:
                    step_ins += 1
                    if self.delimit not in level[char]:
                        level = level[char]
                    else:
                        # 找到敏感词
                        sensitive_word = message[start:start + step_ins]
                        detected_words.append({
                            'word': sensitive_word,
                            'start': start,
                            'end': start + step_ins
                        })
                        ret.append(repl * step_ins)
                        start += step_ins - 1
                        break
                else:
                    ret.append(message[start])
                    break
            else:
                ret.append(message[start])
            
            start += 1
        
        return ''.join(ret), detected_words
    
    def contains(self, message):
        """检查文本是否包含敏感词"""
        message = str(message).lower()
        
        for start in range(len(message)):
            level = self.keyword_chains
            
            for char in message[start:]:
                if char in level:
                    if self.delimit in level[char]:
                        return True
                    level = level[char]
                else:
                    break
        
        return False
    
    def find_all(self, message):
        """查找文本中所有的敏感词及其位置"""
        message_lower = str(message).lower()
        found_words = []
        
        for start in range(len(message_lower)):
            level = self.keyword_chains
            step_ins = 0
            
            for char in message_lower[start:]:
                if char in level:
                    step_ins += 1
                    if self.delimit not in level[char]:
                        level = level[char]
                    else:
                        # 找到敏感词
                        sensitive_word = message[start:start + step_ins]  # 保持原始大小写
                        found_words.append({
                            'word': sensitive_word,
                            'start': start,
                            'end': start + step_ins,
                            'type': 'sensitive'
                        })
                        break
                else:
                    break
        
        return found_words


# 创建全局实例
sensitive_filter = DFAFilter()
ideology_filter = DFAFilter()

def init_filters():
    """初始化过滤器，加载敏感词库"""
    import os
    
    # 敏感词库路径
    sensitive_words_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'sensitive_words.txt')
    ideology_words_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'ideology_words.txt')
    
    # 创建数据目录
    data_dir = os.path.dirname(sensitive_words_path)
    os.makedirs(data_dir, exist_ok=True)
    
    # 如果文件不存在，创建示例文件
    if not os.path.exists(sensitive_words_path):
        with open(sensitive_words_path, 'w', encoding='utf-8') as f:
            f.write("暴力\n色情\n赌博\n毒品\n")
    
    if not os.path.exists(ideology_words_path):
        with open(ideology_words_path, 'w', encoding='utf-8') as f:
            f.write("反动\n颠覆\n分裂\n")
    
    # 加载敏感词
    sensitive_filter.parse_words(sensitive_words_path)
    ideology_filter.parse_words(ideology_words_path)

def check_sensitive_content(text):
    """检查敏感内容"""
    issues = []
    
    # 检查敏感词
    sensitive_words = sensitive_filter.find_all(text)
    for word_info in sensitive_words:
        issues.append({
            'type': 'sensitive',
            'category': '敏感内容',
            'position': {
                'start': word_info['start'],
                'end': word_info['end']
            },
            'original': word_info['word'],
            'suggestion': '*' * len(word_info['word']),
            'description': f'检测到敏感词汇: {word_info["word"]}',
            'severity': 'high'
        })
    
    # 检查意识形态问题
    ideology_words = ideology_filter.find_all(text)
    for word_info in ideology_words:
        issues.append({
            'type': 'sensitive',
            'category': '意识形态问题',
            'position': {
                'start': word_info['start'],
                'end': word_info['end']
            },
            'original': word_info['word'],
            'suggestion': '[已删除]',
            'description': f'检测到意识形态问题词汇: {word_info["word"]}',
            'severity': 'high'
        })
    
    return issues

