import { defineConfig, devices } from '@playwright/test';

const backendPort = Number(process.env.E2E_BACKEND_PORT || 5510);
const frontendPort = Number(process.env.E2E_FRONTEND_PORT || 5511);
const backendUrl = `http://127.0.0.1:${backendPort}`;
const frontendUrl = `http://127.0.0.1:${frontendPort}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalTeardown: './e2e/global-teardown.js',
  use: {
    baseURL: frontendUrl,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: [
        'rm -f ../data/e2e-playwright.db ../data/e2e-playwright.db-journal',
        `cd ../backend && BACKEND_PORT=${backendPort} FRONTEND_PORT=${frontendPort} ADMIN_USERNAME=admin ADMIN_PASSWORD=admin SESSION_SECRET=e2e-playwright DB_PATH=../data/e2e-playwright.db npm start`,
      ].join(' && '),
      url: `${backendUrl}/version`,
      timeout: 30_000,
      reuseExistingServer: false,
    },
    {
      command: `BACKEND_PORT=${backendPort} FRONTEND_PORT=${frontendPort} VITE_BACKEND_TARGET=${backendUrl} npm run dev -- --host 127.0.0.1 --port ${frontendPort} --strictPort`,
      url: frontendUrl,
      timeout: 30_000,
      reuseExistingServer: false,
    },
  ],
});
