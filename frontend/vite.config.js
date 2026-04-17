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
    // 代码分割优化
    rollupOptions: {
      output: {
        manualChunks: {
          // 第三方库独立打包
          'element-plus': ['element-plus', '@element-plus/icons-vue'],
          'video': ['vue-video-player', 'plyr', 'video.js'],
          'vue-vendor': ['vue', 'vue-router', 'axios'],
        },
        // 更短的文件名哈希
        entryFileNames: 'assets/js/[name]-[hash].js',
        chunkFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    // 启用 gzip 压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
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
