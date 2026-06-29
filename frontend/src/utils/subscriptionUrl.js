/**
 * 订阅链接始终为当前页面 origin + path。
 * Docker / 生产由 Nginx 反代订阅路径；本地 dev 由 Vite 反代。
 */
export function getSubscriptionOrigin() {
  return window.location.origin;
}

export function getSubscriptionUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getSubscriptionOrigin()}${normalized}`;
}
