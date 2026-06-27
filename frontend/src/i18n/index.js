import { createI18n } from 'vue-i18n';
import zhCN from './zh-CN.json';
import en from './en.json';

const STORAGE_KEY = 'app.lang';

export const availableLocales = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en', label: 'English' }
];

function detectLocale() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && (saved === 'zh-CN' || saved === 'en')) return saved;

  const navLang = navigator.language || 'zh-CN';
  if (navLang.startsWith('zh')) return 'zh-CN';
  return 'en';
}

const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages: {
    'zh-CN': zhCN,
    en
  }
});

export function setLocale(locale) {
  i18n.global.locale.value = locale;
  localStorage.setItem(STORAGE_KEY, locale);
  document.documentElement.lang = locale;
}

export function getLocale() {
  return i18n.global.locale.value;
}

document.documentElement.lang = i18n.global.locale.value;

export default i18n;
