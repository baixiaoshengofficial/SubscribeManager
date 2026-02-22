// 进入批量操作模式
function enterBatchMode(subscriptionPath) {
  const nodeListArea = document.getElementById('node-list-' + subscriptionPath);
  const checkboxes = nodeListArea.querySelectorAll('.node-checkbox');
  const operationButtons = document.getElementById('batch-operation-buttons-' + subscriptionPath);
  const actionButtons = document.getElementById('batch-action-buttons-' + subscriptionPath);

  // 显示勾选框
  checkboxes.forEach(checkbox => {
    checkbox.style.display = 'inline-block';
  });

  // 切换按钮显示
  operationButtons.style.display = 'none';
  actionButtons.style.display = 'flex';

  // 标记为批量模式
  nodeListArea.classList.add('batch-mode');

  // 重置所有勾选框
  checkboxes.forEach(cb => {
    cb.checked = false;
  });

  // 重置全选按钮状态
  resetSelectAllButton(subscriptionPath);

  showToast(_t('nodes.batch_select_tip'), 'info');
}

// 退出批量操作模式
function exitBatchMode(subscriptionPath) {
  const nodeListArea = document.getElementById('node-list-' + subscriptionPath);
  const checkboxes = nodeListArea.querySelectorAll('.node-checkbox');
  const operationButtons = document.getElementById('batch-operation-buttons-' + subscriptionPath);
  const actionButtons = document.getElementById('batch-action-buttons-' + subscriptionPath);

  // 隐藏勾选框
  checkboxes.forEach(checkbox => {
    checkbox.style.display = 'none';
  });

  // 切换按钮显示
  operationButtons.style.display = 'flex';
  actionButtons.style.display = 'none';

  // 取消批量模式标记
  nodeListArea.classList.remove('batch-mode');
}

// 重置全选按钮状态
function resetSelectAllButton(subscriptionPath) {
  const selectAllBtn = document.getElementById('select-all-btn-' + subscriptionPath);
  if (selectAllBtn) {
    selectAllBtn.innerHTML = '<i class="fas fa-check-square me-1"></i>' + _t('actions.select_all');
  }
}

// 全选/取消全选功能
function toggleSelectAll(subscriptionPath) {
  const nodeListArea = document.getElementById('node-list-' + subscriptionPath);
  const checkboxes = nodeListArea.querySelectorAll('.node-checkbox');
  const selectAllBtn = document.getElementById('select-all-btn-' + subscriptionPath);

  // 检查当前是否为全选状态
  const checkedCount = nodeListArea.querySelectorAll('.node-checkbox:checked').length;
  const isAllSelected = checkedCount === checkboxes.length && checkboxes.length > 0;

  // 切换选择状态
  checkboxes.forEach(checkbox => {
    checkbox.checked = !isAllSelected;
  });

  // 更新按钮状态
  if (isAllSelected) {
    selectAllBtn.innerHTML = '<i class="fas fa-check-square me-1"></i>' + _t('actions.select_all');
  } else {
    selectAllBtn.innerHTML = '<i class="fas fa-minus-square me-1"></i>' + _t('actions.unselect');
  }
}

// 执行批量删除
async function executeBatchDelete(subscriptionPath) {
  const nodeListArea = document.getElementById('node-list-' + subscriptionPath);
  const checkedNodes = nodeListArea.querySelectorAll('.node-checkbox:checked');

  if (checkedNodes.length === 0) {
    showToast(_t('nodes.batch_delete_none'), 'warning');
    return;
  }

  if (!confirm(_t('nodes.batch_delete_confirm', { count: checkedNodes.length }))) {
    return;
  }

  try {
    let successCount = 0;
    let failCount = 0;

    // 显示进度提示
    showToast(_t('nodes.batch_deleting'), 'info');

    // 批量删除所选节点
    for (const checkbox of checkedNodes) {
      const nodeId = checkbox.value;
      try {
        const response = await fetch('/api/subscriptions/' + subscriptionPath + '/nodes/' + nodeId, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error('删除节点失败:', error);
        failCount++;
      }
    }

    // 显示删除结果
    if (failCount === 0) {
      showToast(_t('nodes.deleted'), 'success');
    } else {
      showToast(_t('nodes.batch_delete_done', { success: successCount, failed: failCount }), 'warning');
    }

    // 退出批量操作模式
    exitBatchMode(subscriptionPath);

    // 重新加载节点列表和订阅信息
    await loadNodeList(subscriptionPath);
    await loadSubscriptions();

  } catch (error) {
    console.error('批量删除失败:', error);
    showToast('' + error.message, 'danger');
  }
};

// 执行批量状态切换
async function executeBatchStatusChange(subscriptionPath, enabled) {
  const nodeListArea = document.getElementById('node-list-' + subscriptionPath);
  const checkedNodes = nodeListArea.querySelectorAll('.node-checkbox:checked');

  if (checkedNodes.length === 0) {
    showToast(_t('nodes.batch_toggle_none'), 'warning');
    return;
  }

  const action = enabled ? _t('actions.enable') : _t('actions.disable');
  if (!confirm(_t('nodes.batch_toggle_confirm', { action, count: checkedNodes.length }))) {
    return;
  }

  try {
    let successCount = 0;
    let failCount = 0;

    // 显示进度提示
    showToast(_t('nodes.batch_toggling', { action }), 'info');

    // 批量操作所选节点
    for (const checkbox of checkedNodes) {
      const nodeId = checkbox.value;
      try {
        const response = await fetch('/api/subscriptions/' + subscriptionPath + '/nodes/' + nodeId, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({ enabled })
        });

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error('操作节点失败:', error);
        failCount++;
      }
    }

    // 显示操作结果
    if (failCount === 0) {
      showToast(_t('common.success'), 'success');
    } else {
      showToast(_t('nodes.batch_toggle_done', { action, success: successCount, failed: failCount }), 'warning');
    }

    // 退出批量操作模式
    exitBatchMode(subscriptionPath);

    // 重新加载节点列表和订阅信息
    await loadNodeList(subscriptionPath);
    await loadSubscriptions();

  } catch (error) {
    console.error('批量操作失败:', error);
    showToast('' + error.message, 'danger');
  }
}
