// 显示 Subconverter 配置模态框
function showSubconverterModal(path, name) {
  const form = document.getElementById('subconverterForm');
  form.querySelector('[name="subscriptionPath"]').value = path;

  // 获取当前订阅配置
  fetch(`/api/subscriptions/${path}`)
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        const sub = result.data;
        form.querySelector('[name="subconvertUrl"]').value = sub.subconvert_url || '';
        form.querySelector('[name="customTemplate"]').value = sub.custom_template || '';
        form.querySelector('[name="useDefaultTemplate"]').checked = sub.use_default_template !== undefined ? sub.use_default_template : false;
        toggleUseDefaultTemplate();
      }
    })
    .catch(error => console.error('获取订阅配置失败:', error));

  const modal = new bootstrap.Modal(document.getElementById('subconverterModal'));
  modal.show();
}

// 切换"使用默认模板"选项的显示状态
function toggleUseDefaultTemplate() {
  const subconvertUrl = document.getElementById('subconvertUrl').value.trim();
  const customTemplate = document.getElementById('customTemplate').value.trim();
  const wrapper = document.getElementById('useDefaultTemplateWrapper');

  // 如果填写了 Subconverter API URL 或自定义模板 URL，隐藏"使用默认模板"选项
  if (subconvertUrl || customTemplate) {
    wrapper.style.display = 'none';
  } else {
    wrapper.style.display = 'block';
  }
}

// 保存 Subconverter 配置
async function saveSubconverterConfig() {
  const form = document.getElementById('subconverterForm');
  const formData = new FormData(form);
  const path = formData.get('subscriptionPath');
  const subconvertUrl = formData.get('subconvertUrl').trim() || null;
  const customTemplate = formData.get('customTemplate').trim() || null;
  const useDefaultTemplate = form.querySelector('[name="useDefaultTemplate"]').checked;

  try {
    await apiPut(`/api/subscriptions/${path}/subconverter`, {
      subconvert_url: subconvertUrl,
      custom_template: customTemplate,
      use_default_template: useDefaultTemplate
    });
    showToast(_t('common.success'), 'success');
    bootstrap.Modal.getInstance(document.getElementById('subconverterModal')).hide();
    loadSubscriptions();
  } catch (error) {
    handleApiError(error);
  }
}
