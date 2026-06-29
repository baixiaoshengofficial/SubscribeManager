/**
 * 订阅链接与管理页同域：origin + /path（Docker 下由 Nginx 反代到后端）。
 * 本地开发前后端不同端口时，指向 BACKEND_PORT。
 */
export function getSubscriptionOrigin() {
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  const port = import.meta.env.VITE_BACKEND_PORT;
  if (!port) {
    throw new Error('VITE_BACKEND_PORT is not set. Configure BACKEND_PORT in .env.');
  }
  return `${window.location.protocol}//${window.location.hostname}:${port}`;
}

export function getSubscriptionUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getSubscriptionOrigin()}${normalized}`;
}
