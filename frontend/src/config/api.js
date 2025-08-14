// API配置文件
const API_CONFIG = {
  // 生产环境API地址
  BASE_URL: 'https://intelligent-proofreader-api.onrender.com',
  
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
  TIMEOUT: 30000, // 30秒
};

// 获取完整的API URL
export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// 导出配置
export default API_CONFIG;

