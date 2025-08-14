"""
文档处理服务
处理文档导出功能
"""

import os
import tempfile
from docx import Document
from docx.shared import Inches
import html2text
import re

class DocumentService:
    def __init__(self):
        self.html_converter = html2text.HTML2Text()
        self.html_converter.ignore_links = True
        self.html_converter.ignore_images = True
    
    def html_to_docx(self, html_content, title="文档", author=""):
        """
        将HTML内容转换为Word文档
        
        Args:
            html_content (str): HTML内容
            title (str): 文档标题
            author (str): 作者
        
        Returns:
            bytes: Word文档的二进制内容
        """
        # 创建新文档
        doc = Document()
        
        # 添加标题
        if title:
            doc.add_heading(title, 0)
        
        # 将HTML转换为纯文本
        text_content = self.html_converter.handle(html_content)
        
        # 处理文本内容，按段落分割
        paragraphs = text_content.split('\n\n')
        
        for para_text in paragraphs:
            para_text = para_text.strip()
            if para_text:
                # 检查是否是标题（以#开头）
                if para_text.startswith('#'):
                    # 计算标题级别
                    level = 0
                    for char in para_text:
                        if char == '#':
                            level += 1
                        else:
                            break
                    
                    # 移除#符号
                    title_text = para_text[level:].strip()
                    if title_text:
                        doc.add_heading(title_text, min(level, 9))
                else:
                    # 普通段落
                    # 处理粗体和斜体标记
                    para_text = self._process_formatting(para_text)
                    if para_text:
                        doc.add_paragraph(para_text)
        
        # 保存到临时文件
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.docx')
        doc.save(temp_file.name)
        
        # 读取文件内容
        with open(temp_file.name, 'rb') as f:
            content = f.read()
        
        # 删除临时文件
        os.unlink(temp_file.name)
        
        return content
    
    def _process_formatting(self, text):
        """处理文本格式标记"""
        # 移除markdown格式标记，保留纯文本
        text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)  # 粗体
        text = re.sub(r'\*(.*?)\*', r'\1', text)      # 斜体
        text = re.sub(r'`(.*?)`', r'\1', text)        # 代码
        text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)  # 链接
        
        return text.strip()
    
    def create_simple_docx(self, content, title="文档"):
        """
        创建简单的Word文档
        
        Args:
            content (str): 文档内容（纯文本）
            title (str): 文档标题
        
        Returns:
            bytes: Word文档的二进制内容
        """
        doc = Document()
        
        # 添加标题
        if title:
            doc.add_heading(title, 0)
        
        # 按段落分割内容
        paragraphs = content.split('\n')
        
        for para_text in paragraphs:
            para_text = para_text.strip()
            if para_text:
                doc.add_paragraph(para_text)
        
        # 保存到临时文件
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.docx')
        doc.save(temp_file.name)
        
        # 读取文件内容
        with open(temp_file.name, 'rb') as f:
            content = f.read()
        
        # 删除临时文件
        os.unlink(temp_file.name)
        
        return content

# 创建全局实例
document_service = DocumentService()

