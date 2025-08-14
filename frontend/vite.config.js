import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // 开发环境代理配置（可选）
    proxy: {
      '/api': {
        target: 'https://intelligent-proofreader-api.onrender.com',
        changeOrigin: true,
        secure: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
  define: {
    // 环境变量
    __API_BASE_URL__: JSON.stringify('https://intelligent-proofreader-api.onrender.com'),
  }
})

