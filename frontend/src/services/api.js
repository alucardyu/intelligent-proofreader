// API服务模块
const API_BASE_URL = '/api'

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    }
    
    const config = { ...defaultOptions, ...options }
    
    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      // 如果是文件下载，返回blob
      if (response.headers.get('content-type')?.includes('application/vnd.openxmlformats')) {
        return response.blob()
      }
      
      return await response.json()
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }
  
  // 文档审校
  async proofreadDocument(content, options = {}) {
    return this.request('/proofread', {
      method: 'POST',
      body: JSON.stringify({
        content,
        options: {
          check_typos: options.typos !== false,
          check_grammar: options.grammar !== false,
          check_punctuation: options.punctuation !== false,
          check_sensitive: options.sensitive !== false,
        }
      })
    })
  }
  
  // 导出Word文档
  async exportWord(content, title = '审校文档', author = '') {
    const blob = await this.request('/export/word', {
      method: 'POST',
      body: JSON.stringify({
        content,
        title,
        author
      })
    })
    
    // 创建下载链接
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = `${title}_${new Date().toISOString().slice(0, 10)}.docx`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    
    return true
  }
  
  // 导出PDF（前端实现）
  async exportPDF(content, title = '审校文档') {
    // 这里可以使用 jsPDF 或其他PDF生成库
    // 暂时使用浏览器打印功能
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Microsoft YaHei', sans-serif; line-height: 1.6; margin: 40px; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            p { margin-bottom: 16px; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div>${content.replace(/\n/g, '</p><p>')}</div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
    
    return true
  }
  
  // 健康检查
  async healthCheck() {
    return this.request('/health')
  }
}

export default new ApiService()

