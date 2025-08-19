import API_CONFIG, { getApiUrl } from '../config/api.js';

class ApiService {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  // 通用请求方法（支持可选超时与代理回退）
  async request(url, options = {}) {
    const config = {
      method: 'GET',
      headers: {
        ...API_CONFIG.DEFAULT_HEADERS,
        ...options.headers,
      },
      ...options,
    };

    const timeoutMs = options.timeout ?? this.timeout;

    const doFetch = async (targetUrl, tmo) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), tmo);
      try {
        const resp = await fetch(targetUrl, { ...config, signal: controller.signal });
        clearTimeout(timer);
        if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
        return await resp.json();
      } finally {
        clearTimeout(timer);
      }
    };

    try {
      return await doFetch(url, timeoutMs);
    } catch (error) {
      // 若为超时或网络错误，且是指向固定 BASE_URL 的绝对地址，则尝试走相对路径（通过 Vite 代理）
      const isTimeout = error?.name === 'AbortError' || /timeout|NetworkError|Failed to fetch/i.test(error?.message || '');
      const canFallback = typeof url === 'string' && url.startsWith(API_CONFIG.BASE_URL);
      if (isTimeout && canFallback) {
        const relativePath = url.replace(API_CONFIG.BASE_URL, '');
        try {
          return await doFetch(relativePath, timeoutMs);
        } catch (e2) {
          if (e2?.name === 'AbortError') {
            throw new Error('请求超时，请检查网络连接');
          }
          throw e2;
        }
      }
      if (error?.name === 'AbortError') {
        throw new Error('请求超时，请检查网络连接');
      }
      throw error;
    }
  }

  // 健康检查（短超时）
  async healthCheck() {
    try {
      const url = getApiUrl(API_CONFIG.ENDPOINTS.HEALTH);
      const response = await this.request(url, { timeout: 5000 });
      return response;
    } catch (error) {
      console.error('健康检查失败:', error);
      throw new Error('无法连接到服务器，请稍后重试');
    }
  }

  // 审校文本（支持传入 options）（较长超时以兼容冷启动）
  async proofreadText(content, options = {}) {
    try {
      if (!content || content === '') {
        throw new Error('请输入要审校的文本内容');
      }

      const url = getApiUrl(API_CONFIG.ENDPOINTS.PROOFREAD);
      const response = await this.request(url, {
        method: 'POST',
        body: JSON.stringify({ content: content, options }),
        timeout: 60000,
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

  // ===== 别名方法，兼容现有调用 =====
  async proofreadDocument(content, checkOptions = {}) {
    // 将前端的 checkOptions 映射为后端期望的 options 字段
    const options = {
      check_typos: checkOptions.grammar ?? true, // grammar 勾选同时意味着错别字/语法
      check_grammar: checkOptions.grammar ?? true,
      check_punctuation: checkOptions.punctuation ?? true,
      check_sensitive: checkOptions.sensitive ?? true,
    };
    return this.proofreadText(content, options);
  }

  async exportPDF(content, title = '文档', author = '') {
    // 如果后端将来需要 title/author，可在服务端支持；当前仅透传内容和 issues
    return this.exportToPDF(content, []);
  }

  async exportWord(content, title = '文档', author = '') {
    return this.exportToWord(content, []);
  }
}

// 创建单例实例
const apiService = new ApiService();

export default apiService;

