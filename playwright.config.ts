import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './e2e', workers: 1, use: { baseURL: 'http://127.0.0.1:3210' }, webServer: { command: 'npm run build --prefix examples/app && npm run start --prefix examples/app', url: 'http://127.0.0.1:3210', timeout: 180000, reuseExistingServer: !process.env.CI } });
