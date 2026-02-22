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

// 优化的loadSubscriptions函数
async function loadSubscriptions() {
  try {

    const response = await fetch('/api/subscriptions');
    if (!response.ok) throw new Error(_t('common.loading'));
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || _t('common.loading'));
    }

    const subscriptions = result.data || [];
    const listElement = document.getElementById('subscriptionList');
    listElement.innerHTML = '';

    const fragment = document.createDocumentFragment();

    for (const sub of subscriptions) {
      const displayName = escapeHtml(sub.name || '');
      const jsName = escapeJsString(sub.name || '');
      const jsPath = escapeJsString(sub.path || '');

      const item = document.createElement('div');
      item.className = 'subscription-row';
      item.dataset.subscriptionPath = sub.path;
      item.innerHTML = `
            <!-- 订阅信息行 - 不是卡片样式 -->
            <div class="subscription-header">
              <div class="subscription-info">
                <h3 class="subscription-title">
                  <span class="title-text">${displayName}</span>
                  <div class="edit-trigger" onclick="showEditNameModal('${jsPath}', '${jsName}')" data-i18n-title="subscription.edit_info">
                    <i class="fas fa-edit"></i>
                  </div>
                  <div class="edit-trigger" onclick="showSubconverterModal('${jsPath}', '${jsName}')" data-i18n-title="subconverter.title">
                    <i class="fas fa-cog"></i>
                  </div>
                </h3>
                <div class="subscription-meta">
                  <span class="node-badge">
                    <i class="fas fa-server"></i>
                    <span class="count">${sub.nodeCount}</span>
                    <span class="label" data-i18n="nodes.count_label">节点</span>
                  </span>
                </div>
              </div>
            </div>
            
            <!-- 操作行：客户端类型 + 添加节点 + 节点列表 -->
            <div class="subscription-actions-row">
              <!-- 客户端类型 -->
              <div class="client-types">
                <div class="link-btn clickable-client" onclick="openClientPage(event, '${jsPath}')" data-i18n-title="actions.open_universal">
                  <i class="fas fa-link btn-icon common-icon"></i>
                  <span class="btn-label" data-i18n="clients.universal">通用</span>
                  <span class="btn-actions">
                    <span class="btn-link" onclick="copySubscriptionLink('${jsPath}', event); event.stopPropagation();" data-i18n-title="common.copy">
                      <i class="fas fa-copy copy-icon"></i>
                    </span>
                    <span class="btn-link" onclick="showImportNodesModalWithType('${jsPath}', 'universal', event); event.stopPropagation();" data-i18n-title="common.import">
                      <i class="fas fa-upload import-icon"></i>
                    </span>
                  </span>
                </div>
                <div class="link-btn clickable-client" onclick="openClientPage(event, '${jsPath}/v2ray')" data-i18n-title="actions.open_v2ray">
                  <i class="fas fa-rocket btn-icon v2ray-icon"></i>
                  <span class="btn-label" data-i18n="clients.v2ray">V2Ray</span>
                  <span class="btn-actions">
                    <span class="btn-link" onclick="copySubscriptionLink('${jsPath}/v2ray', event); event.stopPropagation();" data-i18n-title="common.copy">
                      <i class="fas fa-copy copy-icon"></i>
                    </span>
                    <span class="btn-link" onclick="showImportNodesModalWithType('${jsPath}', 'v2ray', event); event.stopPropagation();" data-i18n-title="common.import">
                      <i class="fas fa-upload import-icon"></i>
                    </span>
                  </span>
                </div>
                <div class="link-btn clickable-client" onclick="openClientPage(event, '${jsPath}/surge')" data-i18n-title="actions.open_surge">
                  <i class="fas fa-bolt btn-icon surge-icon"></i>
                  <span class="btn-label" data-i18n="clients.surge">Surge</span>
                  <span class="btn-actions">
                    <span class="btn-link" onclick="copySubscriptionLink('${jsPath}/surge', event); event.stopPropagation();" data-i18n-title="common.copy">
                      <i class="fas fa-copy copy-icon"></i>
                    </span>
                    <span class="btn-link" onclick="showImportNodesModalWithType('${jsPath}', 'surge', event); event.stopPropagation();" data-i18n-title="common.import">
                      <i class="fas fa-upload import-icon"></i>
                    </span>
                  </span>
                </div>
                <div class="link-btn clickable-client" onclick="openClientPage(event, '${jsPath}/clash')" data-i18n-title="actions.open_clash">
                  <i class="fas fa-shield-alt btn-icon clash-icon"></i>
                  <span class="btn-label" data-i18n="clients.clash">Clash</span>
                  <span class="btn-actions">
                    <span class="btn-link" onclick="copySubscriptionLink('${jsPath}/clash', event); event.stopPropagation();" data-i18n-title="common.copy">
                      <i class="fas fa-copy copy-icon"></i>
                    </span>
                    <span class="btn-link" onclick="showImportNodesModalWithType('${jsPath}', 'clash', event); event.stopPropagation();" data-i18n-title="common.import">
                      <i class="fas fa-upload import-icon"></i>
                    </span>
                  </span>
                </div>
                <div class="link-btn clickable-client" onclick="openClientPage(event, '${jsPath}/shadowsocks')" data-i18n-title="actions.open_shadowsocks">
                  <i class="fas fa-lock btn-icon ss-icon"></i>
                  <span class="btn-label" data-i18n="clients.shadowsocks">SS</span>
                  <span class="btn-actions">
                    <span class="btn-link" onclick="copySubscriptionLink('${jsPath}/shadowsocks', event); event.stopPropagation();" data-i18n-title="common.copy">
                      <i class="fas fa-copy copy-icon"></i>
                    </span>
                    <span class="btn-link" onclick="showImportNodesModalWithType('${jsPath}', 'ss', event); event.stopPropagation();" data-i18n-title="common.import">
                      <i class="fas fa-upload import-icon"></i>
                    </span>
                  </span>
                </div>
              </div>
              
              <!-- 操作按钮 -->
              <div class="action-buttons">
                <button class="btn btn-success action-btn" onclick="showAddNodeModal('${jsPath}')">
                  <i class="fas fa-plus"></i>
                  <span data-i18n="actions.add_node">添加节点</span>
                </button>
                <button class="btn btn-primary action-btn" onclick="showNodeList('${jsPath}')">
                  <i class="fas fa-list"></i>
                  <span data-i18n="actions.node_list">节点列表</span>
                </button>
              </div>
            </div>
            <div class="node-list-area" id="node-list-${sub.path}">
              <div class="node-list-toolbar">
                <div class="node-list-title">
                  <i class="fas fa-network-wired"></i>
                  <span data-i18n="actions.node_list">节点列表</span>
                </div>
                <div class="node-view-toggle">
                  <button class="node-view-btn" data-view="table" onclick="setNodeViewMode('${jsPath}', 'table')" data-i18n-title="nodes.view_table">
                    <i class="fas fa-list"></i>
                  </button>
                  <button class="node-view-btn" data-view="card" onclick="setNodeViewMode('${jsPath}', 'card')" data-i18n-title="nodes.view_card">
                    <i class="fas fa-th-large"></i>
                  </button>
                </div>
              </div>
              <div class="node-table-wrap">
                <div class="table-responsive mt-3">
                  <table class="table">

                    <tbody></tbody>
                  </table>
                </div>
              </div>
              <div class="node-card-grid"></div>
              <div class="d-flex justify-content-between align-items-center mt-3 px-2 pb-2">
                <div class="batch-operation-buttons" id="batch-operation-buttons-${sub.path}">
                  <button class="btn btn-primary btn-sm rounded-3" onclick="enterBatchMode('${jsPath}')" id="batch-mode-btn-${sub.path}" style="padding: 0.5rem 1rem;">
                    <i class="fas fa-tasks me-1"></i><span data-i18n="actions.batch">批量操作</span>
                  </button>
                </div>
                <div class="batch-action-buttons" id="batch-action-buttons-${sub.path}" style="display: none;">
                  <button class="btn btn-success btn-sm rounded-3 me-2" onclick="executeBatchStatusChange('${jsPath}', true)" style="padding: 0.5rem 1rem;">
                    <i class="fas fa-toggle-on me-1"></i><span data-i18n="actions.enable">启用</span>
                  </button>
                  <button class="btn btn-warning btn-sm rounded-3 me-2" onclick="executeBatchStatusChange('${jsPath}', false)" style="padding: 0.5rem 1rem;">
                    <i class="fas fa-toggle-off me-1"></i><span data-i18n="actions.disable">禁用</span>
                  </button>
                  <button class="btn btn-danger btn-sm rounded-3 me-2" onclick="executeBatchDelete('${jsPath}')" style="padding: 0.5rem 1rem;">
                    <i class="fas fa-trash-alt me-1"></i><span data-i18n="actions.remove">删除</span>
                  </button>
                  <button class="btn btn-outline-secondary btn-sm rounded-3 me-2" onclick="toggleSelectAll('${jsPath}')" id="select-all-btn-${sub.path}" style="padding: 0.5rem 1rem;">
                    <i class="fas fa-check-square me-1"></i><span data-i18n="actions.select_all">全选</span>
                  </button>
                  <button class="btn btn-secondary btn-sm rounded-3" onclick="exitBatchMode('${jsPath}')" style="padding: 0.5rem 1rem;">
                    <i class="fas fa-times me-1"></i><span data-i18n="actions.cancel">取消</span>
                  </button>
                </div>
              </div>
            </div>
          `;
      fragment.appendChild(item);
    }

    listElement.appendChild(fragment);
    window.i18n.translateDOM(listElement); // 翻译新添加的订阅项

    // 确保表头“节点名称”不带 title 属性
    listElement.querySelectorAll('th span[data-i18n="nodes.name"]').forEach((span) => {
      span.removeAttribute('title');
      const th = span.closest('th');
      if (th) {
        th.removeAttribute('title');
      }
    });
  } catch (error) {
    showToast('' + (error.message || _t('common.loading')), 'danger');
  }
}

// 打开添加订阅模态框
function showAddSubscriptionModal() {
  const form = document.getElementById('addSubscriptionForm');
  form.reset();

  const pathInput = form.querySelector('[name="path"]');
  if (pathInput) {
    pathInput.classList.remove('is-invalid', 'is-valid');
  }
  const pathError = form.querySelector('.path-error');
  if (pathError) {
    pathError.textContent = '';
    pathError.style.display = 'none';
  }

  const modal = new bootstrap.Modal(document.getElementById('addSubscriptionModal'));
  modal.show();
}

// 创建订阅
async function createSubscription() {
  const form = document.getElementById('addSubscriptionForm');
  const formData = new FormData(form);
  const name = formData.get('name').trim();
  const path = formData.get('path').trim();

  if (!name) {
    showToast(_t('subscription.name_required'), 'danger');
    form.querySelector('[name="name"]').focus();
    return;
  }

  if (!path || !validateSubscriptionPathFrontend(path)) {
    const pathInput = form.querySelector('[name="path"]');
    pathInput.classList.add('is-invalid');
    pathInput.classList.remove('is-valid');
    form.querySelector('.path-error').textContent = _t('subscription.path_invalid');
    form.querySelector('.path-error').style.display = 'block';
    pathInput.focus();
    return;
  }

  try {
    await apiPost('/api/subscriptions', { name, path });
    showToast(_t('subscription.created'));
    bootstrap.Modal.getInstance(document.getElementById('addSubscriptionModal')).hide();
    form.reset();
    await loadSubscriptions();
  } catch (error) {
    handleApiError(error);
  }
}

// 显示编辑名称模态框
async function showEditNameModal(path, name) {
  const form = document.getElementById('editNameForm');
  form.reset(); // 重置表单以清除之前的值
  form.querySelector('input[name="originalPath"]').value = path;
  form.querySelector('input[name="name"]').value = name;
  form.querySelector('input[name="path"]').value = path;

  // 显示标题和删除按钮
  document.getElementById('editSubscriptionModalTitle').textContent = _t('modal.edit_sub_title');
  document.getElementById('deleteSubscriptionBtn').style.display = 'block';

  // 从数据库加载现有的配置
  try {
    const response = await fetch('/api/subscriptions/' + path);
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        // Subscription data loaded successfully
      }
    }
  } catch (error) {
    console.error('加载订阅配置失败:', error);
    // 即使加载失败也继续打开模态框
  }

  // 存储当前订阅路径
  window.currentSubscriptionPath = path;

  const modal = new bootstrap.Modal(document.getElementById('editNameModal'));
  modal.show();
}

// 在编辑表单中保存订阅信息（用于新建订阅）
async function saveSubscriptionInfoInEditForm() {
  const form = document.getElementById('editNameForm');
  const nameInput = form.querySelector('input[name="name"]');
  const pathInput = form.querySelector('input[name="path"]');
  const pathError = form.querySelector('.path-error');

  try {
    // 验证输入
    if (!nameInput.value.trim()) {
      showToast(_t('subscription.name_required'), 'danger');
      nameInput.focus();
      return false;
    }

    // 验证路径格式
    const path = pathInput.value.trim();
    if (!validateSubscriptionPathFrontend(path)) {
      pathInput.classList.add('is-invalid');
      pathInput.classList.remove('is-valid');
      pathError.textContent = _t('subscription.path_invalid');
      pathError.style.display = 'block';
      pathInput.focus();
      return false;
    }

    // 检查路径是否已存在
    const checkResponse = await fetch('/api/subscriptions/' + path);
    if (checkResponse.ok) {
      pathInput.classList.add('is-invalid');
      pathInput.classList.remove('is-valid');
      pathError.textContent = _t('subscription.path_used');
      pathError.style.display = 'block';
      pathInput.focus();
      return false;
    }

    const response = await fetch('/api/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        name: nameInput.value.trim(),
        path: path
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || '');
    }

    showToast(_t('subscription.created'));

    // 更新 originalPath 为新创建的路径
    form.querySelector('input[name="originalPath"]').value = path;

    // 刷新订阅列表
    await loadSubscriptions();
    return true;
  } catch (error) {
    console.error('保存订阅信息失败:', error);
    showToast('' + error.message, 'danger');
    return false;
  }
}

// 更新订阅信息
async function updateSubscriptionInfo() {
  const form = document.getElementById('editNameForm');
  const originalPath = form.querySelector('input[name="originalPath"]').value;
  const nameInput = form.querySelector('input[name="name"]');
  const pathInput = form.querySelector('input[name="path"]');
  const pathError = form.querySelector('.path-error');

  try {
    // 验证输入
    if (!nameInput.value.trim()) {
      showToast(_t('subscription.name_required'), 'danger');
      nameInput.focus();
      return;
    }

    // 验证路径格式
    const path = pathInput.value.trim();
    if (!validateSubscriptionPathFrontend(path)) {
      pathInput.classList.add('is-invalid');
      pathInput.classList.remove('is-valid');
      pathError.textContent = _t('subscription.path_invalid');
      pathError.style.display = 'block';
      pathInput.focus();
      return;
    }

    // 判断是添加还是编辑
    if (!originalPath) {
      // 添加新订阅
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          name: nameInput.value.trim(),
          path: path
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || '');
      }

      showToast(_t('subscription.created'));
      bootstrap.Modal.getInstance(document.getElementById('editNameModal')).hide();
      form.reset();
      await loadSubscriptions();
      return;
    }

    // 编辑现有订阅 - 如果路径被修改，检查新路径是否已存在
    if (path !== originalPath) {
      const checkResponse = await fetch('/api/subscriptions/' + path);
      if (checkResponse.ok) {
        pathInput.classList.add('is-invalid');
        pathInput.classList.remove('is-valid');
        pathError.textContent = _t('subscription.path_used');
        pathError.style.display = 'block';
        pathInput.focus();
        return;
      }
    }

    const response = await fetch('/api/subscriptions/' + originalPath, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        name: nameInput.value.trim(),
        path: path
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || '');
    }

    showToast(_t('subscription.updated'));
    bootstrap.Modal.getInstance(document.getElementById('editNameModal')).hide();
    await loadSubscriptions();
  } catch (error) {
    console.error('更新订阅信息失败:', error);
    showToast('' + error.message, 'danger');
  }
}

// 确认删除订阅
async function confirmDelete() {
  try {
    const form = document.getElementById('editNameForm');
    const path = form.querySelector('input[name="originalPath"]').value;

    if (!path) {
      showToast('' + _t('subscription.path_invalid'), 'danger');
      return;
    }

    if (!confirm(_t('subscription.delete_confirm'))) {
      return;
    }

    const response = await fetch('/api/subscriptions/' + path, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.message || '');
    }

    // 关闭编辑模态框
    const editModal = bootstrap.Modal.getInstance(document.getElementById('editNameModal'));
    if (editModal) {
      editModal.hide();
    }

    showToast(_t('subscription.deleted'));
    await loadSubscriptions();
  } catch (error) {
    console.error('删除失败:', error);
    showToast('' + error.message, 'danger');
  }
}

// 表单验证工具函数（前端验证）
function validateSubscriptionPathFrontend(path) {
  return /^[a-z0-9-]{5,50}$/.test(path);
}
