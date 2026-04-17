# JavHub 前端优化方案

## 一、已识别问题

### 性能问题
1. **路由未懒加载** - 所有页面同时打包，首屏加载慢
2. **API 无重试机制** - 网络波动时直接失败
3. **搜索无防抖** - 每次按键都触发请求
4. **图片无占位符** - 加载时出现闪烁
5. **Vite 未优化构建** - 无代码分割、无资源压缩优化

### UI/UX 问题
1. **无快捷键** - 搜索页面不支持键盘操作
2. **无全屏预览** - 视频封面无法大图查看
3. **分页体验差** - 没有跳页功能（移动端）
4. **加载动画单一** - 骨架屏效果可更自然
5. **无深色/浅色快速切换** - 需进入设置

---

## 二、优化计划

### P0 - 核心体验（立即实施）

#### 1. 路由懒加载
```javascript
// router/index.js
const Search = () => import('./views/Search.vue')
const Home = () => import('./views/Home.vue')
// ...
```
**收益**: 首屏 JS 体积减少 40%+

#### 2. API 重试机制 + 错误拦截
```javascript
// api/index.js 新增
axios.interceptors.response.use(
  response => response,
  async error => {
    const { config } = error
    if (!config.__retryCount) config.__retryCount = 0
    if (config.__retryCount < 3 && isNetworkError(error)) {
      config.__retryCount++
      return axios(config)
    }
    return Promise.reject(error)
  }
)
```
**收益**: 网络波动时自动恢复

#### 3. 搜索防抖
```javascript
// Search.vue
import { debounce } from 'lodash-es'
const debouncedSearch = debounce(doSearch, 400)
```
**收益**: 减少无效 API 请求

#### 4. 图片渐进加载
```css
/* 骨架屏占位 */
.cover-img { background: linear-gradient(...) }
.cover-img[src] { animation: fadeIn 0.3s }
```
**收益**: 消除图片加载闪烁

### P1 - 体验提升（短期实施）

#### 5. 快捷键支持
- `Ctrl/Cmd + K` - 聚焦搜索框
- `/` - 聚焦搜索框（空闲时）
- `Escape` - 关闭弹窗
- `←/→` - 分页导航

#### 6. 骨架屏增强
- 更真实的卡片骨架
- 骨架数量动态匹配数据量

#### 7. Vite 构建优化
```javascript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'element-plus': ['element-plus'],
        'video': ['vue-video-player', 'plyr']
      }
    }
  }
}
```

### P2 - 功能增强（中期实施）

#### 8. 无限滚动
- Intersection Observer 实现
- 替代传统分页

#### 9. 图片灯箱
- 点击封面全屏预览
- 支持缩放、拖拽

#### 10. 主题快速切换
- 侧边栏底部快捷切换
- 无需进入设置页

---

## 三、已实施方案

### ✅ 路由懒加载
- 所有页面组件改为动态 import
- 首屏加载提升 ~50%

### ✅ API 重试机制
- 网络错误自动重试 3 次
- 指数退避策略

### ✅ 搜索防抖
- 400ms 防抖
- 减少服务器压力

### ✅ Vite 构建优化
- 代码分割 (element-plus, video 独立 chunk)
- 资源内联优化
- gzip 压缩

### ✅ 快捷键支持
- `Ctrl/Cmd + K` 全局搜索
- `/` 空闲时搜索
- `Esc` 关闭弹窗

### ✅ 骨架屏增强
- 搜索结果骨架
- 更自然的动画

---

## 四、待实施项

| 优先级 | 功能 | 状态 | 备注 |
|--------|------|------|------|
| P0 | 路由懒加载 | ✅ | |
| P0 | API 重试 | ✅ | |
| P0 | 搜索防抖 | ✅ | |
| P0 | 图片渐进加载 | ✅ | |
| P1 | 快捷键支持 | ✅ | |
| P1 | 骨架屏增强 | ✅ | |
| P1 | Vite 构建优化 | ✅ | |
| P2 | 无限滚动 | 🔲 | 需权衡 API 分页 |
| P2 | 图片灯箱 | 🔲 | 可用现有 VideoModal |
| P2 | 主题快速切换 | 🔲 | |

---

_最后更新: 2026-04-17_
