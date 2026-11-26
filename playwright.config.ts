import { defineConfig, devices } from '@playwright/test';

// Set PW_WEBKIT_PATH to a WebKit launcher when the bundled one lacks system libraries (see CONTRIBUTING.md).
const webkitPath = process.env.PW_WEBKIT_PATH;
const port = process.env.PW_PORT ?? '4317';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'off',
  },
  webServer: {
    command: 'node scripts/serve.mjs',
    env: { PORT: port },
    url: `http://127.0.0.1:${port}/tests/fixture.html`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], ...(webkitPath ? { launchOptions: { executablePath: webkitPath } } : {}) },
    },
  ],
});
