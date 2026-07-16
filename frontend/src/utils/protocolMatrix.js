// 协议支持矩阵数据（与 backend/config/clientProfiles.js 一致）

export const CLIENT_PROTOCOL_SUPPORT = {
  clash: ['ss://', 'ssr://', 'vmess://', 'vless://', 'trojan://', 'anytls://', 'socks://', 'hysteria2://', 'hy2://', 'tuic://'],
  surge: ['ss://', 'vmess://', 'trojan://', 'anytls://', 'socks://', 'hysteria2://', 'hy2://', 'tuic://', 'snell://'],
  shadowsocks: ['ss://', 'ssr://'],
  universal: ['ss://', 'ssr://', 'vmess://', 'vless://', 'trojan://', 'anytls://', 'socks://', 'hysteria2://', 'hy2://', 'tuic://', 'snell://']
};

export const CLIENT_ORDER = ['clash', 'surge', 'shadowsocks', 'universal'];

export const PROTOCOL_LABELS = {
  'ss://': 'Shadowsocks',
  'ssr://': 'ShadowsocksR',
  'vmess://': 'VMess',
  'vless://': 'VLESS',
  'trojan://': 'Trojan',
  'anytls://': 'AnyTLS',
  'socks://': 'SOCKS',
  'hysteria2://': 'Hysteria2',
  'hy2://': 'HY2',
  'tuic://': 'TUIC',
  'snell://': 'Snell'
};

export function getAllProtocols() {
  const set = new Set();
  Object.values(CLIENT_PROTOCOL_SUPPORT).forEach((arr) => arr.forEach((p) => set.add(p)));
  return Array.from(set);
}

export function buildMatrix() {
  const protocols = getAllProtocols();
  return protocols.map((protocol) => {
    const row = { protocol, label: PROTOCOL_LABELS[protocol] || protocol };
    CLIENT_ORDER.forEach((client) => {
      row[client] = CLIENT_PROTOCOL_SUPPORT[client].includes(protocol);
    });
    return row;
  });
}
