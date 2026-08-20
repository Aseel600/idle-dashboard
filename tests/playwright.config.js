import { defineConfig, devices } from '@playwright/test';

/**
 * The app is a static site with no build step, so the web server is just a file
 * server pointed at the repo root. `?preview=1` is appended by the fixtures rather
 * than here, because maintenance mode is a real switch that must stay testable.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './.artifacts',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: './.report', open: 'never' }],
    ['json', { outputFile: './.artifacts/results.json' }]
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // The clock, prayer times and Hijri conversion are all timezone-sensitive.
    // Pin it so a suite run in Riyadh matches a suite run in CI.
    timezoneId: 'Asia/Riyadh',
    locale: 'en-US',
    permissions: []
  },

  webServer: {
    command: 'npx --yes serve .. -l 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }
    },
    {
      // 2K WQXGA, the "extreme" desktop case from the brief.
      name: 'chromium-wqxga',
      use: { ...devices['Desktop Chrome'], viewport: { width: 2560, height: 1600 }, deviceScaleFactor: 2 }
    },
    {
      // Ultrawide dual-monitor-ish canvas - catches centring and fixed-position bugs.
      name: 'chromium-ultrawide',
      use: { ...devices['Desktop Chrome'], viewport: { width: 3440, height: 1440 } }
    },
    {
      name: 'firefox-desktop',
      use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } }
    },
    {
      name: 'webkit-desktop',
      use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } }
    },
    {
      name: 'tablet',
      use: { ...devices['iPad (gen 7) landscape'] }
    },
    {
      name: 'phone',
      use: { ...devices['iPhone 13'] }
    },
    {
      // TV layout: large viewport, coarse pointer, no hover. The app has a real
      // data-layout="tv" mode with 52px focus targets and a QR pairing block.
      name: 'tv',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        hasTouch: false,
        isMobile: false
      }
    },
    {
      name: 'rtl-arabic',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, locale: 'ar-SA' }
    }
  ]
});
