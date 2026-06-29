import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const rootDir = path.resolve(__dirname, '..');
const { BACKEND_PORT, FRONTEND_PORT } = require('../config/ports.cjs');

export default defineConfig(({ mode }) => {
  const envDir = rootDir;
  const env = { ...process.env };
  const backendTarget = env.VITE_BACKEND_TARGET || `http://localhost:${BACKEND_PORT}`;

  return {
    envDir,
    plugins: [vue()],
    server: {
      port: FRONTEND_PORT,
      strictPort: true,
      proxy: {
        '/api': { target: backendTarget, changeOrigin: true },
        '/version': { target: backendTarget, changeOrigin: true },
        '^/(?!api(?:/|$)|version(?:/|$)|assets(?:/|$)|index\\.html$)[^/]+(?:/(?:v2ray|surge|clash|shadowsocks|nodes))?$': {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
