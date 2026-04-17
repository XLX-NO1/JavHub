import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:18080',
        changeOrigin: true
      }
    }
  },
  build: {
    // 代码分割优化 - 使用函数形式兼容 Vite 8 / Rolldown
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('element-plus')) {
              return 'element-plus'
            }
            if (id.includes('vue-video-player') || id.includes('plyr') || id.includes('video.js')) {
              return 'video'
            }
            if (id.includes('vue') || id.includes('vue-router') || id.includes('axios')) {
              return 'vue-vendor'
            }
          }
        },
        // 更短的文件名哈希
        entryFileNames: 'assets/js/[name]-[hash].js',
        chunkFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    // 生成 sourcemap（生产环境可关闭）
    sourcemap: false,
    // 分块大小警告阈值
    chunkSizeWarningLimit: 1000
  },
  // 路径别名
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  // 优化依赖
  optimizeDeps: {
    include: ['vue', 'vue-router', 'axios', 'element-plus']
  }
})
