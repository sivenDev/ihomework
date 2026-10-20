import { defineConfig } from '@playwright/test'

// 参考设备：安卓平板横屏（1280×800），触控、移动端浏览器
const tablet = {
  browserName: 'chromium' as const,
  viewport: { width: 1280, height: 800 },
  isMobile: true,
  hasTouch: true,
  locale: 'zh-CN',
  // 允许测试中的模拟麦克风（Web Audio）无需手势即可开始
  launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
  userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
}

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'android-tablet',
      testIgnore: /offline\.spec\.ts/,
      use: { ...tablet, baseURL: 'http://localhost:5174' },
    },
    // 离线与安装：用和线上相同的 /ihomework/ 子路径做正式构建（含 Service Worker），输出到单独的目录，不影响要部署的 dist
    {
      name: 'offline',
      testMatch: /offline\.spec\.ts/,
      use: { ...tablet, baseURL: 'http://localhost:5175/ihomework/', serviceWorkers: 'allow' },
    },
  ],
  webServer: [
    {
      command: 'npm run data:strokes && npx vite --port 5174 --strictPort',
      url: 'http://localhost:5174',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run build:e2e && VITE_BASE=/ihomework/ npx vite preview --outDir dist-e2e --port 5175 --strictPort',
      url: 'http://localhost:5175/ihomework/',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
})
