import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { 
  FileUp, 
  Wand2, 
  FileText, 
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react'
import { Switch } from '@/components/ui/switch.jsx'

export default function Toolbar({ 
  onUpload, 
  onProofread, 
  onGenerateReport,
  checkOptions,
  onCheckOptionChange,
  isProofreading = false,
  progress = { total: 0, done: 0 }
}) {
  const handleUploadClick = () => {
    // 优先调用传入的 onUpload；若未传入，则调用全局打开对话框方法
    if (typeof onUpload === 'function') {
      onUpload()
    } else if (typeof window !== 'undefined' && typeof window.openUploadDialog === 'function') {
      window.openUploadDialog()
    }
  }

  const pct = progress.total > 0 ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : 0

  return (
    <div className="h-full bg-gray-50 border-r border-gray-200 p-4 space-y-4 flex flex-col">
      {/* 文档操作 */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-gray-500 tracking-wide uppercase">文档操作</h3>
        
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={handleUploadClick}
        >
          <FileUp className="h-4 w-4 mr-2" />
          上传文档
        </Button>
        
        <Button 
          variant="default" 
          className="w-full justify-start bg-green-600 hover:bg-green-700"
          onClick={onProofread}
          disabled={isProofreading}
        >
          <Wand2 className="h-4 w-4 mr-2" />
          {isProofreading ? '审校中...' : '智能审校'}
        </Button>

        {progress.total > 0 && (
          <div className="w-full mt-2">
            <div className="w-full h-2 rounded bg-gray-200 overflow-hidden">
              <div className="h-2 bg-green-600 transition-all" style={{ width: pct + '%' }} />
            </div>
            <div className="mt-1 text-xs text-gray-600 text-right">
              {progress.done}/{progress.total}（{pct}%）
            </div>
          </div>
        )}
        
        {/* 已移除“手动标记”按钮 */}
        
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={onGenerateReport}
        >
          <FileText className="h-4 w-4 mr-2" />
          审校报告
        </Button>
      </div>
      
      {/* 检查选项 */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-gray-500 tracking-wide uppercase">检查选项</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm">语法与错别字</span>
            </div>
            <Switch
              checked={!!checkOptions.grammar}
              onCheckedChange={(v) => onCheckOptionChange('grammar', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-purple-600" />
              <span className="text-sm">标点与格式</span>
            </div>
            <Switch
              checked={!!checkOptions.punctuation}
              onCheckedChange={(v) => onCheckOptionChange('punctuation', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4 text-red-600" />
              <span className="text-sm">敏感词与合规</span>
            </div>
            <Switch
              checked={!!checkOptions.sensitive}
              onCheckedChange={(v) => onCheckOptionChange('sensitive', v)}
            />
          </div>
        </div>
      </div>

      <div className="mt-auto">
        <Badge variant="secondary" className="w-full justify-between">
          <span>可见性</span>
          <span className="flex items-center text-xs text-gray-600">
            {checkOptions.grammar || checkOptions.punctuation || checkOptions.sensitive ? (
              <Eye className="h-3.5 w-3.5 ml-1" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 ml-1" />
            )}
          </span>
        </Badge>
      </div>
    </div>
  )
}

