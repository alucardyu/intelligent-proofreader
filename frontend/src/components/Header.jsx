import { Button } from '@/components/ui/button.jsx'
import { FileText, Download, Save, Settings } from 'lucide-react'

export default function Header({ onSave, onExportPDF, onExportWord, onSettings }) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-8 w-8 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">出版智校</h1>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">专业版</span>
          </div>
          
          <div className="text-sm text-gray-600">
            <span className="font-medium">中国现代文学简史</span>
            <span className="mx-2">·</span>
            <span>第3章 - 修订版</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">上次编辑: 2024-01-15 14:30</span>
          <span className="text-sm text-green-600 font-medium">审校进度: 68%</span>
          
          <div className="flex items-center space-x-2 ml-6">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onSave}
              className="flex items-center space-x-1"
            >
              <Save className="h-4 w-4" />
              <span>保存</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={onExportPDF}
              className="flex items-center space-x-1"
            >
              <Download className="h-4 w-4" />
              <span>导出PDF</span>
            </Button>
            
            <Button 
              variant="default" 
              size="sm"
              onClick={onExportWord}
              className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              <span>导出Word</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onSettings}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

