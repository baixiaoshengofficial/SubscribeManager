/**
 * 导入服务 - 处理订阅节点导入逻辑
 */
const { parseSubscriptionNodes } = require('../utils/converters/subscriptionParser');
const { extractNodeName, getNodeType } = require('../utils/validators/nodeParser');
const { NodeRepository } = require('../utils/database/operations');
const subscriptionService = require('./subscriptionService');
const https = require('node:https');
const http = require('node:http');
const { domainToUnicode } = require('node:url');
const ApiError = require('../utils/ApiError');

/**
 * 从外部 URL 获取订阅内容
 * @param {string} url 订阅 URL
 * @returns {Promise<string>} 订阅内容
 */
async function fetchSubscriptionContent(url) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        timeout: 15000,
        rejectUnauthorized: false, // 允许自签名证书
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      };

      const req = protocol.request(options, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        let data = '';
        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          resolve(data);
        });
      });

      req.on('error', reject);
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 验证导入 URL
 * @param {string} url 要验证的 URL
 * @throws {Error} URL 格式无效时抛出错误
 */
function validateImportUrl(url) {
  if (!url?.trim()) {
    throw new ApiError(400, 'import.url_required');
  }

  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Unsupported protocol');
    }
  } catch {
    throw new ApiError(400, 'import.invalid_url');
  }
}

function normalizeImportUrls(input) {
  const rawItems = Array.isArray(input)
    ? input
    : String(input || '').split(/\r?\n/);

  const urls = rawItems
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  if (!urls.length) {
    throw new ApiError(400, 'import.url_required');
  }

  for (const url of urls) {
    validateImportUrl(url);
  }

  return Array.from(new Set(urls));
}

function getSourceHost(importUrl) {
  const urlObj = new URL(importUrl);
  const hostname = urlObj.hostname.replace(/^www\./i, '') || urlObj.host;
  return domainToUnicode(hostname) || hostname;
}

function sanitizeSourceUrl(importUrl) {
  const urlObj = new URL(importUrl);
  return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
}

function resolveImportSources(importUrls) {
  return importUrls.map((url) => {
    const sourceUrl = sanitizeSourceUrl(url);
    return {
      url,
      sourceName: getSourceHost(url),
      sourceUrl
    };
  });
}

function buildNodeSourceKey(nodeName, sourceUrl, sourceName) {
  return `${sourceName || sourceUrl || ''}::${nodeName}`;
}

function buildNodeSourceUrlKey(nodeName, sourceUrl) {
  let normalizedSourceUrl = sourceUrl || '';
  if (sourceUrl) {
    try {
      normalizedSourceUrl = sanitizeSourceUrl(sourceUrl);
    } catch {}
  }
  return `${normalizedSourceUrl}::${nodeName}`;
}

function collectExistingNodeKeys(existingNodes) {
  const sourceNodes = new Map();
  const legacyNodes = new Map();

  for (const node of existingNodes) {
    const nodeName = node.name?.trim();
    if (!nodeName) {
      continue;
    }
    if (node.source_url || node.source_name) {
      const sourceName = node.source_url ? getSourceHost(node.source_url) : node.source_name;
      const sourceKey = buildNodeSourceKey(nodeName, node.source_url, sourceName);
      const sourceUrlKey = buildNodeSourceUrlKey(nodeName, node.source_url);
      sourceNodes.set(sourceKey, node);
      sourceNodes.set(sourceUrlKey, node);
    } else {
      const nodes = legacyNodes.get(nodeName) || [];
      nodes.push(node);
      legacyNodes.set(nodeName, nodes);
    }
  }

  return { sourceNodes, legacyNodes };
}

function findExistingNode({ nodeName, source, existingKeys }) {
  const sourceKey = buildNodeSourceKey(nodeName, source.sourceUrl, source.sourceName);
  const sourceUrlKey = buildNodeSourceUrlKey(nodeName, source.sourceUrl);
  return existingKeys.sourceNodes.get(sourceUrlKey)
    || existingKeys.sourceNodes.get(sourceKey)
    || existingKeys.legacyNodes.get(nodeName)?.[0]
    || null;
}

function rememberImportedNode({ nodeName, source, node, existingKeys }) {
  const sourceKey = buildNodeSourceKey(nodeName, source.sourceUrl, source.sourceName);
  const sourceUrlKey = buildNodeSourceUrlKey(nodeName, source.sourceUrl);
  existingKeys.sourceNodes.set(sourceKey, node);
  existingKeys.sourceNodes.set(sourceUrlKey, node);
  const legacyNodes = existingKeys.legacyNodes.get(nodeName);
  if (legacyNodes?.length) {
    legacyNodes.shift();
    if (!legacyNodes.length) {
      existingKeys.legacyNodes.delete(nodeName);
    }
  }
}

/**
 * 验证订阅内容
 * @param {string} content 订阅内容
 * @throws {Error} 内容无效时抛出错误
 */
function validateSubscriptionContent(content) {
  if (!content) {
    throw new ApiError(400, 'import.no_valid_nodes');
  }

  const trimmedContent = content.trim();
  if (trimmedContent.length === 0) {
    throw new ApiError(400, 'import.no_valid_nodes');
  }

  return trimmedContent;
}

/**
 * 导入节点到订阅
 * @param {string} subscriptionPath 订阅路径
 * @param {string|string[]} importInput 导入 URL 或 URL 列表
 * @param {Object} dependencies 测试或特殊场景注入的依赖
 * @returns {Promise<Object>} 导入结果统计
 */
async function importNodes(subscriptionPath, importInput, dependencies = {}) {
  const {
    fetchSubscriptionContent: fetchContent = fetchSubscriptionContent,
    parseSubscriptionNodes: parseNodes = parseSubscriptionNodes,
    nodeRepository = NodeRepository,
    subscriptionService: subscriptionStore = subscriptionService
  } = dependencies;
  const importUrls = normalizeImportUrls(importInput);
  const importSources = resolveImportSources(importUrls);
  const failFast = importUrls.length === 1;

  // 获取现有节点名称。带来源的节点按来源去重；旧数据没有来源时仍按名称兜底去重。
  const existingNodes = await nodeRepository.findBySubscriptionPath(subscriptionPath);
  const existingKeys = collectExistingNodeKeys(existingNodes);

  // 获取订阅 ID
  const subscription = await subscriptionStore.getSubscription(subscriptionPath);
  const subscriptionId = subscription.id;

  // 导入节点
  const result = {
    importedCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    sourceCount: importUrls.length,
    failedSourceCount: 0
  };

  for (const source of importSources) {
    // 获取订阅内容
    let content;
    try {
      content = await fetchContent(source.url);
    } catch (error) {
      if (failFast) {
        if (/timeout/i.test(error.message)) {
          throw new ApiError(504, 'import.timeout');
        }
        if (/^HTTP \d+/.test(error.message)) {
          throw new ApiError(502, 'import.fetch_failed', { detail: error.message });
        }
        throw new ApiError(502, 'import.fetch_failed', { detail: error.message || '请求失败' });
      }
      result.failedSourceCount++;
      continue;
    }

    let nodeLinks;
    try {
      const trimmedContent = validateSubscriptionContent(content);
      // 自动识别订阅内容格式并解析节点
      nodeLinks = await parseNodes(trimmedContent);
    } catch (error) {
      if (failFast) {
        throw error;
      }
      result.failedSourceCount++;
      continue;
    }

    if (nodeLinks.length === 0) {
      if (failFast) {
        throw new ApiError(400, 'import.no_valid_nodes');
      }
      result.failedSourceCount++;
      continue;
    }

    for (const nodeLink of nodeLinks) {
      try {
        const nodeName = extractNodeName(nodeLink);
        const trimmedName = nodeName.trim();
        // 已有来源的节点按来源去重；旧节点原地补全来源，避免重新导入后仍显示“未分组”。
        const existingNode = findExistingNode({ nodeName: trimmedName, source, existingKeys });
        if (existingNode) {
          const sourceChanged = existingNode.source_name !== source.sourceName
            || existingNode.source_url !== source.sourceUrl;
          if (sourceChanged) {
            await nodeRepository.updateSource(existingNode.id, source.sourceName, source.sourceUrl);
            result.updatedCount++;
            rememberImportedNode({
              nodeName: trimmedName,
              source,
              node: { ...existingNode, source_name: source.sourceName, source_url: source.sourceUrl },
              existingKeys
            });
          } else {
            result.skippedCount++;
          }
          continue;
        }

        // 创建节点
        const nodeType = getNodeType(nodeLink);
        await nodeRepository.create({
          subscriptionId,
          name: nodeName,
          originalLink: nodeLink,
          nodeOrder: 0,
          type: nodeType,
          sourceName: source.sourceName,
          sourceUrl: source.sourceUrl
        });

        result.importedCount++;
        rememberImportedNode({
          nodeName: trimmedName,
          source,
          node: { name: nodeName, source_name: source.sourceName, source_url: source.sourceUrl },
          existingKeys
        });
      } catch {
        // 忽略单个节点的错误，继续处理下一个节点
        result.failedCount++;
      }
    }
  }

  // 返回结果
  const totalAfterImport = await nodeRepository.countBySubscriptionPath(subscriptionPath);

  return {
    importedCount: result.importedCount,
    updatedCount: result.updatedCount,
    skippedCount: result.skippedCount,
    failedCount: result.failedCount,
    sourceCount: result.sourceCount,
    failedSourceCount: result.failedSourceCount,
    totalAfterImport
  };
}

module.exports = {
  importNodes,
  normalizeImportUrls,
  resolveImportSources
};
