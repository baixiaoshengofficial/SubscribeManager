// 显示添加节点模态框
function showAddNodeModal(subscriptionPath) {
  const modal = document.getElementById('addNodeModal');
  const form = document.getElementById('addNodeForm');

  // 重置表单
  form.reset();

  // 设置订阅路径
  const pathInput = form.querySelector('[name="subscriptionPath"]');
  if (pathInput) {
    pathInput.value = subscriptionPath;
  }

  // 显示模态框
  const modalInstance = new bootstrap.Modal(modal);
  modalInstance.show();
}

// 创建节点
async function createNode() {
  try {
    const form = document.getElementById('addNodeForm');
    if (!form) {
      throw new Error('Form not found');
    }

    const formData = new FormData(form);
    const subscriptionPath = formData.get('subscriptionPath');
    const name = formData.get('name')?.trim();
    let content = formData.get('content')?.trim();

    if (!subscriptionPath) {
      throw new Error('Missing subscription path');
    }

    if (!content) {
      throw new Error('Please fill node content');
    }

    // 分割成行
    const lines = content.split(/\r?\n/);
    const validNodes = [];

    // 处理每一行
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // 检查是否是Base64编码的完整配置
      try {
        const decodedContent = safeBase64DecodeFrontend(trimmedLine);
        // 如果解码成功，检查是否包含多个节点
        const decodedLines = decodedContent.split(/\r?\n/);
        for (const decodedLine of decodedLines) {
          if (decodedLine.trim() && isValidNodeLink(decodedLine.trim())) {
            validNodes.push({
              name: name || extractNodeNameFrontend(decodedLine.trim()),
              content: decodedLine.trim()
            });
          }
        }
      } catch (e) {
        // 如果不是Base64编码，直接检查是否是有效的节点链接
        if (isValidNodeLink(trimmedLine)) {
          validNodes.push({
            name: name || extractNodeNameFrontend(trimmedLine),
            content: trimmedLine
          });
        }
      }
    }

    if (validNodes.length === 0) {
      throw new Error('No valid node links found');
    }

    // 批量创建节点，按顺序添加
    const results = [];
    const timestamp = Date.now();

    for (let i = 0; i < validNodes.length; i++) {
      const node = validNodes[i];
      try {
        await apiPost(`/api/subscriptions/${subscriptionPath}/nodes`, {
          name: node.name,
          content: node.content,
          type: getNodeType(node.content),
          order: timestamp + i
        });
        results.push({ success: true, link: node.content, order: i });
      } catch (error) {
        results.push({ success: false, message: error.message, link: node.content, order: i });
      }
    }

    // 统计结果
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    // 显示结果
    if (validNodes.length === 1) {
      showToast(successful > 0 ? _t('nodes.added') : _t('nodes.add_failed'), successful > 0 ? 'success' : 'danger');
    } else {
      showToast(_t('nodes.add_result', { success: successful, failed: failed }), successful > 0 ? 'success' : 'warning');
    }

    // 关闭模态框
    const modal = document.getElementById('addNodeModal');
    if (modal) {
      const modalInstance = bootstrap.Modal.getInstance(modal);
      if (modalInstance) {
        modalInstance.hide();
      }
    }

    // 重置表单
    form.reset();

    // 刷新订阅列表
    await loadSubscriptions();
    if (successful > 0) {
      await loadNodeList(subscriptionPath);
    }

  } catch (error) {
    handleApiError(error);
  }
}

// 提取节点名称（前端版本）
function extractNodeNameFrontend(nodeLink) {
  if (!nodeLink) return 'Unnamed Node';

  // 处理snell节点
  if (nodeLink.includes('snell,')) {
    const name = nodeLink.split('=')[0].trim();
    return name || 'Unnamed Node';
  }

  // 处理 VMess 链接
  if (nodeLink.toLowerCase().startsWith('vmess://')) {
    try {
      const config = JSON.parse(safeBase64DecodeFrontend(nodeLink.substring(8)));
      if (config.ps) {
        return config.ps;
      }
    } catch { }
    return 'Unnamed Node';
  }

  // 处理其他使用哈希标记名称的链接类型
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

// 节点类型常量定义
const NODE_TYPES_FRONTEND = {
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

// 检查是否是有效的节点链接
function isValidNodeLink(link) {
  const lowerLink = link.toLowerCase();
  // 检查snell格式
  if (lowerLink.includes('=') && lowerLink.includes('snell,')) {
    const parts = link.split('=')[1]?.trim().split(',');
    return parts && parts.length >= 4 && parts[0].trim() === 'snell';
  }
  return Object.values(NODE_TYPES_FRONTEND).some(prefix => lowerLink.startsWith(prefix));
}

// 获取节点类型
function getNodeType(link) {
  const lowerLink = link.toLowerCase();
  if (lowerLink.includes('=') && lowerLink.includes('snell,')) {
    return 'snell';
  }
  return Object.entries(NODE_TYPES_FRONTEND).find(([key, prefix]) =>
    lowerLink.startsWith(prefix)
  )?.[0].toLowerCase() || '';
}

// Base64解码函数
function safeBase64DecodeFrontend(str) {
  if (!str) return '';
  const normalized = String(str)
    .replace(/\s+/g, '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return atob(normalized + padding);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJsString(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
}

const NODE_VIEW_MODE_KEY = 'nodeViewMode';

function getNodeViewMode(subscriptionPath) {
  return localStorage.getItem(`nodeViewMode:${subscriptionPath}`)
    || localStorage.getItem(NODE_VIEW_MODE_KEY)
    || 'table';
}

function applyNodeViewMode(subscriptionPath, mode) {
  const nodeListArea = document.getElementById('node-list-' + subscriptionPath);
  if (!nodeListArea) return;
  nodeListArea.dataset.view = mode;

  const buttons = nodeListArea.querySelectorAll('.node-view-btn');
  buttons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === mode);
  });
}

function setNodeViewMode(subscriptionPath, mode) {
  localStorage.setItem(`nodeViewMode:${subscriptionPath}`, mode);
  localStorage.setItem(NODE_VIEW_MODE_KEY, mode);
  applyNodeViewMode(subscriptionPath, mode);
  loadNodeList(subscriptionPath).catch(error => {
    console.error('Load node list failed:', error);
    showToast('' + error.message, 'danger');
  });
}

// 显示节点列表
async function showNodeList(subscriptionPath) {
  const nodeListArea = document.getElementById('node-list-' + subscriptionPath);
  if (!nodeListArea) {
    console.error('Node list area not found');
    return;
  }

  const isHidden = !nodeListArea.classList.contains('expanded');
  let expandedSubs = JSON.parse(localStorage.getItem('expandedSubscriptions') || '[]');

  const viewMode = getNodeViewMode(subscriptionPath);
  applyNodeViewMode(subscriptionPath, viewMode);

  if (isHidden) {
    // 立即添加展开类名触发动画
    nodeListArea.classList.add('expanded');

    // 更新展开状态
    if (!expandedSubs.includes(subscriptionPath)) {
      expandedSubs.push(subscriptionPath);
      localStorage.setItem('expandedSubscriptions', JSON.stringify(expandedSubs));
    }

    // 同时开始加载数据
    loadNodeList(subscriptionPath).catch(error => {
      console.error('Load node list failed:', error);
      showToast('' + error.message, 'danger');
    });
  } else {
    nodeListArea.classList.remove('expanded');
    expandedSubs = expandedSubs.filter(path => path !== subscriptionPath);
    localStorage.setItem('expandedSubscriptions', JSON.stringify(expandedSubs));
  }
}

// 加载节点列表
async function loadNodeList(subscriptionPath) {
  const nodeListArea = document.getElementById('node-list-' + subscriptionPath);
  if (!nodeListArea) {
    throw new Error('Node list area not found');
  }

  const viewMode = getNodeViewMode(subscriptionPath);
  const tbody = nodeListArea.querySelector('tbody');
  const tableWrap = nodeListArea.querySelector('.node-table-wrap');
  const cardGrid = nodeListArea.querySelector('.node-card-grid');

  applyNodeViewMode(subscriptionPath, viewMode);

  // 先显示加载中的提示
  if (viewMode === 'card' && cardGrid) {
    cardGrid.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin me-2"></i><span data-i18n="common.loading"></span></div>';
  } else if (tbody) {
    tbody.innerHTML = '<tr><td colspan="2" class="text-center py-4"><i class="fas fa-spinner fa-spin me-2"></i><span data-i18n="common.loading"></span></td></tr>';
  }

  try {
    const response = await fetch('/api/subscriptions/' + subscriptionPath + '/nodes');
    if (!response.ok) throw new Error(_t('common.loading'));

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || _t('common.loading'));
    }

    const nodes = result.data || [];

    const nodesHtml = nodes.map(node => {
      const nodeLink = node.original_link || '';
      const displayNodeLink = escapeHtml(nodeLink);
      const jsNodeLink = escapeJsString(nodeLink);
      const displayNodeName = escapeHtml(node.name || '');
      const isEnabled = node.enabled === 1;

      return `
                <tr class="node-row" data-id="${node.id}" data-order="${node.node_order}" data-enabled="${isEnabled ? '1' : '0'}">
      <td class="align-middle">
        <div class="d-flex align-items-center">
          <input class="node-checkbox me-2" type="checkbox" value="${node.id}"
            data-subscription="${subscriptionPath}" style="display: none;">
          <div class="text-nowrap text-truncate ${!isEnabled ? 'text-danger' : ''}" style="max-width: 320px; ${!isEnabled ? 'text-decoration: line-through;' : ''}" title="${displayNodeName}">
            ${displayNodeName}
          </div>
        </div>
      </td>
                <td class="align-middle">
                  <div class="d-flex justify-content-between align-items-center" style="gap: 8px;">
                              <div class="text-nowrap text-truncate ${!isEnabled ? 'text-danger' : ''}" style="max-width: 400px; ${!isEnabled ? 'text-decoration: line-through;' : ''}" title="${displayNodeLink}">
            ${displayNodeLink}
          </div>
                    <div class="node-actions d-flex" style="flex-shrink: 0; gap: 4px;">
                      <button class="btn btn-sm btn-edit" onclick="showEditNodeModal('${subscriptionPath}', '${node.id}', '${jsNodeLink}')" data-i18n-title="nodes.edit">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button class="btn btn-sm btn-primary" onclick="copyToClipboard('${jsNodeLink}')" data-i18n-title="common.copied">
                        <i class="fas fa-copy"></i>
                      </button>
                      <button class="btn btn-sm btn-danger" onclick="deleteNode('${subscriptionPath}', ${node.id})" data-i18n-title="common.delete">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            `;
    }).join('');

    const cardHtml = nodes.map(node => {
      const nodeLink = node.original_link || '';
      const displayNodeLink = escapeHtml(nodeLink);
      const jsNodeLink = escapeJsString(nodeLink);
      const displayNodeName = escapeHtml(node.name || '');
      const isEnabled = node.enabled === 1;
      const disabledClass = isEnabled ? '' : 'node-card-disabled';

      return `
        <div class="node-card ${disabledClass}" data-id="${node.id}" data-order="${node.node_order}" data-enabled="${isEnabled ? '1' : '0'}">
          <div class="node-card-header">
            <div class="node-card-title">
              <input class="node-checkbox" type="checkbox" value="${node.id}" data-subscription="${subscriptionPath}" style="display: none;">
              <span style="${!isEnabled ? 'text-decoration: line-through;' : ''}">${displayNodeName || 'Unnamed Node'}</span>
            </div>
            <span class="node-status ${isEnabled ? '' : 'disabled'}"></span>
          </div>
          <div class="node-card-link" title="${displayNodeLink}" style="${!isEnabled ? 'text-decoration: line-through;' : ''}">
            ${displayNodeLink}
          </div>
          <div class="node-card-actions">
            <button class="btn btn-sm btn-edit" onclick="showEditNodeModal('${subscriptionPath}', '${node.id}', '${jsNodeLink}')" data-i18n-title="nodes.edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-primary" onclick="copyToClipboard('${jsNodeLink}')" data-i18n-title="common.copied">
              <i class="fas fa-copy"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteNode('${subscriptionPath}', ${node.id})" data-i18n-title="common.delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    if (viewMode === 'card' && cardGrid) {
      cardGrid.innerHTML = cardHtml || '<div class="text-center py-4" data-i18n="nodes.none"></div>';
      if (tbody) {
        tbody.innerHTML = '';
      }
    } else if (tbody) {
      tbody.innerHTML = nodesHtml || '<tr><td colspan="2" class="text-center py-4"><span data-i18n="nodes.none"></span></td></tr>';
      if (cardGrid) {
        cardGrid.innerHTML = '';
      }
    }

    window.i18n.translateDOM(nodeListArea);

    if (viewMode === 'table' && nodes.length > 0 && tbody) {
      const isMobile = window.innerWidth <= 767;
      if (!isMobile) {
        initializeSortable(tbody, subscriptionPath);
      }
    } else if (viewMode === 'card' && nodes.length > 0 && cardGrid) {
      const isMobile = window.innerWidth <= 767;
      if (!isMobile) {
        initializeCardSortable(cardGrid, subscriptionPath);
      }
    }
  } catch (error) {
    const errorHtml = `<div class="text-center py-4 text-danger">
          <i class="fas fa-exclamation-circle me-2"></i><span data-i18n="common.error_prefix"></span>${error.message}
        </div>`;

    if (viewMode === 'card' && cardGrid) {
      cardGrid.innerHTML = errorHtml;
    } else if (tbody) {
      tbody.innerHTML = `<tr><td colspan="2" class="text-center py-4 text-danger">
          <i class="fas fa-exclamation-circle me-2"></i><span data-i18n="common.error_prefix"></span>${error.message}
        </td></tr>`;
    }

    window.i18n.translateDOM(nodeListArea);
    throw error;
  }
}

// 初始化拖拽排序功能
function initializeSortable(tbody, subscriptionPath) {
  new Sortable(tbody, {
    animation: 150,
    handle: '.node-row',
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    onEnd: async function (evt) {
      try {
        const rows = Array.from(tbody.querySelectorAll('.node-row'));
        const newOrders = rows.map((row, index) => ({
          id: parseInt(row.dataset.id),
          order: index
        }));

        await updateNodeOrder(subscriptionPath, newOrders);
        showToast(_t('nodes.sort_updated'));
      } catch (error) {
        console.error('更新节点排序失败:', error);
        showToast(_t('nodes.sort_failed') + ': ' + error.message, 'danger');
        // 重新加载列表以恢复原始顺序
        await loadNodeList(subscriptionPath);
      }
    }
  });
}

// 初始化卡片拖拽排序功能
function initializeCardSortable(cardGrid, subscriptionPath) {
  new Sortable(cardGrid, {
    animation: 150,
    handle: '.node-card',
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    onEnd: async function (evt) {
      try {
        const cards = Array.from(cardGrid.querySelectorAll('.node-card'));
        const newOrders = cards.map((card, index) => ({
          id: parseInt(card.dataset.id),
          order: index
        }));

        await updateNodeOrder(subscriptionPath, newOrders);
        showToast(_t('nodes.sort_updated'));
      } catch (error) {
        console.error('更新节点排序失败:', error);
        showToast(_t('nodes.sort_failed') + ': ' + error.message, 'danger');
        // 重新加载列表以恢复原始顺序
        await loadNodeList(subscriptionPath);
      }
    }
  });
}

// 删除节点
async function deleteNode(subscriptionPath, nodeId) {
  if (!confirm(_t('nodes.delete_confirm'))) return;

  try {
    const response = await fetch('/api/subscriptions/' + subscriptionPath + '/nodes/' + nodeId, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || '');
    }

    showToast(_t('nodes.deleted'));

    // 只删除DOM中的节点行，不重新加载整个列表
    const nodeListArea = document.getElementById('node-list-' + subscriptionPath);
    const nodeRows = nodeListArea.querySelectorAll(`[data-id="${nodeId}"]`);
    nodeRows.forEach(row => row.remove());

    // 更新节点计数
    const tbody = nodeListArea.querySelector('tbody');
    const remainingNodes = tbody.querySelectorAll('.node-row').length;
    const nodeCountBadge = document.querySelector(`[data-subscription-path="${subscriptionPath}"] .node-badge .count`);
    if (nodeCountBadge) {
      nodeCountBadge.textContent = remainingNodes;
    }

    // 如果没有节点了，显示空提示
    if (remainingNodes === 0) {
      tbody.innerHTML = '<tr><td colspan="2" class="text-center py-4" data-i18n="nodes.empty"></td></tr>';
      if (typeof i18nUpdate !== 'undefined') {
        i18nUpdate();
      }
    }
  } catch (error) {
    showToast('' + error.message, 'danger');
  }
}

// 显示编辑节点模态框
function showEditNodeModal(subscriptionPath, nodeId, nodeContent) {
  const modal = document.getElementById('editNodeModal');
  const form = document.getElementById('editNodeForm');

  if (!modal || !form) {
    showToast('' + 'Failed to open modal', 'danger');
    return;
  }

  // 设置表单值
  form.querySelector('[name="subscriptionPath"]').value = subscriptionPath;
  form.querySelector('[name="nodeId"]').value = nodeId;
  form.setAttribute('data-original-content', nodeContent);
  form.querySelector('[name="content"]').value = nodeContent;

  // 显示模态框
  new bootstrap.Modal(modal).show();
}

// 更新节点
async function updateNode() {
  const form = document.getElementById('editNodeForm');
  const formData = new FormData(form);
  const subscriptionPath = formData.get('subscriptionPath');
  const nodeId = formData.get('nodeId');
  const content = formData.get('content')?.trim();
  const originalContent = form.getAttribute('data-original-content');

  if (!subscriptionPath || !nodeId || !content) {
    showToast('' + 'Please complete node info', 'danger');
    return;
  }

  // 检查内容是否被修改
  if (content === originalContent) {
    showToast('' + _t('common.success'));
    bootstrap.Modal.getInstance(document.getElementById('editNodeModal'))?.hide();
    return;
  }

  try {
    const response = await fetch('/api/subscriptions/' + subscriptionPath + '/nodes/' + nodeId, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({ content })
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || '');

    showToast(_t('nodes.edited'));
    bootstrap.Modal.getInstance(document.getElementById('editNodeModal'))?.hide();
    form.reset();

    // 刷新数据
    await Promise.all([
      loadSubscriptions(),
      loadNodeList(subscriptionPath)
    ]);

  } catch (error) {
    showToast('' + error.message, 'danger');
  }
}

// 更新节点顺序
async function updateNodeOrder(subscriptionPath, orders) {
  try {
    const response = await fetch('/api/subscriptions/' + subscriptionPath + '/nodes/reorder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({ orders })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || '');
    }

    return result;
  } catch (error) {
    console.error('更新节点排序失败:', error);
  } finally {
    // 无论成功还是失败都重新加载节点列表
    await loadNodeList(subscriptionPath);
  }
}
