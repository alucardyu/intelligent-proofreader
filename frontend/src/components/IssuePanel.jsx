import { useState } from 'react'
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

export default function IssuePanel({ 
  issues = [], 
  onAcceptSuggestion, 
  onIgnoreIssue,
  onIssueClick 
}) {
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('position')
  
  // 过滤问题
  const filteredIssues = issues.filter(issue => {
    if (filter === 'all') return true
    return issue.type === filter
  })
  
  // 排序问题
  const sortedIssues = [...filteredIssues].sort((a, b) => {
    if (sortBy === 'position') {
      return a.position.start - b.position.start
    }
    if (sortBy === 'severity') {
      const severityOrder = { high: 3, medium: 2, low: 1 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    }
    return 0
  })
  
  // 获取问题类型的颜色和图标
  const getIssueStyle = (type, severity) => {
    const styles = {
      typo: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
      grammar: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
      punctuation: { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
      sensitive: { color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-300' }
    }
    return styles[type] || styles.typo
  }
  
  // 获取严重程度标签
  const getSeverityBadge = (severity) => {
    const variants = {
      high: 'destructive',
      medium: 'default', 
      low: 'secondary'
    }
    return (
      <Badge variant={variants[severity]} className="text-xs">
        {severity === 'high' ? '高' : severity === 'medium' ? '中' : '低'}
      </Badge>
    )
  }
  
  // 统计信息
  const stats = {
    total: issues.length,
    typo: issues.filter(i => i.type === 'typo').length,
    grammar: issues.filter(i => i.type === 'grammar').length,
    punctuation: issues.filter(i => i.type === 'punctuation').length,
    sensitive: issues.filter(i => i.type === 'sensitive').length
  }
  
  return (
    <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">审校问题 ({stats.total})</h3>
          
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* 过滤器 */}
        <div className="flex flex-wrap gap-1">
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('all')}
            className="text-xs"
          >
            全部 ({stats.total})
          </Button>
          <Button 
            variant={filter === 'typo' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('typo')}
            className="text-xs"
          >
            错别字 ({stats.typo})
          </Button>
          <Button 
            variant={filter === 'grammar' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('grammar')}
            className="text-xs"
          >
            语法 ({stats.grammar})
          </Button>
          <Button 
            variant={filter === 'punctuation' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('punctuation')}
            className="text-xs"
          >
            标点 ({stats.punctuation})
          </Button>
          <Button 
            variant={filter === 'sensitive' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('sensitive')}
            className="text-xs"
          >
            敏感 ({stats.sensitive})
          </Button>
        </div>
      </div>
      
      {/* 问题列表 */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {sortedIssues.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p className="text-sm">暂无问题</p>
          </div>
        ) : (
          sortedIssues.map((issue, index) => {
            const style = getIssueStyle(issue.type, issue.severity)
            
            return (
              <Card 
                key={issue.id || index} 
                className={`cursor-pointer hover:shadow-md transition-shadow ${style.border}`}
                onClick={() => onIssueClick && onIssueClick(issue)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {issue.category}
                      </Badge>
                      {getSeverityBadge(issue.severity)}
                    </div>
                    <span className="text-xs text-gray-500">第{Math.floor(issue.position.start / 100) + 1}段</span>
                  </div>
                  
                  <div className="mb-2">
                    <p className="text-sm text-gray-600 mb-1">{issue.description}</p>
                    <div className="text-xs">
                      <span className="text-red-600">"{issue.original}"</span>
                      {issue.suggestion && (
                        <>
                          <span className="text-gray-400 mx-1">→</span>
                          <span className="text-green-600">"{issue.suggestion}"</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
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
            )
          })
        )}
      </div>
      
      {/* 评论区 */}
      <div className="border-t border-gray-200 p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
          <MessageSquare className="h-4 w-4 mr-1" />
          评论与批注
        </h4>
        
        <div className="space-y-2">
          <div className="bg-white p-2 rounded border text-xs">
            <div className="flex items-center space-x-1 mb-1">
              <User className="h-3 w-3" />
              <span className="font-medium">张编辑</span>
              <span className="text-gray-500">今天 10:24</span>
            </div>
            <p className="text-gray-600">建议补充本节中提到的主要作品的出版时间和影响。</p>
          </div>
        </div>
      </div>
    </div>
  )
}

