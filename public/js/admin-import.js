// 显示导入节点模态框
function showImportNodesModal(path) {
  const form = document.getElementById('importNodesForm');
  form.querySelector('[name="subscriptionPath"]').value = path;
  form.querySelector('[name="importUrl"]').value = '';
  document.getElementById('importResult').style.display = 'none';
  document.getElementById('importProgress').style.display = 'none';

  const modal = new bootstrap.Modal(document.getElementById('importNodesModal'));
  modal.show();
}

// 显示导入节点模态框（带类型选择）
function showImportNodesModalWithType(path, type, event) {
  event && event.stopPropagation();
  const form = document.getElementById('importNodesForm');
  form.querySelector('[name="subscriptionPath"]').value = path;
  form.querySelector('[name="importUrl"]').value = '';
  document.getElementById('importResult').style.display = 'none';
  document.getElementById('importProgress').style.display = 'none';

  // 设置导入类型
  const typeSelect = document.getElementById('importTypeSelect');
  if (typeSelect) {
    typeSelect.value = type;
  }

  const modal = new bootstrap.Modal(document.getElementById('importNodesModal'));
  modal.show();
}

// 导入节点
async function importNodes() {
  const form = document.getElementById('importNodesForm');
  const formData = new FormData(form);
  const path = formData.get('subscriptionPath');
  const importUrl = formData.get('importUrl').trim();

  if (!importUrl) {
    showToast(_t('import.url_required'), 'danger');
    return;
  }

  // 验证 URL 格式
  try {
    new URL(importUrl);
  } catch (e) {
    showToast(_t('import.invalid_url'), 'danger');
    return;
  }

  const progressDiv = document.getElementById('importProgress');
  const resultDiv = document.getElementById('importResult');

  progressDiv.style.display = 'block';
  resultDiv.style.display = 'none';

  try {
    const result = await apiPost(`/api/subscriptions/${path}/import-nodes`, { importUrl });

    progressDiv.style.display = 'none';
    resultDiv.style.display = 'block';
    resultDiv.className = 'alert alert-' + (result.success ? 'success' : 'danger');

    if (result.success) {
      const data = result.data;
      resultDiv.innerHTML = `
            <div class="mb-2"><strong>${_t('common.success')}</strong></div>
            <div>
              <span data-i18n="import.imported">导入:</span> ${data.importedCount} |
              <span data-i18n="import.updated">跳过重复:</span> ${data.updatedCount} |
              <span data-i18n="import.failed">失败:</span> ${data.failedCount}
            </div>
            <div class="mt-2">
              <span data-i18n="import.total_after">导入后总节点数:</span> <strong>${data.totalAfterImport}</strong>
            </div>
          `;
      loadSubscriptions();
      setTimeout(() => {
        bootstrap.Modal.getInstance(document.getElementById('importNodesModal')).hide();
      }, 2000);
    }
  } catch (error) {
    progressDiv.style.display = 'none';
    resultDiv.style.display = 'block';
    resultDiv.className = 'alert alert-danger';
    resultDiv.textContent = error.message || _t('common.error');
  }
}
