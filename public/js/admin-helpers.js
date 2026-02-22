// 页面与复制工具
function openClientPage(event, url) {
  event.preventDefault();
  event.stopPropagation();
  const normalizedUrl = url.startsWith('/') ? url : '/' + url;
  const fullUrl = window.location.origin + normalizedUrl;
  window.open(fullUrl, '_blank');
}

// 复制到剪贴板
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(_t('common.copied'));
  }).catch(() => {
    showToast(_t('common.copy_failed'), 'danger');
  });
}

// 复制订阅链接（用于链接点击）
async function copySubscriptionLink(url, event) {
  event.preventDefault();

  try {
    // 构建完整的URL
    const fullUrl = window.location.origin + '/' + url;

    // 复制到剪贴板
    await navigator.clipboard.writeText(fullUrl);

    // 显示复制成功的提示
    showToast('链接已复制到剪贴板');

    // 可选：打开新窗口
    if (event.ctrlKey || event.metaKey) {
      window.open(fullUrl, '_blank');
    }
  } catch (error) {
    console.error('复制失败:', error);
    showToast('复制失败', 'danger');
  }
}
