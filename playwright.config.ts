import { defineConfig } from '@playwright/test'

// 参考设备：安卓平板横屏（1280×800），触控、移动端浏览器
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'android-tablet',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 800 },
        isMobile: true,
        hasTouch: true,
        locale: 'zh-CN',
        // 允许测试中的模拟麦克风（Web Audio）无需手势即可开始
        launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
        userAgent:
          'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      },
    },
  ],
  webServer: {
    command: 'npm run data:strokes && npx vite --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
  },
})
