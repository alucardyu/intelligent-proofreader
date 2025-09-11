import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwind()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    // 开发环境代理配置（可选）
    // 可通过环境变量 VITE_LOCAL_BACKEND=true 切换到本地后端
    proxy: {
      '/api': {
        target: process.env.VITE_LOCAL_BACKEND === 'true' 
          ? (process.env.VITE_LOCAL_BACKEND_URL || 'http://localhost:5000')
          : 'https://intelligent-proofreader-api.onrender.com',
        changeOrigin: true,
        // 在开发环境放宽 HTTPS 证书校验，避免部分环境下出现 SSL 协议错误
        secure: false,
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

