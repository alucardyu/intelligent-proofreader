import { useState, useEffect } from 'react'
import Header from './components/Header'
import Toolbar from './components/Toolbar'
import Editor from './components/Editor'
import IssuePanel from './components/IssuePanel'
import ApiService from './services/api'
import './App.css'

function App() {
  const [content, setContent] = useState('')
  const [issues, setIssues] = useState([])
  const [isProofreading, setIsProofreading] = useState(false)
  const [checkOptions, setCheckOptions] = useState({
    grammar: true,
    terminology: true,
    punctuation: true,
    sensitive: true
  })
  
  // 示例内容
  useEffect(() => {
    const sampleContent = `第三章 现代文学的发展与变革

20世纪初期，中国社会经历了剧烈的变革，这种变革也深刻影响了文学的发展。新文化运动的兴起，打破了传统文学的桎梏，为现代文学的产生创造了条件。陈独秀、李大钊等先驱者倡导文学革命，主张用白话文取代文言文，使文学更贴近大众。

在这个时期，出现了一批具有开创性的作家。鲁迅的《狂人日记》是中国现代文学史上第一篇白话小说，反应了封建礼教吃人的本质，具有划时代的意义。矛盾、巴金、老舍等作家也创作了大量优秀作品，深刻描绘了社会现实和人民的苦难。

3.1 文学研究会与创造社

1921年，文学研究会在上海成立，主张"为人生而艺术"，强调文学应反映社会现实，关注人民生活。叶圣陶、冰心等都是文学研究会的重要成员。他们的作品风格朴实，语言通俗易懂，深受读者喜爱。

同年，创造社在日本东京成立，由郭沫若、郁达夫等留学日本的青年组成。创造社主张"为艺术而艺术"，更注重文学的抒情性和艺术感染力。郭沫若的诗品气势磅礴，充满激情，对后世产生了深远影响。`
    
    setContent(sampleContent)
  }, [])
  
  // 处理文档审校
  const handleProofread = async () => {
    if (!content.trim()) {
      alert('请先输入或上传文档内容')
      return
    }
    
    setIsProofreading(true)
    
    try {
      const response = await ApiService.proofreadDocument(content, checkOptions)
      
      if (response.success) {
        setIssues(response.data.issues || [])
      } else {
        alert('审校失败: ' + response.error?.message)
      }
    } catch (error) {
      console.error('审校错误:', error)
      alert('审校过程中发生错误，请稍后重试')
    } finally {
      setIsProofreading(false)
    }
  }
  
  // 处理文件上传
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
  }
  
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
        <Toolbar 
          onUpload={() => console.log('上传')}
          onProofread={handleProofread}
          onManualEdit={() => console.log('手动编辑')}
          onGenerateReport={() => console.log('生成报告')}
          checkOptions={checkOptions}
          onCheckOptionChange={handleCheckOptionChange}
          isProofreading={isProofreading}
        />
        
        <Editor 
          content={content}
          onContentChange={setContent}
          issues={issues}
          onIssueClick={handleIssueClick}
          onFileUpload={handleFileUpload}
        />
        
        <IssuePanel 
          issues={issues}
          onAcceptSuggestion={handleAcceptSuggestion}
          onIgnoreIssue={handleIgnoreIssue}
          onIssueClick={handleIssueClick}
        />
      </div>
    </div>
  )
}

export default App
