const SUBSCRIPTION_FORMATS = new Set(['v2ray', 'surge', 'clash', 'shadowsocks', 'nodes']);
const RESERVED_SEGMENTS = new Set(['api', 'version', 'assets']);

/** 是否为公开订阅 URL（/:path 或 /:path/:format），排除 index.html 等静态路径 */
function isSubscriptionRequestPath(urlPath) {
  const parts = String(urlPath || '').split('/').filter(Boolean);
  if (!parts.length || parts.length > 2) return false;

  const [name, format] = parts;
  if (RESERVED_SEGMENTS.has(name)) return false;
  if (name.includes('.')) return false;
  if (!format) return true;
  return SUBSCRIPTION_FORMATS.has(format);
}

module.exports = {
  isSubscriptionRequestPath,
};
