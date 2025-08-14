import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Upload } from 'lucide-react'

export default function Editor({ 
  content, 
  onContentChange, 
  issues = [], 
  onIssueClick,
  onFileUpload 
}) {
  const editorRef = useRef(null)
  const fileInputRef = useRef(null)
  
  // 处理文件上传
  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target.result
        onContentChange(text)
        if (onFileUpload) {
          onFileUpload(file, text)
        }
      }
      reader.readAsText(file)
    }
  }
  
  // 高亮问题文本
  const highlightIssues = (text) => {
    if (!issues.length) return text
    
    let highlightedText = text
    const sortedIssues = [...issues].sort((a, b) => b.position.start - a.position.start)
    
    sortedIssues.forEach((issue, index) => {
      const { start, end } = issue.position
      const originalText = text.slice(start, end)
      const issueId = issue.id || index
      
      let className = 'bg-yellow-200 border-b-2 cursor-pointer hover:bg-yellow-300'
      if (issue.type === 'typo') className = 'bg-red-200 border-b-2 border-red-400 cursor-pointer hover:bg-red-300'
      if (issue.type === 'grammar') className = 'bg-blue-200 border-b-2 border-blue-400 cursor-pointer hover:bg-blue-300'
      if (issue.type === 'punctuation') className = 'bg-purple-200 border-b-2 border-purple-400 cursor-pointer hover:bg-purple-300'
      if (issue.type === 'sensitive') className = 'bg-red-300 border-b-2 border-red-500 cursor-pointer hover:bg-red-400'
      
      const highlightedSpan = `<span class="${className}" data-issue-id="${issueId}" onclick="window.handleIssueClick('${issueId}')">${originalText}</span>`
      
      highlightedText = highlightedText.slice(0, start) + highlightedSpan + highlightedText.slice(end)
    })
    
    return highlightedText
  }
  
  // 设置全局点击处理函数
  useEffect(() => {
    window.handleIssueClick = (issueId) => {
      const issue = issues.find(i => i.id === issueId || issues.indexOf(i).toString() === issueId)
      if (issue && onIssueClick) {
        onIssueClick(issue)
      }
    }
    
    return () => {
      delete window.handleIssueClick
    }
  }, [issues, onIssueClick])
  
  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* 编辑器头部 */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">第三章 现代文学的发展与变革</h2>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1"
          >
            <Upload className="h-4 w-4" />
            <span>上传文档</span>
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.docx"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>
      
      {/* 编辑器内容区 */}
      <div className="flex-1 p-6 overflow-auto">
        {content ? (
          <div 
            ref={editorRef}
            className="prose max-w-none min-h-full"
            contentEditable
            suppressContentEditableWarning={true}
            onInput={(e) => onContentChange(e.target.textContent)}
            dangerouslySetInnerHTML={{ __html: highlightIssues(content) }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Upload className="h-16 w-16 mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">上传文档开始审校</h3>
            <p className="text-sm text-center mb-4">
              支持 .txt 和 .docx 格式文件<br />
              或直接在此处输入文本内容
            </p>
            <Button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              选择文件
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

