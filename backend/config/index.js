const path = require('path');
// 源码部署：加载根目录 .env 的应用配置（不覆盖已存在的环境变量，如 CLI 传入的 BACKEND_PORT）。
// Docker 后端镜像无 .env 文件，dotenv 自动空转，变量由 compose env_file 注入。
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
const { BACKEND_PORT } = require('../../config/ports.cjs');

const config = {
  // Server configuration
  port: BACKEND_PORT,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Session configuration
  sessionSecret: process.env.SESSION_SECRET || 'subscribe-manager-secret-key-change-in-production',

  // Database path
  databasePath: process.env.DB_PATH || path.resolve(__dirname, '../../data/subscriptions.db'),

  // Subscription defaults
  defaultSubscriptionName: process.env.DEFAULT_SUBSCRIPTION_NAME || '默认订阅',

  // Credentials
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin',

  // Public backend URL for subscription links (optional; falls back to request Host)
  publicBaseUrl: process.env.PUBLIC_BASE_URL?.trim().replace(/\/$/, '') || null,

  // Language
  defaultLanguage: process.env.DEFAULT_LANGUAGE || 'zh-CN',

  // Security
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  corsOptions: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
};

module.exports = config;
