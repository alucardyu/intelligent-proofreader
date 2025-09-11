import { useState, useRef, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Upload } from 'lucide-react'
import mammoth from 'mammoth/mammoth.browser'

export default function Editor({ 
  content, 
  onContentChange, 
  issues = [], 
  onIssueClick,
  onFileUpload,
  selectedIssueId,
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const editorRef = useRef(null)
  const contentRef = useRef(null)
  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)
  const [activeIssueId, setActiveIssueId] = useState(null)

  const handleInput = (e) => {
    onContentChange && onContentChange(e.currentTarget.innerText)
  }
  const handleBlur = () => {}

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
    let reconstructed = '' // 用于验证是否与原文一致
  
    const getStyle = (type) => {
      const t = String(type || '').toLowerCase()
      // 使用接近 Tailwind 的颜色，四类清晰区分
      if (t === 'typo') return { backgroundColor: '#fee2e2', borderBottom: '2px solid #ef4444', cursor: 'pointer' } // red-200 / red-500
      if (t === 'grammar') return { backgroundColor: '#dbeafe', borderBottom: '2px solid #3b82f6', cursor: 'pointer' } // blue-200 / blue-500
      if (t === 'punctuation') return { backgroundColor: '#ede9fe', borderBottom: '2px solid #8b5cf6', cursor: 'pointer' } // violet-200 / violet-500
      if (t === 'sensitive') return { backgroundColor: '#fef3c7', borderBottom: '2px solid #f59e0b', cursor: 'pointer' } // amber-200 / amber-500
      if (t === 'style') return { backgroundColor: '#d1fae5', borderBottom: '2px solid #10b981', cursor: 'pointer' } // emerald-200 / emerald-500
      return { backgroundColor: '#e5e7eb', borderBottom: '2px solid #6b7280', cursor: 'pointer' } // gray-200 / gray-500
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
        const plain = content.slice(cursor, start)
        nodes.push(plain)
        reconstructed += plain
      }
  
      // 追加高亮文本
      const text = content.slice(start, end)
      const style = getStyle(issue.type)
      const isSelected = selectedIssueId && (selectedIssueId === (issue.id || id))
      reconstructed += text
      
      // 仅在开发环境且长度一致时做严格匹配校验，避免线上后端规则差异导致的噪声
      const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV
      if (
        isDev &&
        issue.original &&
        text !== issue.original &&
        text.length === issue.original.length &&
        issue.type !== 'punctuation' // 标点类经常包含跨字符提示（如“句号后空格”），不作严格比对
      ) {
        console.warn(`[Highlight Mismatch] 位置 ${start}-${end}:`, {
          expected: issue.original,
          actual: text,
          issue: issue
        })
      }
      
      nodes.push(
        <span
          key={id}
          data-issue-id={issue.id || id}
          style={style}
          className={`${isSelected ? 'ring-2 ring-blue-400 rounded-sm' : ''} transition-shadow`}
          onClick={(e) => {
            e.stopPropagation()
            const target = issues.find(i => i.id === (issue.id || id) || (i.position.start === start && i.position.end === end))
            if (target && onIssueClick) onIssueClick(target)
          }}
          title={`${issue.type}: ${issue.description || issue.message} (${start}-${end})`}
        >
          {text}
        </span>
      )
  
      cursor = end
    })
  
    // 追加剩余文本
    if (cursor < content.length) {
      const tail = content.slice(cursor)
      nodes.push(tail)
      reconstructed += tail
    }
  
    // 安全兜底：若重建文本与原文不一致（例如某些极端重叠/越界数据），直接回退为纯文本，避免视觉重复
    if (reconstructed !== content) {
      console.warn('[Highlight Fallback] 重建文本与原文不一致，回退为纯文本渲染', {
        contentLength: content.length,
        reconstructedLength: reconstructed.length
      })
      return [content]
    }
  
    return nodes
  }, [content, issues, onIssueClick, selectedIssueId])

  // 设置全局点击处理函数（兼容现有逻辑）
  // 设置全局点击处理函数（兼容现有逻辑）
  useEffect(() => {
    window.handleIssueClick = (issueId) => {
      const issue = issues.find(i => i.id === issueId || issues.indexOf(i).toString() === issueId)
      if (issue && onIssueClick) {
        onIssueClick(issue)
      }
    }
    // 暴露打开文件对话框的方法，供侧边栏"上传文档"按钮使用
    window.openUploadDialog = () => fileInputRef.current?.click()
    
    return () => {
      delete window.handleIssueClick
      delete window.openUploadDialog
    }
  }, [issues, onIssueClick])

  // 当右侧列表选中问题变化时，定位到对应文本
  useEffect(() => {
    if (!selectedIssueId || !scrollRef.current) return
    const container = scrollRef.current
    const el = container.querySelector(`[data-issue-id="${selectedIssueId}"]`)
    if (!el) return

    // 精准滚动：使用几何计算避免浏览器对齐差异
    const elRect = el.getBoundingClientRect()
    const cRect = container.getBoundingClientRect()
    const currentScroll = container.scrollTop
    // 目标元素相对容器顶部的偏移量（包含容器 padding）
    const offset = elRect.top - cRect.top + currentScroll
    const target = Math.max(0, offset - (container.clientHeight / 2) + (elRect.height / 2))
    container.scrollTo({ top: target, behavior: 'smooth' })

    // 添加短暂的闪烁动画提示定位，但不移除持久蓝框
    el.classList.add('animate-pulse')
    const timer = setTimeout(() => el.classList.remove('animate-pulse'), 600)
    return () => clearTimeout(timer)
  }, [selectedIssueId])
  
  const processFile = async (file) => {
    try {
      setIsParsing(true)
      setUploadError('')
      const ext = file.name.split('.').pop().toLowerCase()
      if (ext === 'txt') {
        const text = await file.text()
        onFileUpload && onFileUpload(file, text)
      } else if (ext === 'docx') {
        const arrayBuffer = await file.arrayBuffer()
        const { value } = await mammoth.extractRawText({ arrayBuffer })
        onFileUpload && onFileUpload(file, value || '')
      } else {
        setUploadError('仅支持 .txt 或 .docx 文件')
      }
    } catch (e) {
      setUploadError('文件解析失败：' + (e?.message || '未知错误'))
    } finally {
      setIsParsing(false)
    }
  }
  
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (file) await processFile(file)
  }
  
  return (
    <div className="h-full flex flex-col bg-white min-h-0" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {/* 编辑器头部 */}
      <div className="border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-sm text-gray-600">
              {content ? '已加载文档' : '请上传 .txt / .docx 文档'}
            </div>
          </div>
          {/* 顶部操作按钮移除：避免与左侧侧栏重复 */}
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
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6 relative">
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
                <pre key={`${content.length}-${issues.length}-${issues?.[0]?.position?.start ?? 0}`} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', margin: 0 }}>
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
              拖拽文件到此处或点击下方按钮选择
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

