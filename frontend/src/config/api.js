// API配置文件
const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV
const useDirectApi = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_USE_DIRECT_API === 'true'
const preferProxy = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_LOCAL_BACKEND === 'true'
// 当本地开发显式指定走本地后端代理时（VITE_LOCAL_BACKEND=true），忽略直连设置
const effectiveUseDirectApi = useDirectApi && !preferProxy
const directDevBase = effectiveUseDirectApi
  ? (import.meta.env.VITE_DIRECT_API_BASE || 'https://intelligent-proofreader-api.onrender.com')
  : ''

// 调试输出配置
console.log('[API Config Debug]', {
  isDev,
  useDirectApi,
  effectiveUseDirectApi,
  preferProxy,
  VITE_USE_DIRECT_API: import.meta.env.VITE_USE_DIRECT_API,
  VITE_DIRECT_API_BASE: import.meta.env.VITE_DIRECT_API_BASE,
  VITE_LOCAL_BACKEND: import.meta.env.VITE_LOCAL_BACKEND,
  VITE_LOCAL_BACKEND_URL: import.meta.env.VITE_LOCAL_BACKEND_URL,
  directDevBase
})

const API_CONFIG = {
  // 根据环境选择 API 地址：
  // - 开发：使用相对路径，通过 Vite 代理转发
  // - 生产：同样使用相对路径，通过 Vercel 重写转发到后端，避免浏览器直连产生的 TLS/CORS 问题
  BASE_URL: '',
  
  // API端点
  ENDPOINTS: {
    HEALTH: '/api/health',
    PROOFREAD: '/api/proofread',
    REPORT_HTML: '/api/report/html',
    EXPORT_PDF: '/api/export/pdf',
    EXPORT_WORD: '/api/export/word'
  },
  
  // 请求配置
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  },
  
  // 超时设置
  TIMEOUT: 30000, // 30秒（具体请求可覆盖）
};

console.log('[API Config] Final BASE_URL:', API_CONFIG.BASE_URL)

// 获取完整的API URL
export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// 导出配置
export default API_CONFIG;

