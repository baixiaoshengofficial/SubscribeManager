// 核心状态与初始化
let adminPath = 'admin';
const _t = (k, params) => {
  if (window.i18n && window.i18n.t) {
    const result = window.i18n.t(k, params);
    if (result !== undefined && result !== null) {
      return result;
    }
  }
  return k;
};
const THEME_KEY = 'preferredTheme';

function getSystemTheme() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  const toggle = document.getElementById('themeToggle');
  const icon = toggle ? toggle.querySelector('i') : null;
  if (icon) {
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }
  if (toggle) {
    toggle.setAttribute('title', theme === 'dark' ? _t('theme.to_light') : _t('theme.to_dark'));
  }
}

function initializeTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  const theme = stored || getSystemTheme();
  applyTheme(theme);

  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const nextTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, nextTheme);
      applyTheme(nextTheme);
    });
  }
}

async function logout() {
  window.location.href = '/' + adminPath + '/auth/logout';
}

async function initializeApp() {
  // 初始化多语言支持
  window.i18n && window.i18n.init && window.i18n.init();
  initializeTheme();

  try {
    // 2. 使用 await 等待 fetch 请求完成
    const response = await fetch('/config');
    if (!response.ok) {
      // 如果请求失败，可以抛出错误或使用默认值
      console.error('Failed to load config, using default admin path.');
    } else {
      const config = await response.json();
      // 3. 成功获取配置后，更新 adminPath
      adminPath = config.ADMIN_PATH || 'admin';
    }
  } catch (error) {
    console.error('Error fetching config:', error);
    // 出错时，依然可以使用默认的 adminPath
  }

  const configLink = document.querySelector('[data-config-manager-link]')
    || document.querySelector('a.nav-link[href$="/config-manager"]');
  if (configLink) {
    configLink.setAttribute('href', `/${adminPath}/config-manager`);
  }

  // 4. 确保在 adminPath 设置完成后，再加载订阅列表
  await loadSubscriptions();
}

// DOM 内容加载完成后，加载订阅列表
window.addEventListener('DOMContentLoaded', initializeApp);
