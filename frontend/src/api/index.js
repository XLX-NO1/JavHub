import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
})

// ==============================================
// API 重试拦截器
// 网络错误自动重试，最多 3 次，指数退避
// ==============================================
const MAX_RETRIES = 3
const RETRY_DELAY_BASE = 1000 // 基础延迟 1s

function isNetworkError(error) {
  return !error.response && (error.code === 'ECONNABORTED' || error.message.includes('Network') || !error.response)
}

api.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config
    
    // 如果没有 config 或已经重试过，抛出错误
    if (!config || config.__retryCount >= MAX_RETRIES) {
      return Promise.reject(error)
    }
    
    // 只有网络错误才重试
    if (!isNetworkError(error)) {
      return Promise.reject(error)
    }
    
    // 标记重试次数
    config.__retryCount = (config.__retryCount || 0) + 1
    
    // 指数退避延迟
    const delay = RETRY_DELAY_BASE * Math.pow(2, config.__retryCount - 1)
    
    console.log(`[API] 请求失败，${delay}ms 后重试 (${config.__retryCount}/${MAX_RETRIES}): ${config.url}`)
    
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(api(config))
      }, delay)
    })
  }
)

// ==============================================
// 请求去重
// 防止同一请求在pending时重复发起
// ==============================================
const pendingRequests = new Map()

api.interceptors.request.use(config => {
  const key = `${config.method}:${config.url}:${JSON.stringify(config.params || {})}`
  
  if (pendingRequests.has(key)) {
    const cancel = pendingRequests.get(key)
    cancel('请求已取消')
    pendingRequests.delete(key)
  }
  
  config.cancelToken = new axios.CancelToken(cancel => {
    pendingRequests.set(key, cancel)
  })
  
  return config
})

api.interceptors.response.use(
  response => {
    const key = `${response.config.method}:${response.config.url}:${JSON.stringify(response.config.params || {})}`
    pendingRequests.delete(key)
    return response
  },
  error => {
    if (axios.isCancel(error)) {
      return Promise.reject(error)
    }
    return Promise.reject(error)
  }
)

// ==============================================
// 全局缓存：题材统计数据（启动时拉取，所有页面共享）
// ==============================================
const STATS_CACHE_KEY = 'javhub_category_stats'
const STATS_TTL_MS = 60 * 60 * 1000  // 1小时过期

let _cachedStats = null

/**
 * 获取题材统计（含影片数量）
 * 优先从内存缓存返回，避免重复请求
 * forceRefresh=true 时强制从 API 重新拉取
 */
async function getCategoryStats(forceRefresh = false) {
  if (!forceRefresh && _cachedStats) {
    return _cachedStats
  }
  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem(STATS_CACHE_KEY)
      if (cached) {
        const { data, ts } = JSON.parse(cached)
        if (Date.now() - ts < STATS_TTL_MS) {
          _cachedStats = data
          return data
        }
      }
    } catch {}
  }
  try {
    const resp = await api.get('/v1/categories/stats')
    const data = Array.isArray(resp.data) ? resp.data : (resp.data || [])
    _cachedStats = data
    try {
      localStorage.setItem(STATS_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
    } catch {}
    return data
  } catch (e) {
    console.error('Failed to fetch category stats:', e)
    return []
  }
}

export default {
  // ==============================================
  // 共享 stats 缓存（async，内存+localStorage 双缓存）
  // ==============================================
  getCategoryStats,

  // ========== 视频搜索 & 详情 (JavInfoApi) ==========

  searchVideos(params = {}) {
    return api.get('/v1/videos/search', { params })
  },

  listVideos(page = 1, page_size = 20) {
    return api.get('/v1/videos', { params: { page, page_size } })
  },

  getVideo(contentId) {
    return api.get(`/v1/videos/${contentId}`)
  },

  // ========== 演员 ==========

  listActresses(page = 1, page_size = 20) {
    return api.get('/v1/actresses', { params: { page, page_size } })
  },

  getActress(actressId) {
    return api.get(`/v1/actresses/${actressId}`)
  },

  getActressVideos(actressId, page = 1, page_size = 20) {
    return api.get(`/v1/actresses/${actressId}/videos`, { params: { page, page_size } })
  },

  // ========== 枚举数据 ==========

  listMakers() {
    return api.get('/v1/makers')
  },

  listSeries() {
    return api.get('/v1/series')
  },

  listCategories() {
    return api.get('/v1/categories')
  },

  listLabels() {
    return api.get('/v1/labels')
  },


  // ========== 下载管理 ==========

  getDownloads() {
    return api.get('/v1/downloads')
  },

  createDownload(data) {
    return api.post('/v1/downloads', data)
  },

  deleteDownload(taskId) {
    return api.delete(`/v1/downloads/${taskId}`)
  },

  // ========== 订阅管理 ==========

  getSubscriptions() {
    return api.get('/v1/subscriptions')
  },

  addSubscription(data) {
    return api.post('/v1/subscriptions', data)
  },

  deleteSubscription(id) {
    return api.delete(`/v1/subscriptions/${id}`)
  },

  checkSubscriptions() {
    return api.post('/v1/subscriptions/check')
  },

  // ========== 缺失检测 ==========

  getMissingActresses() {
    return api.get('/v1/missing/actresses')
  },

  getMissingActressDetail(actressId) {
    return api.get(`/v1/missing/actresses/${actressId}`)
  },

  refreshMissingCache() {
    return api.post('/v1/missing/actresses/refresh')
  },

  // ========== 去重 ==========

  getDuplicates() {
    return api.get('/v1/duplicates')
  },

  deleteDuplicate(embyItemId) {
    return api.post(`/v1/duplicates/${embyItemId}/delete`)
  },

  ignoreDuplicate(embyItemId) {
    return api.post(`/v1/duplicates/${embyItemId}/ignore`)
  },

  // ========== 日志 ==========

  getLogs(limit = 100, level = '') {
    return api.get('/v1/logs', { params: { limit, level } })
  },

  // ========== 配置 ==========

  getConfig() {
    return api.get('/v1/config')
  },

  updateConfig(config) {
    return api.put('/v1/config', config)
  },

  testTelegramBot(token) {
    return api.post('/v1/notification/telegram/test', null, { params: { token } })
  },

  purgeCache(scope = 'video') {
    return api.post('/v1/cache/purge', null, { params: { scope } })
  },

  // ========== 图片代理 ==========

  proxyImage(url) {
    return `/api/proxy/image?url=${encodeURIComponent(url)}`
  },

  // ========== 翻译映射 ==========

  exportTranslations(type) {
    return api.get(`/v1/translations/export/${type}`, { responseType: 'blob' })
  },

  importTranslations(type, file) {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/v1/translations/import/${type}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  getTranslationStats() {
    return api.get('/v1/translations/stats')
  },

  // ========== 健康检查 ==========

  health() {
    return api.get('/health')
  }
}
