import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { 
  FileUp, 
  Wand2, 
  Edit3, 
  FileText, 
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react'

export default function Toolbar({ 
  onUpload, 
  onProofread, 
  onManualEdit, 
  onGenerateReport,
  checkOptions,
  onCheckOptionChange,
  isProofreading = false
}) {
  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 space-y-4">
      {/* 文档操作 */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700">文档操作</h3>
        
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={onUpload}
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
        
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={onManualEdit}
        >
          <Edit3 className="h-4 w-4 mr-2" />
          手动标记
        </Button>
        
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
        <h3 className="text-sm font-medium text-gray-700">检查选项</h3>
        
        <div className="space-y-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={checkOptions.grammar}
              onChange={(e) => onCheckOptionChange('grammar', e.target.checked)}
              className="rounded border-gray-300"
            />
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm">语法检查</span>
          </label>
          
          <label className="flex items-center space-x-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={checkOptions.terminology}
              onChange={(e) => onCheckOptionChange('terminology', e.target.checked)}
              className="rounded border-gray-300"
            />
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <span className="text-sm">术语检查</span>
          </label>
          
          <label className="flex items-center space-x-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={checkOptions.punctuation}
              onChange={(e) => onCheckOptionChange('punctuation', e.target.checked)}
              className="rounded border-gray-300"
            />
            <CheckCircle2 className="h-4 w-4 text-purple-600" />
            <span className="text-sm">标点检查</span>
          </label>
          
          <label className="flex items-center space-x-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={checkOptions.sensitive}
              onChange={(e) => onCheckOptionChange('sensitive', e.target.checked)}
              className="rounded border-gray-300"
            />
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm">敏感内容</span>
          </label>
        </div>
      </div>
      
      {/* 显示选项 */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700">显示选项</h3>
        
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-xs">
            <Eye className="h-3 w-3 mr-1" />
            显示问题
          </Badge>
          <Badge variant="outline" className="text-xs">
            <EyeOff className="h-3 w-3 mr-1" />
            隐藏已修复
          </Badge>
        </div>
      </div>
    </div>
  )
}

