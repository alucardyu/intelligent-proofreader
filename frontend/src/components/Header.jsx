import { Button } from '@/components/ui/button.jsx'
import { FileText, Download, Settings, Bell } from 'lucide-react'

export default function Header({ onExportWord, onSettings, fileTitle, showExportPDF = false, onExportPDF }) {
  return (
    <header className="bg-white/95 backdrop-blur border-b border-gray-200 px-6 py-3 sticky top-0 z-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-7 w-7 text-blue-600" />
            <h1 className="text-lg font-semibold text-gray-900">出版智校</h1>
            <span className="text-xs text-blue-700/80 bg-blue-50 px-2 py-0.5 rounded">测试版</span>
          </div>
          
          {fileTitle && (
            <div className="text-sm text-gray-600 hidden md:block truncate max-w-[28rem]">
              <span className="font-medium truncate">{fileTitle}</span>
            </div>
          )}
        </div>
        
        {/* 右侧功能区：导出、通知和设置 */}
        <div className="flex items-center space-x-2 ml-2">
          {showExportPDF && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onExportPDF}
              className="flex items-center space-x-1"
            >
              <Download className="h-4 w-4" />
              <span>导出PDF</span>
            </Button>
          )}
          
          <Button 
            variant="default" 
            size="sm"
            onClick={onExportWord}
            className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            <span>导出Word</span>
          </Button>

          <Button variant="ghost" size="icon" aria-label="通知">
            <Bell className="h-5 w-5 text-gray-600" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onSettings}
          >
            <Settings className="h-4 w-4" />
          </Button>

          {/* 头像占位 */}
          <div className="ml-1 h-8 w-8 rounded-full bg-gray-200 overflow-hidden ring-1 ring-gray-300" />
        </div>
      </div>
    </header>
  )
}

