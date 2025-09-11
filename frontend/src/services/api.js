import API_CONFIG, { getApiUrl } from '../config/api.js';

class ApiService {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
    // 用于直连云端的兜底地址（通过 Vite define 注入）
    try {
      // eslint-disable-next-line no-undef
      this.cloudBase = typeof __API_BASE_URL__ !== 'undefined' && __API_BASE_URL__ ? __API_BASE_URL__ : 'https://intelligent-proofreader-api.onrender.com'
    } catch (_) {
      this.cloudBase = 'https://intelligent-proofreader-api.onrender.com'
    }
  }

  // 通用请求方法（返回 JSON）。注意：导出/报告等非 JSON 响应不要用此方法。
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

    const resolveUrl = (u) => {
      // 兼容传入 endpoint（以 / 开头）或完整 URL
      if (typeof u === 'string') {
        if (u.startsWith('http://') || u.startsWith('https://')) return u;
        if (u.startsWith('/')) {
          // 若 BASE_URL 为空（例如 dev 且未直连），直接使用相对路径走代理
          return (this.baseURL || '') + u;
        }
      }
      return u;
    };

    const originalUrl = typeof url === 'string' ? url : ''
    const tryDirectToCloud = async () => {
      // 将相对路径或以 baseURL 开头的绝对地址，转换为云端直连地址
      if (!this.cloudBase) return null
      if (originalUrl.startsWith('/')) {
        return await doFetch(this.cloudBase + originalUrl, timeoutMs)
      }
      if (this.baseURL && originalUrl.startsWith(this.baseURL)) {
        const relative = originalUrl.slice(this.baseURL.length)
        return await doFetch(this.cloudBase + relative, timeoutMs)
      }
      return null
    }

    try {
      const target = resolveUrl(url);
      return await doFetch(target, timeoutMs);
    } catch (error) {
      const isTimeout = error?.name === 'AbortError' || /timeout|NetworkError|Failed to fetch/i.test(error?.message || '');

      // Fallback 1：如果是绝对地址并指向 baseURL，回退到相对路径（通过 Vite 代理）
      const canFallbackToProxy = typeof originalUrl === 'string' && this.baseURL && originalUrl.startsWith(this.baseURL);
      if (isTimeout && canFallbackToProxy) {
        const relativePath = originalUrl.replace(this.baseURL, '');
        try {
          return await doFetch(relativePath, timeoutMs);
        } catch (e2) {
          if (e2?.name === 'AbortError') {
            throw new Error('请求超时，请检查网络连接');
          }
          // 尝试直连云端
          try {
            const resp = await tryDirectToCloud()
            if (resp) return resp
          } catch (e3) {
            if (e3?.name === 'AbortError') throw new Error('请求超时，请检查网络连接')
            throw e3
          }
          throw e2;
        }
      }

      // Fallback 2：如果是相对路径（走代理）或其他情况，尝试直连云端
      if (isTimeout) {
        try {
          const resp = await tryDirectToCloud()
          if (resp) return resp
        } catch (e4) {
          if (e4?.name === 'AbortError') throw new Error('请求超时，请检查网络连接')
          throw e4
        }
      }

      if (error?.name === 'AbortError') {
        throw new Error('请求超时，请检查网络连接');
      }
      throw error;
    }
  }

  // 解析 Content-Disposition 文件名
  _parseDownloadFilename(resp, fallback) {
    try {
      const cd = resp.headers.get('Content-Disposition') || resp.headers.get('content-disposition') || ''
      const m1 = /filename\*?=([^;]+)/i.exec(cd)
      if (m1) {
        let v = decodeURIComponent(m1[1].replace(/^UTF-8''/i, '').trim().replace(/^"|"$/g, ''))
        return v || fallback
      }
      const m2 = /filename="?([^";]+)"?/i.exec(cd)
      if (m2) return m2[1]
    } catch (_) {}
    return fallback
  }

  // 将 Blob 触发浏览器下载
  _saveBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => window.URL.revokeObjectURL(url), 1000)
  }

  // 以 JSON 请求并期望返回 Blob（用于Word导出等）
  async postForBlob(url, payload, defaultName = 'document.bin', mime = 'application/octet-stream', timeoutMs = 120000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const target = getApiUrl(url)
      const resp = await fetch(target, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': mime,
        },
        body: JSON.stringify(payload || {}),
        signal: controller.signal,
      })
      if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`)
      const blob = await resp.blob()
      const name = this._parseDownloadFilename(resp, defaultName)
      return { blob, filename: name }
    } finally {
      clearTimeout(timer)
    }
  }

  // 以 JSON 请求并期望返回文本（用于报告 HTML）
  async postForText(url, payload, timeoutMs = 60000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const target = getApiUrl(url)
      const resp = await fetch(target, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/html, text/plain; q=0.9, */*; q=0.8',
        },
        body: JSON.stringify(payload || {}),
        signal: controller.signal,
      })
      if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`)
      return await resp.text()
    } finally {
      clearTimeout(timer)
    }
  }

  // 健康检查（短超时）
  async healthCheck() {
    try {
      const url = getApiUrl(API_CONFIG.ENDPOINTS.HEALTH);
      const response = await this.request(url, { timeout: 20000 });
      return response;
    } catch (error) {
      console.error('健康检查失败:', error);
      throw new Error('无法连接到服务器，可能处于冷启动，请稍后重试');
    }
  }

  // 审校文本（支持传入 options）（较长超时以兼容冷启动）
  async proofreadText(content, options = {}) {
    try {
      if (!content || content === '') {
        throw new Error('请输入要审校的文本内容');
      }

      const url = getApiUrl(API_CONFIG.ENDPOINTS.PROOFREAD);

      const isTransientError = (err) => {
        const msg = err?.message || '';
        if (err?.name === 'AbortError') return true; // 超时
        if (/请求超时/i.test(msg)) return true;
        if (/NetworkError|Failed to fetch/i.test(msg)) return true;
        const m = msg.match(/HTTP error! status: (\d+)/);
        if (m) {
          const code = parseInt(m[1], 10);
          if (code >= 500 && code < 600) return true; // 5xx 重试
        }
        return false;
      };

      const attemptOnce = async (timeoutMs) => {
        return await this.request(url, {
          method: 'POST',
          body: JSON.stringify({ content: content, options }),
          timeout: timeoutMs,
        });
      };

      // 重试策略：最多 3 次（1 次初次 + 2 次重试），退避 0.8s/1.6s
      const timeouts = [90000, 60000, 60000];
      const backoffs = [0, 800, 1600];

      let lastErr = null;
      for (let i = 0; i < timeouts.length; i++) {
        try {
          if (i > 0) {
            // 简单退避
            await new Promise((r) => setTimeout(r, backoffs[i]));
          }
          const resp = await attemptOnce(timeouts[i]);
          return resp;
        } catch (e) {
          lastErr = e;
          if (!isTransientError(e) || i === timeouts.length - 1) {
            throw e;
          }
          // 否则继续下一次重试
        }
      }

      // 理论上不会走到这里
      throw lastErr || new Error('审校请求失败');
    } catch (error) {
      console.error('审校请求失败:', error);
      throw new Error(error.message || '审校服务暂时不可用，请稍后重试');
    }
  }

  // 生成报告 HTML（前端预览）
  async getReportHtml(content, { issues = null, result = null, options = {}, title = '审校报告', author = '' } = {}) {
    if (!content || !content.trim()) throw new Error('请输入要审校的文本内容')
    const payload = { content: content.trim(), options, title, author }
    if (Array.isArray(issues)) payload.issues = issues
    if (result && typeof result === 'object') payload.result = result
    const html = await this.postForText(API_CONFIG.ENDPOINTS.REPORT_HTML, payload, 60000)
    return html
  }

  // 导出Word（下载结构化审校报告）
  async exportWordReport(content, { issues = null, result = null, title = '审校文档', author = '' } = {}) {
    if (!content || !content.trim()) throw new Error('请输入要导出的文档内容')
    const payload = { content: content.trim(), title, author }
    if (Array.isArray(issues)) payload.issues = issues
    if (result && typeof result === 'object') payload.result = result
    const { blob, filename } = await this.postForBlob(
      API_CONFIG.ENDPOINTS.EXPORT_WORD,
      payload,
      `${title || '审校文档'}.docx`,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      120000
    )
    this._saveBlob(blob, filename)
    return true
  }

  // 新增：导出纯文本内容为 Word（首页顶部“导出Word”使用）
  async exportWordPlain(content, { title = '文档', author = '' } = {}) {
    if (!content || !content.trim()) throw new Error('请输入要导出的文档内容')
    const payload = { content: content.trim(), title, author, mode: 'plain' }
    const { blob, filename } = await this.postForBlob(
      API_CONFIG.ENDPOINTS.EXPORT_WORD,
      payload,
      `${title || '文档'}.docx`,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      120000
    )
    this._saveBlob(blob, filename)
    return true
  }

  // ===== 兼容旧方法（保持签名，但内部走新实现） =====
  async exportToPDF(content, issues = []) {
    // 仍保留以免调用处报错；后端按钮已隐藏
    try {
      const url = getApiUrl(API_CONFIG.ENDPOINTS.EXPORT_PDF);
      const response = await this.request(url, {
        method: 'POST',
        body: JSON.stringify({ 
          content: String(content || '').trim(),
          issues: Array.isArray(issues) ? issues : []
        }),
      });

      return response;
    } catch (error) {
      console.error('PDF导出失败:', error);
      throw new Error('PDF导出失败，请稍后重试');
    }
  }

  async exportToWord(content, issues = []) {
    // 兼容旧入口：使用 issues（若有）导出
    return this.exportWordReport(content, { issues, title: '审校文档' })
  }

  async proofreadDocument(content, checkOptions = {}) {
    // 将前端的 checkOptions 映射为后端期望的 options 字段
    const options = {
      check_typos: !!checkOptions.grammar,
      check_grammar: !!checkOptions.grammar,
      check_punctuation: checkOptions.punctuation ?? true,
      check_sensitive: checkOptions.sensitive ?? true,
      qwen: checkOptions.llm ?? true,
    };
    return this.proofreadText(content, options);
  }

  async exportPDF(content, title = '文档', author = '') {
    // 如果后端将来需要 title/author，可在服务端支持；当前仅透传内容和 issues
    return this.exportToPDF(content, []);
  }

  async exportWord(content, title = '文档', author = '') {
    // 首页“导出Word”：导出编辑区纯文本内容为 Word（不包含问题结构化报告）
    return this.exportWordPlain(content, { title, author })
  }
}

// 创建单例实例
const apiService = new ApiService();

export default apiService;

