import { useState, useRef, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Upload } from 'lucide-react'
import mammoth from 'mammoth/mammoth.browser'

export default function Editor({ 
  content, 
  onContentChange, 
  issues = [], 
  onIssueClick,
  onFileUpload 
}) {
  const editorRef = useRef(null)
  const fileInputRef = useRef(null)
  const contentRef = useRef(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [fileInfo, setFileInfo] = useState(null) // {name,size,type}
  const [uploadError, setUploadError] = useState('')
  const [activeIssueId, setActiveIssueId] = useState(null)
  
  // 解析 .txt 文件
  const parseTxt = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        resolve(e.target.result || '')
      }
      reader.onerror = () => reject(new Error('读取文本文件失败'))
      reader.readAsText(file)
    })
  }
  
  // 解析 .docx 文件
  const parseDocx = async (file) => {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value || ''
  }
  
  // 通用处理器
  // 首先在 processFile 的处理过程中标准化文本，加入调试信息
  const processFile = async (file) => {
    const MAX_TXT_SIZE = 5 * 1024 * 1024 // 5MB
    const MAX_DOCX_SIZE = 15 * 1024 * 1024 // 15MB
  
    setUploadError('')
    setIsParsing(true)
    try {
      const lowerName = (file.name || '').toLowerCase()
      const isDocx = lowerName.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      const isTxt = lowerName.endsWith('.txt') || file.type === 'text/plain'
  
      if (!isDocx && !isTxt) {
        throw new Error('仅支持 .txt 或 .docx 文件')
      }
  
      if (isTxt && file.size > MAX_TXT_SIZE) {
        throw new Error('TXT 文件过大，请控制在 5MB 以内')
      }
      if (isDocx && file.size > MAX_DOCX_SIZE) {
        throw new Error('DOCX 文件过大，请控制在 15MB 以内')
      }
  
      let text = ''
      if (isDocx) {
        text = await parseDocx(file)
      } else {
        text = await parseTxt(file)
      }
  
      // 标准化处理：去除 BOM，规范换行，清理多余空白
      text = text.replace(/^\uFEFF/, '') // 去除 BOM
      text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n') // 统一换行符
      text = text.replace(/\t/g, ' ') // tab 转空格
      text = text.trim() // 去除首尾空白
  
      console.log('[Upload Debug] 处理后的文本：', {
        length: text.length,
        firstChars: text.slice(0, 100),
        hasLineBreaks: text.includes('\n'),
        type: isDocx ? 'DOCX' : 'TXT'
      })
  
      onContentChange(text)
      setFileInfo({ name: file.name, size: file.size, type: isDocx ? 'DOCX' : 'TXT' })
      if (onFileUpload) onFileUpload(file, text)
    } catch (err) {
      console.error('上传解析失败:', err)
      setUploadError(err.message || '文件解析失败，请重试')
    } finally {
      setIsParsing(false)
    }
  }
  
  // 处理文件上传
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (file) {
      await processFile(file)
      // 重置 input 值以便可以选择同一个文件再次触发
      event.target.value = ''
    }
  }
  
  // 拖拽上传
  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop = async (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      await processFile(file)
    }
  }
  
  // 高亮问题文本（作为 React 节点渲染）
  // 在高亮渲染前添加调试信息，输出每个问题的位置和文本内容
  const renderHighlightedContent = useMemo(() => {
    if (!issues.length) return [content]
  
    console.log('[Highlight Debug] 高亮渲染调试信息：', {
      contentLength: content.length,
      issueCount: issues.length,
      issues: issues.map(issue => ({
        id: issue.id,
        type: issue.type,
        start: issue.position?.start,
        end: issue.position?.end,
        actualText: content.slice(issue.position?.start || 0, issue.position?.end || 0),
        expected: issue.original,
        suggestion: issue.suggestion
      }))
    })
  
    const nodes = []
    // 升序排序，按开始位置拼接
    const sorted = [...issues].sort((a, b) => a.position.start - b.position.start)
    let cursor = 0
  
    const getStyle = (type) => {
      // 使用接近 Tailwind 的颜色
      if (type === 'typo') return { backgroundColor: '#fecaca', borderBottom: '2px solid #f87171', cursor: 'pointer' }
      if (type === 'grammar') return { backgroundColor: '#bfdbfe', borderBottom: '2px solid #60a5fa', cursor: 'pointer' }
      if (type === 'punctuation') return { backgroundColor: '#e9d5ff', borderBottom: '2px solid #a78bfa', cursor: 'pointer' }
      if (type === 'sensitive') return { backgroundColor: '#fca5a5', borderBottom: '2px solid #ef4444', cursor: 'pointer' }
      return { backgroundColor: '#fde68a', borderBottom: '2px solid #f59e0b', cursor: 'pointer' }
    }
  
    sorted.forEach((issue, idx) => {
      const start = issue.position.start
      const end = issue.position.end
      if (start == null || end == null || end <= start) return
  
      // 跳过与前一个高亮区域重叠的部分，保证切片稳定
      if (start < cursor) {
        console.warn(`[Highlight Warning] 问题 ${issue.id} 与前一个区域重叠，跳过`, { start, cursor })
        return
      }
  
      const id = issue.id || `${issue.type || 'issue'}-${start}-${end}-${idx}`
  
      // 追加未高亮的前置文本
      if (cursor < start) {
        nodes.push(content.slice(cursor, start))
      }
  
      // 追加高亮文本
      const text = content.slice(start, end)
      const style = getStyle(issue.type)
      
      // 验证高亮内容与预期是否匹配
      if (text !== issue.original) {
        console.warn(`[Highlight Mismatch] 位置 ${start}-${end}:`, {
          expected: issue.original,
          actual: text,
          issue: issue
        })
      }
      
      nodes.push(
        <span
          key={id}
          data-issue-id={id}
          style={style}
          onClick={(e) => {
            e.stopPropagation()
            const target = issues.find(i => i.id === id || (i.position.start === start && i.position.end === end))
            if (target && onIssueClick) onIssueClick(target)
          }}
          title={`${issue.type}: ${issue.description} (${start}-${end})`}
        >
          {text}
        </span>
      )
  
      cursor = end
    })
  
    // 追加剩余文本
    if (cursor < content.length) {
      nodes.push(content.slice(cursor))
    }
  
    return nodes
  }, [content, issues, onIssueClick])
  
  // 处理文本编辑
  const handleInput = (e) => {
    const newContent = e.target.textContent || e.target.innerText || ''
    onContentChange(newContent)
  }

  // 处理点击进入编辑模式
  const handleClick = () => {
    if (!isEditing) {
      setIsEditing(true)
    }
  }

  // 处理失去焦点退出编辑模式
  const handleBlur = () => {
    setIsEditing(false)
  }

  // 设置全局点击处理函数（兼容现有逻辑）
  useEffect(() => {
    window.handleIssueClick = (issueId) => {
      const issue = issues.find(i => i.id === issueId || issues.indexOf(i).toString() === issueId)
      if (issue && onIssueClick) {
        onIssueClick(issue)
      }
    }
    // 暴露打开文件对话框的方法，供侧边栏“上传文档”按钮使用
    window.openUploadDialog = () => fileInputRef.current?.click()
    
    return () => {
      delete window.handleIssueClick
      delete window.openUploadDialog
    }
  }, [issues, onIssueClick])
  
  return (
    <div className="flex-1 flex flex-col bg-white" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {/* 编辑器头部 */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-medium text-gray-900 truncate">第三章 现代文学的发展与变革</h2>
            {fileInfo && (
              <p className="mt-1 text-xs text-gray-500 truncate">
                {fileInfo.type} · {fileInfo.name} · {(fileInfo.size/1024).toFixed(0)} KB
              </p>
            )}
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isParsing}
            className="flex items-center space-x-1"
          >
            <Upload className="h-4 w-4" />
            <span>{isParsing ? '解析中...' : '上传文档'}</span>
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.docx"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
        {uploadError && (
          <div className="mt-2 text-xs text-red-600">{uploadError}</div>
        )}
      </div>
      
      {/* 编辑器内容区 */}
      <div className="flex-1 p-6 overflow-auto relative">
        {/* 拖拽提示层 */}
        {isDragging && (
          <div className="absolute inset-3 border-2 border-dashed border-blue-400/70 bg-blue-50/50 rounded-lg flex items-center justify-center text-blue-600 text-sm z-10 pointer-events-none">
            松开鼠标，上传文件（支持 .txt / .docx）
          </div>
        )}
        {content ? (
          <div className="prose max-w-none min-h-full relative">
            {isEditing ? (
              // 编辑模式：纯文本可编辑
              <div 
                ref={editorRef}
                className="outline-none min-h-full whitespace-pre-wrap"
                contentEditable
                suppressContentEditableWarning={true}
                onInput={handleInput}
                onBlur={handleBlur}
                style={{ 
                  minHeight: '300px',
                  lineHeight: '1.6',
                  fontSize: '16px',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}
              >
                {content}
              </div>
            ) : (
              // 显示模式：React 节点高亮渲染
              // 使用 <pre> 保留换行与空格，避免浏览器合并空白造成的视觉偏差
              <div
                ref={contentRef}
                className={`whitespace-pre-wrap leading-7 text-gray-800 ${isDragging ? 'ring-2 ring-blue-400' : ''}`}
                onClick={() => setActiveIssueId(null)}
              >
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', margin: 0 }}>
                  {renderHighlightedContent}
                </pre>
              </div>
            )}
          </div>
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
              disabled={isParsing}
            >
              {isParsing ? '解析中...' : '选择文件'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

