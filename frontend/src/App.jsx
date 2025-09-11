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
import API_CONFIG from './config/api.js'

function App() {
  const [content, setContent] = useState('')
  const [issues, setIssues] = useState([])
  const [isProofreading, setIsProofreading] = useState(false)
  const [fileInfo, setFileInfo] = useState(null)
  const [selectedIssueId, setSelectedIssueId] = useState(null)
  const [checkOptions, setCheckOptions] = useState({
    grammar: true, // 默认开启“语法与错别字”
    punctuation: true,
    sensitive: true,
    llm: true,
  })
  // 新增：进度状态（分块并发时展示）
  const [progress, setProgress] = useState({ total: 0, done: 0 })

  // 处理文件上传（来自 Editor）
  const handleFileUpload = (file, text) => {
    setContent(text)
    setIssues([]) // 清空之前的问题
    setFileInfo({ name: file.name, size: file.size, type: file.type })
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

  // 上传按钮处理（侧栏）
  const handleUpload = () => {
    if (typeof window !== 'undefined' && typeof window.openUploadDialog === 'function') {
      window.openUploadDialog()
    }
  }

  // 审校报告入口：拉取后端 HTML 并在新窗口中展示
  const handleGenerateReport = async () => {
    try {
      if (!content || !content.trim()) {
        alert('请先输入或上传文档内容')
        return
      }
      let payloadIssues = issues
      // 若 issues 为空但全局有缓存，使用之（兼容用户刷新）
      try { if ((!payloadIssues || payloadIssues.length === 0) && Array.isArray(window.__issues)) payloadIssues = window.__issues } catch (_) {}
      const html = await ApiService.getReportHtml(content, { issues: payloadIssues, title: fileInfo?.name || '审校报告', author: '' })
      const w = window.open('about:blank', '_blank')
      if (w) {
        w.document.open()
        w.document.write(html)
        w.document.close()
      } else {
        // 弹窗被拦截，退而求其次下载为 .html
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${(fileInfo?.name || '审校报告').replace(/\.[^.]+$/, '')}.html`
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    } catch (e) {
      console.error('生成报告失败:', e)
      alert('生成审校报告失败，请稍后重试')
    }
  }

  // 辅助：规范化文本用于去重
  const stripQuotes = (s) => String(s ?? '').replace(/^[\'\"“”‘’]+|[\'\"“”‘’]+$/g, '')
  const normalize = (s) => stripQuotes(s).trim()
  const isLLM = (i) => !!(i && (
    i.source === 'qwen' ||
    i.llm === true ||
    (i.source === 'hybrid' && i.subtype === 'sensitive_explain') ||
    /qwen|openai|glm|moonshot|ernie|deepseek|gpt|yi/i.test(String(i?.model || i?.provider || i?.source || ''))
  ))

  // 新增：将文本切分为块（带重叠）
  const splitTextIntoChunks = (text, chunkSize = 2000, overlap = 100) => {
    const chunks = []
    const n = text.length
    if (n === 0) return chunks
    let start = 0
    while (start < n) {
      const end = Math.min(start + chunkSize, n)
      const chunkText = text.slice(start, end)
      chunks.push({ text: chunkText, startOffset: start })
      if (end >= n) break
      start = end - overlap
      if (start < 0) start = 0
    }
    return chunks
  }

  // 新增：限制并发度执行任务的帮助函数
  const runWithConcurrency = async (tasks, limit = 4, onOneDone = () => {}) => {
    const results = new Array(tasks.length)
    let idx = 0
    async function worker() {
      while (true) {
        const current = idx++
        if (current >= tasks.length) return
        try {
          results[current] = await tasks[current]()
        } catch (e) {
          console.error('分块任务失败:', e)
          results[current] = { issues: [], error: e }
        } finally {
          try { onOneDone(current) } catch (_) {}
        }
      }
    }
    const workers = Array(Math.min(limit, tasks.length)).fill(0).map(() => worker())
    await Promise.all(workers)
    return results
  }

  // 发起审校（改为分块并发）
  const handleProofread = async () => {
    if (!content || !content.trim()) {
      alert('请先上传或输入文档内容')
      return
    }

    setIsProofreading(true)
    setProgress({ total: 0, done: 0 })
    
    try {
      // 先做健康检查，给出更友好的错误提示
      try {
        await ApiService.healthCheck()
      } catch (e) {
        console.warn('健康检查失败，后端可能在冷启动或暂时不可用，将继续尝试发起审校请求')
      }

      // 根据侧栏开关传递选项：支持规则引擎与 LLM 协同
      const options = {
        grammar: !!checkOptions.grammar,
        punctuation: !!checkOptions.punctuation,
        sensitive: !!checkOptions.sensitive,
        llm: checkOptions.llm ?? true,
      }
      console.log('[Proofread Request] options:', options)

      // 文本分块
      const chunkSize = 2000
      const overlap = 100
      const chunks = splitTextIntoChunks(content, chunkSize, overlap)
      setProgress({ total: chunks.length, done: 0 })

      // 为每个块创建任务
      const tasks = chunks.map(({ text: chunkText, startOffset }) => async () => {
        const resp = await ApiService.proofreadDocument(chunkText, options)
        if (resp && resp.success) {
          const rawIssues = (resp.data && Array.isArray(resp.data.issues)) ? resp.data.issues : []
          // 调整到全局坐标，并保证 id 存在
          const adjusted = rawIssues.map((it, idx) => {
            const startPos = (it.position?.start ?? 0) + startOffset
            const endPos = (it.position?.end ?? 0) + startOffset
            return {
              id: it.id || `${it.type || 'issue'}-${startPos}-${endPos}-${idx}-${startOffset}`,
              ...it,
              position: { start: startPos, end: endPos }
            }
          })
          return { issues: adjusted }
        }
        // 返回空结果但不中断整体
        return { issues: [] }
      })

      // 并发执行并更新进度
      let doneCount = 0
      const results = await runWithConcurrency(tasks, 4, () => {
        doneCount += 1
        setProgress(prev => ({ total: prev.total, done: Math.min(prev.total, doneCount) }))
      })

      // 合并所有分块结果
      const merged = results.flatMap(r => (r && Array.isArray(r.issues)) ? r.issues : [])

      // 去重策略：同一类型 + 同一位置 + 同一原文/建议 视为重复
      // 选择优先级：1) 有 suggestion 的优先 2) LLM 来源优先 3) 严重程度高者优先 4) 其余保留首个
      const pickBetter = (a, b) => {
        const hasSugA = !!normalize(a.suggestion)
        const hasSugB = !!normalize(b.suggestion)
        if (hasSugA !== hasSugB) return hasSugA ? a : b
        const llmA = isLLM(a)
        const llmB = isLLM(b)
        if (llmA !== llmB) return llmA ? a : b
        const sevRank = (s) => (String(s).toLowerCase() === 'high' ? 3 : String(s).toLowerCase() === 'medium' ? 2 : String(s).toLowerCase() === 'low' ? 1 : 0)
        const ra = sevRank(a.severity)
        const rb = sevRank(b.severity)
        if (ra !== rb) return ra > rb ? a : b
        return a // 默认保留 a
      }

      const map = new Map()
      for (const it of merged) {
        const type = String(it.type || '').toLowerCase()
        const start = it.position?.start ?? -1
        const end = it.position?.end ?? -1
        const key = [type, start, end, normalize(it.original), normalize(it.suggestion)].join('|')
        if (!map.has(key)) {
          map.set(key, it)
        } else {
          const prev = map.get(key)
          map.set(key, pickBetter(prev, it))
        }
      }
      const deduped = Array.from(map.values())

      setIssues(deduped)

      // 暴露到全局以便在控制台快速查看
      try {
        window.__issues = deduped
      } catch (_) {}
    } catch (e) {
      console.error('审校失败:', e)
      alert('审校失败，请稍后重试')
    } finally {
      setIsProofreading(false)
      // 结束时将进度填满，稍后清零
      setProgress(prev => ({ total: prev.total, done: prev.total }))
      // 短暂显示满格，再复位
      setTimeout(() => setProgress({ total: 0, done: 0 }), 800)
    }
  }

  const handleExportPDF = async () => {
    try {
      await ApiService.exportPDF(content, fileInfo ? fileInfo.name : '未命名文档')
    } catch (e) {
      alert('导出PDF失败')
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Header 
        fileTitle={fileInfo ? fileInfo.name : null}
        onExportPDF={handleExportPDF}
        showExportPDF={false}
        onExportWord={async () => { 
          try { 
            await ApiService.exportWord(content, fileInfo ? fileInfo.name : '未命名文档') 
          } catch (e) { 
            alert('导出Word失败') 
          } 
        }}
        onSettings={() => console.log('打开设置')}
      />
      <div className="flex-1 flex min-h-0">
        <ResizablePanelGroup direction="horizontal" className="w-full h-full min-h-0">
          <ResizablePanel defaultSize={23} minSize={18} maxSize={30} className="min-h-0">
            <Toolbar 
              checkOptions={checkOptions} 
              onCheckOptionChange={handleCheckOptionChange}
              onProofread={handleProofread}
              isProofreading={isProofreading}
              onUpload={handleUpload}
              onGenerateReport={handleGenerateReport}
              progress={progress}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={52} minSize={40} className="min-h-0">
            <Editor 
              content={content} 
              onContentChange={setContent}
              issues={issues} 
              onIssueClick={handleIssueClick}
              onFileUpload={handleFileUpload}
              selectedIssueId={selectedIssueId}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={25} minSize={15} maxSize={35} className="min-h-0 overflow-hidden">
            <IssuePanel 
              issues={issues}
              onAcceptSuggestion={handleAcceptSuggestion}
              onIgnoreIssue={handleIgnoreIssue}
              onIssueClick={handleIssueClick}
              selectedIssueId={selectedIssueId}
              content={content}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}

export default App
