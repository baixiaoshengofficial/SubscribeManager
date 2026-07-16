const { safeBase64Decode, safeDecodeURIComponent } = require('../helpers');
const { NODE_TYPES } = require('../constants');

/**
 * 提取节点名称
 * @param {string} nodeLink 节点链接
 * @returns {string} 节点名称
 */
function extractNodeName(nodeLink) {
  if (!nodeLink) return '未命名节点';

  // 处理snell节点
  if (nodeLink.includes(NODE_TYPES.SNELL)) {
    const name = nodeLink.split('=')[0].trim();
    return name || '未命名节点';
  }

  // 处理 VMess 链接
  if (nodeLink.toLowerCase().startsWith(NODE_TYPES.VMESS)) {
    try {
      const config = JSON.parse(safeBase64Decode(nodeLink.substring(8)));
      if (config.ps) {
        return config.ps;
      }
    } catch { }
    return '未命名节点';
  }

  // 处理其他使用哈希标记名称的链接类型
  const hashIndex = nodeLink.indexOf('#');
  if (hashIndex !== -1) {
    try {
      return decodeURIComponent(nodeLink.substring(hashIndex + 1));
    } catch {
      return nodeLink.substring(hashIndex + 1) || '未命名节点';
    }
  }
  return '未命名节点';
}

/**
 * 将节点名称写回原始链接。
 * VMess 使用 Base64 JSON 内的 ps 字段，Snell 使用等号前的名称，其他协议使用 URL fragment。
 * @param {string} nodeLink 节点链接
 * @param {string} name 节点名称
 * @returns {string} 写入名称后的节点链接
 */
function setNodeName(nodeLink, name) {
  const normalizedName = String(name || '').trim();
  if (!nodeLink || !normalizedName) return nodeLink;

  if (nodeLink.toLowerCase().startsWith(NODE_TYPES.VMESS)) {
    try {
      const prefix = nodeLink.substring(0, 8);
      const encodedConfig = nodeLink.substring(8);
      const config = JSON.parse(safeBase64Decode(encodedConfig));
      config.ps = normalizedName;

      let updatedConfig = Buffer.from(JSON.stringify(config)).toString('base64');
      if (encodedConfig.includes('-') || encodedConfig.includes('_')) {
        updatedConfig = updatedConfig
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
      }
      return `${prefix}${updatedConfig}`;
    } catch {
      return nodeLink;
    }
  }

  if (nodeLink.toLowerCase().includes('=snell,')) {
    const separatorIndex = nodeLink.indexOf('=');
    return `${normalizedName}${nodeLink.substring(separatorIndex)}`;
  }

  const hashIndex = nodeLink.indexOf('#');
  const linkWithoutName = hashIndex === -1 ? nodeLink : nodeLink.substring(0, hashIndex);
  return `${linkWithoutName}#${encodeURIComponent(normalizedName)}`;
}

/**
 * 验证节点链接格式
 * @param {string} link 节点链接
 * @returns {boolean} 是否为有效链接
 */
function isValidNodeLink(link) {
  if (!link || typeof link !== 'string') {
    return false;
  }

  const trimmedLink = link.trim();
  const lowerLink = trimmedLink.toLowerCase();

  // 检查snell格式
  if (lowerLink.includes('=') && lowerLink.includes('snell,')) {
    return true;
  }

  // 检查标准协议前缀
  return Object.values(NODE_TYPES)
    .filter(prefix => prefix !== NODE_TYPES.SNELL)
    .some(prefix => lowerLink.startsWith(prefix.toLowerCase()));
}

/**
 * 获取节点协议类型
 * @param {string} link 节点链接
 * @returns {string} 协议类型
 */
function getNodeType(link) {
  const lowerLink = link.toLowerCase();

  // 检查snell格式（特殊处理）
  if (lowerLink.includes('=') && lowerLink.includes('snell,')) {
    return 'snell';
  }

  // 检查标准协议前缀
  for (const [type, prefix] of Object.entries(NODE_TYPES)) {
    if (lowerLink.startsWith(prefix.toLowerCase())) {
      return type.toLowerCase();
    }
  }

  return 'unknown';
}

/**
 * 尝试Base64解码节点内容
 * @param {string} content 节点内容
 * @returns {string} 解码后的内容
 */
function tryDecodeNodeContent(content) {
  if (!content) return content;

  try {
    const decodedContent = safeBase64Decode(content);
    
    // 检查解码后是否是有效的节点链接
    if (isValidNodeLink(decodedContent) && 
        !content.toLowerCase().startsWith('vmess://')) { // VMess 本身就是base64编码，不需要再解码
      return decodedContent.trim();
    }
  } catch (e) {
    // 解码失败，返回原内容
  }

  return content.trim();
}

/**
 * 清理和标准化节点链接
 * @param {string} link 节点链接
 * @returns {string} 清理后的链接
 */
function cleanNodeLink(link) {
  if (!link) return '';

  // 先进行 URL 解码，处理 %3A 等编码符号
  let decodedLink = safeDecodeURIComponent(link);

  return decodedLink
    .replace(/[\r\n\s]+$/, '') // 移除尾部的换行和空格
    .trim();
}

/**
 * 将多行节点内容解析为节点链接数组。
 * @param {string} content 节点内容
 * @returns {string[]} 节点链接数组
 */
function parseNodeContent(content) {
  if (!content || typeof content !== 'string') {
    return [];
  }

  return content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}

module.exports = {
  extractNodeName,
  setNodeName,
  isValidNodeLink,
  getNodeType,
  tryDecodeNodeContent,
  cleanNodeLink,
  parseNodeContent
};
