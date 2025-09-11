import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { 
  Check, 
  X, 
  Filter, 
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  User
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area.jsx'

// 更稳健的占位符判断：单个短横/长横的多种变体、N/A/none/(空白)、以及纯横线串（如 “——”）都视为无效
const isPlaceholderCategory = (val) => {
  const raw = (val ?? '').toString()
  // 去除前后空白与引号
  const s = raw.trim().replace(/^[\'"“”‘’]+|[\'"“”‘’]+$/g, '')
  if (!s) return true
  // 标准化小写用于英文占位判断
  const lower = s.toLowerCase()
  if (lower === 'n/a' || lower === 'na' || lower === 'none') return true
  if (s === '(空白)') return true
  // 仅由横线变体组成（一个或多个），例如 '-'、'—'、'——'、'－－'
  if (/^[-—–―−﹣－‑]+$/.test(s)) return true
  return false
}

// 轻量 Diff（LCS）：将差异收敛到最小字符片段，避免整句被标注
// 返回 { aParts: [{text,type}], bParts: [{text,type}] }
const buildDiffParts = (a = '', b = '') => {
  const A = Array.from(String(a ?? ''))
  const B = Array.from(String(b ?? ''))
  const m = A.length, n = B.length
  if (m === 0 && n === 0) return { aParts: [], bParts: [] }
  if (a === b) return { aParts: [{ text: a, type: 'equal' }], bParts: [{ text: b, type: 'equal' }] }

  // LCS DP
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = (A[i] === B[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  // 回溯生成操作序列
  let i = 0, j = 0
  const ops = [] // {type: 'equal'|'del'|'ins', char}
  while (i < m && j < n) {
    if (A[i] === B[j]) { ops.push({ type: 'equal', char: A[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ type: 'del', char: A[i] }); i++; }
    else { ops.push({ type: 'ins', char: B[j] }); j++; }
  }
  while (i < m) { ops.push({ type: 'del', char: A[i++] }) }
  while (j < n) { ops.push({ type: 'ins', char: B[j++] }) }

  // 聚合为片段
  const aParts = []
  const bParts = []
  const pushPart = (arr, type, ch) => {
    if (!ch) return
    const last = arr[arr.length - 1]
    if (last && last.type === type) last.text += ch
    else arr.push({ text: ch, type })
  }
  for (const op of ops) {
    if (op.type === 'equal') {
      pushPart(aParts, 'equal', op.char)
      pushPart(bParts, 'equal', op.char)
    } else if (op.type === 'del') {
      pushPart(aParts, 'del', op.char)
    } else if (op.type === 'ins') {
      pushPart(bParts, 'ins', op.char)
    }
  }

  return { aParts, bParts }
}

export default function IssuePanel({ 
  issues = [], 
  onAcceptSuggestion, 
  onIgnoreIssue,
  onIssueClick,
  selectedIssueId,
  content = ''
}) {
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('priority')
  
  const itemRefs = useMemo(() => {
    const map = new Map()
    issues.forEach((it) => {
      map.set(it.id, { el: null })
    })
    return map
  }, [issues])

  useEffect(() => {
    if (!selectedIssueId) return
    const holder = itemRefs.get(selectedIssueId)
    const node = holder?.el
    if (node && node.scrollIntoView) {
      node.scrollIntoView({ block: 'center', behavior: 'smooth' })
      node.classList.add('animate-pulse')
      const t = setTimeout(() => node.classList.remove('animate-pulse'), 600)
      return () => clearTimeout(t)
    }
  }, [selectedIssueId, itemRefs])
  
  const paragraphs = useMemo(() => {
    const text = String(content ?? '')
    const result = []
    if (!text) return result

    let currentStart = 0
    const lines = text.split('\n')
    let buffer = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.trim() === '') {
        if (buffer.length) {
          const paragraphText = buffer.join('\n')
          result.push({ start: currentStart, end: currentStart + paragraphText.length })
          currentStart += paragraphText.length + 1
          buffer = []
        } else {
          currentStart += 1
        }
      } else {
        buffer.push(line)
      }
      if (i === lines.length - 1 && buffer.length) {
        const paragraphText = buffer.join('\n')
        result.push({ start: currentStart, end: currentStart + paragraphText.length })
      }
    }

    return result
  }, [content])

  const getParagraphNumber = (posStart) => {
    if (!paragraphs.length) return 1
    const idx = paragraphs.findIndex(p => posStart >= p.start && posStart <= p.end)
    return idx === -1 ? 1 : (idx + 1)
  }

  const toggleSortMode = () => {
    setSortBy((prev) => prev === 'priority' ? 'position' : prev === 'position' ? 'severity' : 'priority')
  }

  const stats = useMemo(() => {
    const s = { total: issues.length, typo: 0, grammar: 0, punctuation: 0, sensitive: 0 }
    issues.forEach(i => { s[i.type] = (s[i.type] || 0) + 1 })
    return s
  }, [issues])

  const getSeverityBadge = (sev) => {
    const raw = (sev ?? '').toString().trim().toLowerCase()
    // 占位或未知：不渲染
    if (!raw || raw === '-' || /^[-—–―−﹣－‑]+$/.test(raw) || raw === 'n/a' || raw === 'na' || raw === 'none' || raw === '(空白)') {
      return null
    }
    const text = raw === 'high' ? '高' : raw === 'medium' ? '中' : raw === 'low' ? '低' : null
    if (!text) return null
    const color = raw === 'high' ? 'bg-red-100 text-red-700 border-red-200' : raw === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-green-100 text-green-700 border-green-200'
    return <Badge variant="outline" className={`text-xs ${color}`}>{text}</Badge>
  }

  const sortLabel = sortBy === 'priority' ? '优先级' : sortBy === 'position' ? '位置' : '严重程度'

  // 保留辅助函数（用于统计/排序），但不再用于显示层剥离引号
  const stripQuotes = (s) => String(s ?? '').replace(/^[\'\"“”‘’]+|[\'\"“”‘’]+$/g, '')
  const normalize = (s) => stripQuotes(s).trim()

  const isLLM = (i) => !!(i && (
    i.source === 'qwen' ||
    i.llm === true ||
    (i.source === 'hybrid' && i.subtype === 'sensitive_explain') ||
    /qwen|openai|glm|moonshot|ernie|deepseek|gpt|yi/i.test(String(i?.model || i?.provider || i?.source || ''))
  ))

  const severityRank = (sev) => {
    const key = String(sev || '').toLowerCase()
    return key === 'high' ? 3 : key === 'medium' ? 2 : key === 'low' ? 1 : 0
  }

  const getIssueStyle = (type, severity) => {
    const t = String(type || '').toLowerCase()
    let borderCls = 'border-l-4 border-gray-300'
    if (t === 'typo') borderCls = 'border-l-4 border-red-500'
    else if (t === 'grammar') borderCls = 'border-l-4 border-blue-500'
    else if (t === 'punctuation') borderCls = 'border-l-4 border-violet-500'
    else if (t === 'sensitive') borderCls = 'border-l-4 border-amber-500'
    else if (t === 'style') borderCls = 'border-l-4 border-emerald-500'
    return { border: borderCls }
  }

  const sortedIssues = useMemo(() => {
    const filtered = (filter === 'all') ? issues : issues.filter(i => i.type === filter)
    const arr = [...filtered]
    if (sortBy === 'position') {
      arr.sort((a, b) => (a.position?.start ?? 0) - (b.position?.start ?? 0))
    } else if (sortBy === 'severity') {
      arr.sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    } else {
      arr.sort((a, b) => {
        const llmDelta = (isLLM(b) ? 1 : 0) - (isLLM(a) ? 1 : 0)
        if (llmDelta !== 0) return llmDelta
        const sevDelta = severityRank(b.severity) - severityRank(a.severity)
        if (sevDelta !== 0) return sevDelta
        return (a.position?.start ?? 0) - (b.position?.start ?? 0)
      })
    }
    return arr
  }, [issues, filter, sortBy])

  const getTypeMeta = (type) => {
    const t = String(type || '').toLowerCase()
    if (t === 'typo') return { label: '错别字', cls: 'bg-red-100 text-red-700 border-red-200' }
    if (t === 'grammar') return { label: '语法', cls: 'bg-blue-100 text-blue-700 border-blue-200' }
    if (t === 'punctuation') return { label: '标点', cls: 'bg-violet-100 text-violet-700 border-violet-200' }
    if (t === 'sensitive') return { label: '敏感', cls: 'bg-amber-100 text-amber-700 border-amber-200' }
    if (t === 'style') return { label: '风格', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
    return { label: '其他', cls: 'bg-gray-100 text-gray-700 border-gray-200' }
  }

  return (
    <div className="h-full min-h-0 bg-gray-50 border-l border-gray-200 flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">审校问题 ({stats.total})</h3>
          
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm">
              <Filter className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleSortMode}
              title={`排序：${sortLabel}`}
            >
              <ArrowUpDown className="h-4 w-4" />
              <span className="ml-1 text-xs text-gray-600 hidden sm:inline">{sortLabel}</span>
            </Button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1.5">
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('all')}
            className="text-xs rounded-full"
          >
            全部 ({stats.total})
          </Button>
          <Button 
            variant={filter === 'typo' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('typo')}
            className="text-xs rounded-full"
          >
            错别字 ({stats.typo})
          </Button>
          <Button 
            variant={filter === 'grammar' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('grammar')}
            className="text-xs rounded-full"
          >
            语法 ({stats.grammar})
          </Button>
          <Button 
            variant={filter === 'punctuation' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('punctuation')}
            className="text-xs rounded-full"
          >
            标点 ({stats.punctuation})
          </Button>
          <Button 
            variant={filter === 'sensitive' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('sensitive')}
            className="text-xs rounded-full"
          >
            敏感 ({stats.sensitive})
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-3">
          {sortedIssues.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p className="text-sm">暂无问题</p>
            </div>
          ) : (
            sortedIssues.map((issue, index) => {
              const style = getIssueStyle(issue.type, issue.severity)
              const isSelected = selectedIssueId && issue.id === selectedIssueId
              const displayTypeMeta = (issue?.subtype === 'sensitive_explain') ? getTypeMeta('sensitive') : getTypeMeta(issue.type)
              
              const infoText = (issue.description || issue.message || '').trim()
              // 直接使用原始文本，保留引号/空格等差异
              const origRaw = String(issue.original ?? '')
              const suggRaw = String(issue.suggestion ?? '')
              const hasOrig = origRaw.trim().length > 0
              const hasSug = suggRaw.trim().length > 0
              const shouldShowPair = hasOrig
              const diff = buildDiffParts(origRaw, suggRaw)
              
              return (
                <div
                  key={issue.id || index}
                  ref={(el) => {
                    const holder = itemRefs.get(issue.id)
                    if (holder) holder.el = el
                  }}
                  className={`rounded-xl ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
                >
                  <Card 
                    className={`cursor-pointer hover:shadow-md transition-shadow ${style.border} ${isSelected ? 'border-blue-400 shadow-md' : ''}`}
                    onClick={() => onIssueClick && onIssueClick(issue)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center flex-wrap gap-1.5">
                          <Badge variant="outline" className={`text-xs ${displayTypeMeta.cls}`}>{displayTypeMeta.label}</Badge>
                          {!isPlaceholderCategory(issue.category) && (
                            <Badge variant="outline" className="text-xs">
                              {(issue.category ?? '').toString().trim()}
                            </Badge>
                          )}
                          {getSeverityBadge(issue.severity)}
                          {isLLM(issue) && (
                            <Badge variant="secondary" className="text-xs">LLM</Badge>
                          )}
                          {issue.subtype ? (
                            <Badge variant="outline" className="text-xs">{issue.subtype === 'style' ? '风格' : (issue.subtype === 'sensitive_explain' ? '敏感说明' : issue.subtype)}</Badge>
                          ) : null}
                        </div>
                        <span className="text-xs text-gray-500">第{getParagraphNumber(issue?.position?.start ?? 0)}段</span>
                      </div>
                      
                      <div className="mb-2">
                        {shouldShowPair ? (
                          <div className="text-sm md:text-base leading-7 text-gray-900">
                            <span className="text-red-700">
                               {diff.aParts.map((p, i) => (
                                <span key={`a-${i}`} className={p.type === 'del' ? 'underline decoration-2 underline-offset-4' : ''}>{p.text}</span>
                              ))}
                            </span>
                            {hasSug && (
                              <>
                                <span className="text-gray-400 mx-1.5">→</span>
                                <span>
                                  {diff.bParts.map((p, i) => (
                                    <span key={`b-${i}`} className={p.type === 'ins' ? 'underline decoration-2 underline-offset-4' : ''}>{p.text}</span>
                                  ))}
                                </span>
                              </>
                            )}
                          </div>
                        ) : (
                          infoText && (
                            <p className="text-sm text-gray-700 mb-1">{infoText}</p>
                          )
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {issue.suggestion && (
                          <Button 
                            size="sm" 
                            className="flex-1 bg-green-600 hover:bg-green-700 text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              onAcceptSuggestion && onAcceptSuggestion(issue)
                            }}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            采纳
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            onIgnoreIssue && onIgnoreIssue(issue)
                          }}
                        >
                          <X className="h-3 w-3 mr-1" />
                          忽略
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

