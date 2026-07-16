import { ref } from 'vue';

const STORAGE_KEY = 'app.theme';
export const theme = ref(localStorage.getItem(STORAGE_KEY) || 'light');

export function applyTheme(value) {
  const html = document.documentElement;
  const body = document.body;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (value === 'dark') {
    html.classList.add('dark');
    body.setAttribute('data-theme', 'dark');
    if (meta) meta.setAttribute('content', '#111615');
  } else {
    html.classList.remove('dark');
    body.setAttribute('data-theme', 'light');
    if (meta) meta.setAttribute('content', '#f6f8f7');
  }
}

export function setTheme(value) {
  theme.value = value;
  localStorage.setItem(STORAGE_KEY, value);
  applyTheme(value);
}

export function toggleTheme() {
  setTheme(theme.value === 'dark' ? 'light' : 'dark');
}

applyTheme(theme.value);
