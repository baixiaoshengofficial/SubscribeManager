/**
 * 订阅格式检测和解析工具
 * 支持解析通用订阅、Clash YAML、Surge 配置、Shadowsocks JSON 等格式
 */

const YAML = require('js-yaml');
const { cleanNodeLink } = require('../validators/nodeParser');
const { safeBase64Decode, safeDecodeURIComponent } = require('../helpers');

// 协议类映射
const VLESSProtocol = require('../../protocols/VLESSProtocol');
const TrojanProtocol = require('../../protocols/TrojanProtocol');
const VMessProtocol = require('../../protocols/VMessProtocol');
const SSProtocol = require('../../protocols/SSProtocol');
const Hysteria2Protocol = require('../../protocols/Hysteria2Protocol');
const TUICProtocol = require('../../protocols/TUICProtocol');
const SOCKSProtocol = require('../../protocols/SOCKSProtocol');
const logger = require('../logger');

/**
 * 检测订阅格式
 * @param {string} content 订阅内容
 * @returns {string} 格式类型: 'universal', 'clash', 'surge', 'shadowsocks', 'unknown'
 */
function detectSubscriptionFormat(content) {
  const trimmed = content.trim();

  // 检测 Clash YAML 格式
  if (trimmed.includes('proxies:') || trimmed.includes('proxy-groups:')) {
    return 'clash';
  }

  // 检测 Surge 格式 (带 [Proxy] 标题)
  if (trimmed.includes('[Proxy]') || trimmed.includes('[Proxy Group]')) {
    return 'surge';
  }

  // 检测 Surge 逗号格式 (Type, Server, Port...)
  const surgePattern = /^\s*[\w\s\-]+\s*=\s*(ss|vmess|trojan|vless|hysteria2|hy2|tuic)\s*,/im;
  if (surgePattern.test(trimmed)) {
    return 'surge';
  }

  // 检测 Clash 逗号格式 (Type, Server, Port...)
  const clashPattern = /^\s*[\w\-\.]+\s*,\s*(ss|vmess|trojan|vless|hysteria2|hy2|tuic)\s*,/im;
  if (clashPattern.test(trimmed)) {
    return 'clash';
  }

  // 检测 Shadowsocks JSON 格式
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.servers || parsed.proxies || Array.isArray(parsed)) {
        return 'shadowsocks';
      }
    } catch (e) {
      // 不是有效的 JSON
    }
  }

  // 检测通用格式 (包含协议前缀)
  const protocolPatterns = [
    /ss:\/\//i,
    /vless:\/\//i,
    /vmess:\/\//i,
    /trojan:\/\//i,
    /hysteria2?:\/\//i,
    /tuic:\/\//i,
    /socks:\/\//i
  ];

  for (const pattern of protocolPatterns) {
    if (pattern.test(trimmed)) {
      return 'universal';
    }
  }

  // 可能是 Base64 编码的通用格式
  if (!trimmed.includes('://') && !trimmed.includes('{') && !trimmed.includes('[')) {
    return 'universal'; // 可能是 Base64
  }

  return 'unknown';
}

/**
 * 解析订阅内容，提取节点链接列表
 * @param {string} content 订阅内容
 * @returns {Promise<Array<string>>} 节点链接列表
 */
async function parseSubscriptionNodes(content) {
  const format = detectSubscriptionFormat(content);
  logger.debug('Detected subscription format', { format, length: content.length });

  let decodedContent = content;

  // 尝试 Base64 解码（如果是通用格式且没有协议前缀）
  if (format === 'universal' && !content.includes('://')) {
    try {
      // 先尝试 URL 解码，处理双重编码情况
      let contentToDecode = safeDecodeURIComponent(content);
      decodedContent = safeBase64Decode(contentToDecode);
    } catch (e) {
      logger.debug('Base64 decode failed, using original content');
    }
  }

  switch (format) {
    case 'clash':
      return parseClashNodes(decodedContent);
    case 'surge':
      return parseSurgeNodes(decodedContent);
    case 'shadowsocks':
      return parseShadowsocksNodes(decodedContent);
    case 'universal':
      return parseUniversalNodes(decodedContent);
    default:
      return [];
  }
}

/**
 * 解析 Clash YAML 格式
 * @param {string} content YAML 内容
 * @returns {Promise<Array<string>>} 节点链接列表
 */
async function parseClashNodes(content) {
  const nodes = [];
  const uniqueNodes = new Set();  // 使用 Set 去重
  const lines = content.split('\n');

  // 首先尝试作为 YAML 解析
  if (content.includes('proxies:') || content.includes('proxy-groups:')) {
    try {
      const config = YAML.load(content);
      logger.debug('Clash YAML parsed');

      // 支持 proxies 和 Proxy 两种键名
      const proxies = config.proxies || config.Proxy || [];
      logger.debug('Clash YAML proxies found', { count: proxies.length });

      for (const proxy of proxies) {
        try {
          const nodeLink = convertClashNodeToUniversal(proxy);
          if (nodeLink && !uniqueNodes.has(nodeLink)) {
            uniqueNodes.add(nodeLink);
            nodes.push(nodeLink);
          }
        } catch (e) {
          logger.debug('Failed to parse Clash node', { message: e.message });
        }
      }

      logger.debug('Clash nodes converted', { count: nodes.length });
      return nodes;
    } catch (error) {
      logger.debug('Failed to parse Clash YAML', { message: error.message });
    }
  }

  // 解析 Clash 逗号格式: Name, Type, Server, Port, ...
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;

    const parts = trimmed.split(',').map(p => p.trim());
    if (parts.length < 3) continue;

    const name = parts[0];
    const type = parts[1]?.toLowerCase();
    const server = parts[2];
    const port = parts[3];

    if (!server || !port) continue;

    try {
      const nodeLink = convertClashCommaNodeToUniversal(name, type, parts);
      if (nodeLink && !uniqueNodes.has(nodeLink)) {
        uniqueNodes.add(nodeLink);
        nodes.push(nodeLink);
      }
    } catch (e) {
      logger.debug('Failed to parse Clash comma node', { message: e.message });
    }
  }

  logger.debug('Clash nodes parsed', { count: nodes.length });
  return nodes;
}

/**
 * 将 Clash 节点对象转换为通用格式字符串
 * @param {Object} proxy Clash 节点对象
 * @returns {string|null} 通用格式字符串
 */

/**
 * 将 Clash 逗号格式行转换为通用格式
 * @param {string} name 节点名称
 * @param {string} type 节点类型
 * @param {Array<string>} parts 逗号分隔的参数
 * @returns {string|null} 通用格式字符串
 */
function convertClashCommaNodeToUniversal(name, type, parts) {
  const protocolMap = {
    'ss': SSProtocol,
    'shadowsocks': SSProtocol,
    'vmess': VMessProtocol,
    'vless': VLESSProtocol,
    'trojan': TrojanProtocol,
    'hysteria2': Hysteria2Protocol,
    'hy2': Hysteria2Protocol
  };

  const ProtocolClass = protocolMap[type.toLowerCase()];
  if (!ProtocolClass) {
    return null;
  }

  const protocol = new ProtocolClass();
  return protocol.convertFromClashComma(name, parts);
}

function convertClashNodeToUniversal(proxy) {
  if (!proxy || !proxy.type) return null;

  const { type } = proxy;
  const protocolMap = {
    'ss': SSProtocol,
    'shadowsocks': SSProtocol,
    'vmess': VMessProtocol,
    'vless': VLESSProtocol,
    'trojan': TrojanProtocol,
    'hysteria2': Hysteria2Protocol,
    'hy2': Hysteria2Protocol,
    'tuic': TUICProtocol,
    'socks': SOCKSProtocol
  };

  const ProtocolClass = protocolMap[type.toLowerCase()];
  if (!ProtocolClass) {
    logger.debug('Unsupported Clash node type', { type });
    return null;
  }

  const protocol = new ProtocolClass();
  return protocol.convertToFormat(proxy, 'universal');
}

/**
 * 解析 Surge 格式
 * @param {string} content Surge 配置内容
 * @returns {Promise<Array<string>>} 节点链接列表
 */
async function parseSurgeNodes(content) {
  const nodes = [];
  const uniqueNodes = new Set();  // 使用 Set 去重
  const lines = content.split('\n');
  let inProxySection = false;

  logger.debug('Start parsing Surge nodes', { lines: lines.length });

  for (const line of lines) {
    const trimmed = line.trim();

    // 跳过空行和注释
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;

    // 检测是否进入 [Proxy] 区域
    if (trimmed === '[Proxy]') {
      inProxySection = true;
      logger.debug('Entered Surge proxy section');
      continue;
    }

    // 检测是否离开 [Proxy] 区域
    if (trimmed.startsWith('[') && !trimmed.startsWith('[Proxy]')) {
      inProxySection = false;
      logger.debug('Left Surge proxy section');
      continue;
    }

    // 如果没有在 [Proxy] 区域，检查是否为 Surge 逗号格式
    if (!inProxySection) {
      const commaPattern = /^\s*.+?\s*=\s*(ss|vmess|trojan|vless|hysteria2|hy2|tuic)\s*,/i;
      if (!commaPattern.test(trimmed)) {
        // 不是 Surge 代理行，跳过
        continue;
      }
    }

    // 解析 Surge 代理行
    const node = convertSurgeNodeToUniversal(trimmed);
    if (node && !uniqueNodes.has(node)) {
      uniqueNodes.add(node);
      nodes.push(node);
    } else if (node) {
      logger.debug('Skipped duplicate Surge node');
    } else {
      logger.debug('Failed to parse Surge line');
    }
  }

  logger.debug('Surge nodes parsed', { count: nodes.length });
  return nodes;
}

/**
 * 将 Surge 代理行转换为通用格式
 * @param {string} line Surge 代理行
 * @returns {string|null} 通用格式字符串
 */
function convertSurgeNodeToUniversal(line) {
  // 格式: Name = Type, Server, Port, ...
  const parts = line.split('=');
  if (parts.length < 2) return null;

  const name = parts[0].trim();
  const params = parts.slice(1).join('=').trim();
  const paramList = params.split(',').map(p => p.trim());

  const type = paramList[0]?.toLowerCase();
  const server = paramList[1];
  const port = paramList[2];

  if (!server || !port) return null;

  const protocolMap = {
    'ss': SSProtocol,
    'shadowsocks': SSProtocol,
    'vmess': VMessProtocol,
    'trojan': TrojanProtocol,
    'hysteria2': Hysteria2Protocol,
    'hy2': Hysteria2Protocol,
    'vless': VLESSProtocol,
    'snell': null // Snell 是 Surge 独有格式，跳过
  };

  const ProtocolClass = protocolMap[type];
  if (!ProtocolClass) {
    return null;
  }

  const protocol = new ProtocolClass();
  return protocol.convertFromSurge(name, paramList);
}

/**
 * 解析 Shadowsocks JSON 格式
 * @param {string} content JSON 内容
 * @returns {Promise<Array<string>>} 节点链接列表
 */
async function parseShadowsocksNodes(content) {
  try {
    const config = JSON.parse(content);
    const servers = config.servers || config.proxies || (Array.isArray(config) ? config : []);
    const nodes = [];
    const uniqueNodes = new Set();  // 使用 Set 去重

    for (const server of servers) {
      try {
        const ssProtocol = new SSProtocol();
        const node = ssProtocol.convertToFormat(server, 'universal');
        if (node && !uniqueNodes.has(node)) {
          uniqueNodes.add(node);
          nodes.push(node);
        }
      } catch (e) {
        logger.debug('Failed to parse Shadowsocks node', { message: e.message });
      }
    }

    return nodes;
  } catch (error) {
    logger.debug('Failed to parse Shadowsocks JSON', { message: error.message });
    return [];
  }
}

/**
 * 解析通用格式（每行一个节点链接）
 * @param {string} content 订阅内容
 * @returns {Promise<Array<string>>} 节点链接列表
 */
async function parseUniversalNodes(content) {
  const nodes = [];
  const uniqueNodes = new Set();  // 使用 Set 去重
  const lines = content.split(/\r?\n/);

  logger.debug('Start parsing universal nodes', { lines: lines.length });

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // 跳过不包含协议前缀的行（已经在 parseSubscriptionNodes 中完成 Base64 解码）
    if (!trimmedLine.includes('://')) {
      logger.debug('Skipped invalid universal line without protocol');
      continue;
    }

    try {
      const nodeLink = cleanNodeLink(trimmedLine);

      // 检查是否重复
      if (uniqueNodes.has(nodeLink)) {
        logger.debug('Skipped duplicate universal node');
      } else {
        uniqueNodes.add(nodeLink);
        nodes.push(nodeLink);
      }
    } catch (error) {
      logger.debug('Failed to parse universal node', { message: error.message });
    }
  }

  logger.debug('Universal nodes parsed', { lines: lines.length, valid: nodes.length, skipped: lines.length - nodes.length });
  return nodes;
}

module.exports = {
  detectSubscriptionFormat,
  parseSubscriptionNodes
};
