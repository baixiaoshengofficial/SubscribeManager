const { dbRun, withTransaction } = require('../utils/database/operations');
const { extractNodeName, tryDecodeNodeContent, cleanNodeLink, isValidNodeLink, getNodeType, NODE_TYPES, safeBase64Decode } = require('../utils');
const ApiError = require('../utils/ApiError');
const BaseService = require('./baseService');
const { NodeRepository } = require('../utils/database/operations');

function getBaseService() {
  return new BaseService();
}

function hasSupportedProtocol(link) {
  const lowerLink = String(link || '').toLowerCase().trim();
  return lowerLink.includes('=snell,')
    || lowerLink.startsWith('snell://')
    || lowerLink.startsWith('ss://')
    || lowerLink.startsWith('vmess://')
    || lowerLink.startsWith('vless://')
    || lowerLink.startsWith('trojan://')
    || lowerLink.startsWith('hysteria2://')
    || lowerLink.startsWith('tuic://')
    || lowerLink.startsWith('socks://')
    || lowerLink.startsWith('socks5://');
}

async function getNodes(subscriptionPath) {
  return await NodeRepository.findBySubscriptionPath(subscriptionPath);
}

async function createNode(subscriptionPath, name, content, order) {
  if (!content) {
    throw new ApiError(400, 'nodes.content_required');
  }

  // 获取订阅ID
  const subscriptionId = await getBaseService().getSubscriptionIdByPath(subscriptionPath);
  let originalLink = cleanNodeLink(content);

  // 尝试解码节点内容
  originalLink = tryDecodeNodeContent(originalLink);

  // 验证节点类型
  if (!isValidNodeLink(originalLink) && !hasSupportedProtocol(originalLink)) {
    throw new ApiError(400, 'nodes.unsupported_format');
  }

  // 检查是否重复节点（通过节点名称）
  const existingNodes = await NodeRepository.findBySubscriptionPath(subscriptionPath) || [];
  const extractedName = extractNodeName(originalLink);
  const newNodeName = name || extractedName;

  for (const existingNode of existingNodes) {
    if (existingNode.name && existingNode.name.trim() === newNodeName.trim()) {
      throw new ApiError(400, 'nodes.duplicate_node');
    }
  }

  // 提取节点名称
  const nodeName = newNodeName;

  // 获取节点类型
  const nodeType = getNodeType(originalLink);

  // 创建节点
  await NodeRepository.create({
    subscriptionId,
    name: nodeName,
    originalLink,
    nodeOrder: order || 0,
    type: nodeType
  });
}

async function updateNode(subscriptionPath, nodeId, content) {
  if (!content) {
    throw new ApiError(400, 'nodes.content_required');
  }

  // 获取订阅ID
  const subscriptionId = await getBaseService().getSubscriptionIdByPath(subscriptionPath);
  let originalLink = cleanNodeLink(content);

  // 使用统一的解码逻辑
  originalLink = tryDecodeNodeContent(originalLink);

  // 提取节点名称
  const nodeName = extractNodeName(originalLink);

  // 获取节点类型
  const nodeType = getNodeType(originalLink);

  // 更新节点
  await dbRun(
    'UPDATE nodes SET original_link = ?, name = ?, type = ? WHERE id = ? AND subscription_id = ?',
    [originalLink, nodeName || '未命名节点', nodeType, nodeId, subscriptionId]
  );
}

async function deleteNode(subscriptionPath, nodeId) {
  // 获取订阅ID
  const subscriptionId = await getBaseService().getSubscriptionIdByPath(subscriptionPath);
  
  // 删除节点
  await dbRun(
    'DELETE FROM nodes WHERE id = ? AND subscription_id = ?',
    [nodeId, subscriptionId]
  );
}

async function toggleNode(subscriptionPath, nodeId, enabled) {
  if (typeof enabled !== 'boolean') {
    throw new ApiError(400, 'nodes.invalid_enabled');
  }
  
  // 获取订阅ID
  const subscriptionId = await getBaseService().getSubscriptionIdByPath(subscriptionPath);
  
  // 更新节点状态
  await dbRun(
    'UPDATE nodes SET enabled = ? WHERE id = ? AND subscription_id = ?',
    [enabled ? 1 : 0, nodeId, subscriptionId]
  );
}

async function reorderNodes(subscriptionPath, orders) {
  if (!Array.isArray(orders) || orders.length === 0) {
    throw new ApiError(400, 'nodes.invalid_orders');
  }
  
  // 获取订阅ID
  const subscriptionId = await getBaseService().getSubscriptionIdByPath(subscriptionPath);
  
  await withTransaction(async (db) => {
    for (const { id, order } of orders) {
      await db.run(
        'UPDATE nodes SET node_order = ? WHERE id = ? AND subscription_id = ?',
        [order, id, subscriptionId]
      );
    }
  });
}

module.exports = {
  getNodes,
  createNode,
  updateNode,
  deleteNode,
  toggleNode,
  reorderNodes
};