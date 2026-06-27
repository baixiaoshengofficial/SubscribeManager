/**
 * 订阅链接应始终指向后端（提供节点内容），而非 Vite 开发服务器。
 * 生产环境前后端同域时回退为当前 origin。
 */
export function getSubscriptionOrigin() {
  const configured = import.meta.env.VITE_BACKEND_ORIGIN;
  if (configured) {
    return configured.replace(/\/$/, '');
  }
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  const port = import.meta.env.VITE_BACKEND_PORT || '3000';
  return `${window.location.protocol}//${window.location.hostname}:${port}`;
}

export function getSubscriptionUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getSubscriptionOrigin()}${normalized}`;
}
