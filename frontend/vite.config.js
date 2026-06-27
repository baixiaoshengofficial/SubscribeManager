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
  const backendOrigin = env.VITE_BACKEND_ORIGIN || backendTarget;

  return {
    envDir,
    define: {
      'import.meta.env.VITE_BACKEND_ORIGIN': JSON.stringify(backendOrigin),
      'import.meta.env.VITE_BACKEND_PORT': JSON.stringify(String(BACKEND_PORT)),
    },
    plugins: [vue()],
    server: {
      port: FRONTEND_PORT,
      strictPort: true,
      proxy: {
        '/api': { target: backendTarget, changeOrigin: true },
        '/config': { target: backendTarget, changeOrigin: true },
        '/version': { target: backendTarget, changeOrigin: true },
      },
    },
  };
});
