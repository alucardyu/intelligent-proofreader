// API配置文件
const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV

const API_CONFIG = {
  // 根据环境选择 API 地址：开发走相对路径，通过 Vite 代理；生产直连后端域名
  BASE_URL: isDev ? '' : 'https://intelligent-proofreader-api.onrender.com',
  
  // API端点
  ENDPOINTS: {
    HEALTH: '/api/health',
    PROOFREAD: '/api/proofread',
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

// 获取完整的API URL
export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// 导出配置
export default API_CONFIG;

