const STORAGE_KEY = 'sm.credentials';

/**
 * 存储最近一次成功登录的账号密码。
 * 浏览器没有原生行为时（JS fetch + preventDefault），作兜底填充策略。
 * 键按当前 origin 分组，http://localhost 与 http://10.0.x.x 互不影响。
 */
function originKey() {
  return `${STORAGE_KEY}:${window.location.origin}`;
}

export function loadRememberedCredentials() {
  try {
    const raw = localStorage.getItem(originKey());
    if (!raw) return { username: '', password: '' };
    const parsed = JSON.parse(raw);
    return {
      username: typeof parsed?.username === 'string' ? parsed.username : '',
      password: typeof parsed?.password === 'string' ? parsed.password : ''
    };
  } catch {
    return { username: '', password: '' };
  }
}

export function saveRememberedCredentials(creds = {}) {
  try {
    localStorage.setItem(
      originKey(),
      JSON.stringify({ username: creds.username || '', password: creds.password || '' })
    );
  } catch {
    /* quota / private mode – ignore */
  }
}

export function clearRememberedCredentials() {
  try {
    localStorage.removeItem(originKey());
  } catch {
    /* ignore */
  }
}
