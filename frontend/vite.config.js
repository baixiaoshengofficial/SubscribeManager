import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  // 从项目根目录读取 .env（与后端共享同一份配置）
  const rootDir = path.resolve(__dirname, '..');
  const env = loadEnv(mode, rootDir, '');

  const backendPort = env.PORT || '3000';
  const backendTarget = env.VITE_BACKEND_TARGET || `http://localhost:${backendPort}`;
  const backendOrigin = env.VITE_BACKEND_ORIGIN || backendTarget;

  return {
    envDir: rootDir,
    define: {
      'import.meta.env.VITE_BACKEND_ORIGIN': JSON.stringify(backendOrigin),
      'import.meta.env.VITE_BACKEND_PORT': JSON.stringify(backendPort),
    },
    plugins: [vue()],
    server: {
      port: parseInt(env.FRONTEND_PORT || '5173', 10),
      strictPort: true,
      proxy: {
        '/api': { target: backendTarget, changeOrigin: true },
        '/config': { target: backendTarget, changeOrigin: true },
        '/version': { target: backendTarget, changeOrigin: true }
      }
    }
  };
});
