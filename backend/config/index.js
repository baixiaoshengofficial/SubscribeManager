const path = require('path');
const { BACKEND_PORT } = require('../../config/ports.cjs');

const config = {
  // Server configuration
  port: BACKEND_PORT,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Session configuration
  sessionSecret: process.env.SESSION_SECRET || 'subscribe-manager-secret-key-change-in-production',

  // Admin path
  adminPath: process.env.ADMIN_PATH || 'admin',

  // Database path
  databasePath: process.env.DB_PATH || path.resolve(__dirname, '../../data/subscriptions.db'),

  // Subscription defaults
  defaultSubscriptionName: process.env.DEFAULT_SUBSCRIPTION_NAME || '默认订阅',

  // Credentials
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin',

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
