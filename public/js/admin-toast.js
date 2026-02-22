// 显示Toast提示
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');

  // 设置消息
  toastMessage.textContent = message;

  // 设置类型
  toast.className = toast.className.replace(/bg-\w+/, '');
  toast.classList.add('bg-' + type);

  // 显示Toast
  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();
}
