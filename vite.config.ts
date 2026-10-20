import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// GitHub Pages 部署在 /ihomework/ 子路径下，由 CI 通过 VITE_BASE 传入；本地开发为 /
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    // 页面已按路由拆分。超过 500 kB 的只剩两块：首屏要用的拼音词典（pinyin-pro）和汉字字库数据（chars.json，约 716 kB）。
    // 二者都只下载一次，由 Service Worker 预缓存，之后从本机读取。
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
  },
})
