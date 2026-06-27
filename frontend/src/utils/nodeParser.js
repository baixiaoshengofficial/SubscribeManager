// 前端节点链接解析工具

const NODE_TYPES = {
  SS: 'ss://',
  VMESS: 'vmess://',
  TROJAN: 'trojan://',
  VLESS: 'vless://',
  SOCKS: 'socks://',
  SOCKS5: 'socks5://',
  HYSTERIA2: 'hysteria2://',
  HY2: 'hy2://',
  TUIC: 'tuic://',
  SNELL: 'snell,'
};

export function isValidNodeLink(link) {
  if (!link) return false;
  const lowerLink = link.toLowerCase();
  if (lowerLink.includes('=') && lowerLink.includes('snell,')) {
    const parts = link.split('=')[1]?.trim().split(',');
    return parts && parts.length >= 4 && parts[0].trim() === 'snell';
  }
  return Object.values(NODE_TYPES).some((prefix) => lowerLink.startsWith(prefix));
}

export function getNodeType(link) {
  const lowerLink = (link || '').toLowerCase();
  if (lowerLink.includes('=') && lowerLink.includes('snell,')) return 'snell';
  const entry = Object.entries(NODE_TYPES).find(([, prefix]) => lowerLink.startsWith(prefix));
  return entry ? entry[0].toLowerCase() : '';
}

export function safeBase64Decode(str) {
  if (!str) return '';
  const normalized = String(str)
    .replace(/\s+/g, '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  try {
    return atob(normalized + padding);
  } catch {
    return '';
  }
}

export function extractNodeName(nodeLink) {
  if (!nodeLink) return 'Unnamed Node';

  if (nodeLink.includes('snell,')) {
    const name = nodeLink.split('=')[0].trim();
    return name || 'Unnamed Node';
  }

  if (nodeLink.toLowerCase().startsWith('vmess://')) {
    try {
      const config = JSON.parse(safeBase64Decode(nodeLink.substring(8)));
      if (config.ps) return config.ps;
    } catch {}
    return 'Unnamed Node';
  }

  const hashIndex = nodeLink.indexOf('#');
  if (hashIndex !== -1) {
    try {
      return decodeURIComponent(nodeLink.substring(hashIndex + 1));
    } catch {
      return nodeLink.substring(hashIndex + 1) || 'Unnamed Node';
    }
  }
  return 'Unnamed Node';
}

// 将多行/含 base64 的内容解析为节点数组
export function parseNodeContent(rawContent, fallbackName) {
  const lines = String(rawContent || '').split(/\r?\n/);
  const validNodes = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const decoded = safeBase64Decode(trimmed);
      if (decoded) {
        const decodedLines = decoded.split(/\r?\n/);
        for (const decodedLine of decodedLines) {
          const dl = decodedLine.trim();
          if (dl && isValidNodeLink(dl)) {
            validNodes.push({ name: fallbackName || extractNodeName(dl), content: dl });
          }
        }
        continue;
      }
    } catch {}

    if (isValidNodeLink(trimmed)) {
      validNodes.push({ name: fallbackName || extractNodeName(trimmed), content: trimmed });
    }
  }

  return validNodes;
}
