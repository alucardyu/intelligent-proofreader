import API_CONFIG, { getApiUrl } from '../config/api.js';

class ApiService {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  // 通用请求方法
  async request(url, options = {}) {
    const config = {
      method: 'GET',
      headers: {
        ...API_CONFIG.DEFAULT_HEADERS,
        ...options.headers,
      },
      ...options,
    };

    // 添加超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    config.signal = controller.signal;

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('请求超时，请检查网络连接');
      }
      throw error;
    }
  }

  // 健康检查
  async healthCheck() {
    try {
      const url = getApiUrl(API_CONFIG.ENDPOINTS.HEALTH);
      const response = await this.request(url);
      return response;
    } catch (error) {
      console.error('健康检查失败:', error);
      throw new Error('无法连接到服务器，请稍后重试');
    }
  }

  // 审校文本
  async proofreadText(content) {
    try {
      if (!content || content.trim() === '') {
        throw new Error('请输入要审校的文本内容');
      }

      const url = getApiUrl(API_CONFIG.ENDPOINTS.PROOFREAD);
      const response = await this.request(url, {
        method: 'POST',
        body: JSON.stringify({ content: content.trim() }),
      });

      return response;
    } catch (error) {
      console.error('审校请求失败:', error);
      throw new Error(error.message || '审校服务暂时不可用，请稍后重试');
    }
  }

  // 导出PDF
  async exportToPDF(content, issues = []) {
    try {
      const url = getApiUrl(API_CONFIG.ENDPOINTS.EXPORT_PDF);
      const response = await this.request(url, {
        method: 'POST',
        body: JSON.stringify({ 
          content: content.trim(),
          issues: issues 
        }),
      });

      return response;
    } catch (error) {
      console.error('PDF导出失败:', error);
      throw new Error('PDF导出失败，请稍后重试');
    }
  }

  // 导出Word
  async exportToWord(content, issues = []) {
    try {
      const url = getApiUrl(API_CONFIG.ENDPOINTS.EXPORT_WORD);
      const response = await this.request(url, {
        method: 'POST',
        body: JSON.stringify({ 
          content: content.trim(),
          issues: issues 
        }),
      });

      return response;
    } catch (error) {
      console.error('Word导出失败:', error);
      throw new Error('Word导出失败，请稍后重试');
    }
  }
}

// 创建单例实例
const apiService = new ApiService();

export default apiService;

