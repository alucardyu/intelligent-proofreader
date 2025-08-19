import { useState, useEffect } from 'react'
import Header from './components/Header'
import Toolbar from './components/Toolbar'
import Editor from './components/Editor'
import IssuePanel from './components/IssuePanel'
import ApiService from './services/api'
import { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle 
} from "@/components/ui/resizable.jsx"
import './App.css'

function App() {
  const [content, setContent] = useState('')
  const [issues, setIssues] = useState([])
  const [checkOptions, setCheckOptions] = useState({
    grammar: true,
    punctuation: true,
    sensitive: false
  })
  const [selectedIssueId, setSelectedIssueId] = useState(null)
  const [isProofreading, setIsProofreading] = useState(false)
  
  // 处理文档审校
  const handleProofread = async () => {
    if (isProofreading) return
    if (!content.trim()) {
      alert('请先输入或上传文档内容')
      return
    }
    
    setIsProofreading(true)
    
    try {
      // 先做健康检查，给出更友好的错误提示
      try {
        await ApiService.healthCheck()
      } catch (e) {
        console.warn('健康检查失败，可能是服务不可用，但仍尝试继续请求')
      }

      const response = await ApiService.proofreadDocument(content, checkOptions)
      
      if (response.success) {
        const rawIssues = response.data.issues || []
        // 规范化：确保每条 issue 都有 id
        const normalized = rawIssues.map((it, idx) => ({
          id: it.id || `${it.type || 'issue'}-${it.position?.start ?? idx}-${it.position?.end ?? idx}-${idx}`,
          ...it,
        }))
        setIssues(normalized)
      } else {
        alert('审校失败: ' + (response.error?.message || '未知错误'))
      }
    } catch (error) {
      console.error('审校错误:', error)
      alert('审校过程中发生错误，请稍后重试')
    } finally {
      setIsProofreading(false)
    }
  }
  
  // 处理文件上传（来自 Editor）
  const handleFileUpload = (file, text) => {
    setContent(text)
    setIssues([]) // 清空之前的问题
  }
  
  // 处理检查选项变更
  const handleCheckOptionChange = (option, checked) => {
    setCheckOptions(prev => ({
      ...prev,
      [option]: checked
    }))
  }
  
  // 处理采纳建议
  const handleAcceptSuggestion = (issue) => {
    if (!issue.suggestion) return
    
    const newContent = content.slice(0, issue.position.start) + 
                      issue.suggestion + 
                      content.slice(issue.position.end)
    
    setContent(newContent)
    
    // 移除已处理的问题
    setIssues(prev => prev.filter(i => i.id !== issue.id))
  }
  
  // 处理忽略问题
  const handleIgnoreIssue = (issue) => {
    setIssues(prev => prev.filter(i => i.id !== issue.id))
  }
  
  // 处理问题点击
  const handleIssueClick = (issue) => {
    // 可以在这里实现滚动到对应位置的逻辑
    console.log('点击问题:', issue)
    setSelectedIssueId(issue?.id || null)
  }
  
  // 如果当前选中的问题不在列表里了（被忽略/被修复），清空选中
  useEffect(() => {
    if (selectedIssueId && !issues.some(i => i.id === selectedIssueId)) {
      setSelectedIssueId(null)
    }
  }, [issues, selectedIssueId])
  
  // 处理导出
  const handleExportPDF = async () => {
    try {
      await ApiService.exportPDF(content, '中国现代文学简史')
    } catch (error) {
      alert('导出PDF失败')
    }
  }
  
  const handleExportWord = async () => {
    try {
      await ApiService.exportWord(content, '中国现代文学简史', '作者')
    } catch (error) {
      alert('导出Word失败')
    }
  }
  
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Header 
        onSave={() => console.log('保存')}
        onExportPDF={handleExportPDF}
        onExportWord={handleExportWord}
        onSettings={() => console.log('设置')}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={20} minSize={15} maxSize={25}>
            <Toolbar 
              onUpload={() => {
                // 直接使用暴露的全局方法打开文件对话框
                if (typeof window !== 'undefined' && typeof window.openUploadDialog === 'function') {
                  window.openUploadDialog()
                }
              }}
              onProofread={handleProofread}
              onManualEdit={() => console.log('手动编辑')}
              onGenerateReport={() => console.log('生成报告')}
              checkOptions={checkOptions}
              onCheckOptionChange={handleCheckOptionChange}
              isProofreading={isProofreading}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={55} minSize={30}>
            <Editor 
              content={content}
              onContentChange={setContent}
              issues={issues}
              onIssueClick={handleIssueClick}
              onFileUpload={handleFileUpload}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={25} minSize={15} maxSize={35}>
            <IssuePanel 
              issues={issues}
              onAcceptSuggestion={handleAcceptSuggestion}
              onIgnoreIssue={handleIgnoreIssue}
              onIssueClick={handleIssueClick}
              selectedIssueId={selectedIssueId}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}

export default App
