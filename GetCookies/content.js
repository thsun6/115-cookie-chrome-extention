// content.js: 检测115.com页面登录状态，登录后通知background捕获cookie

function isLoggedIn() {
  // 115.com登录后页面通常有用户信息元素，可根据实际情况调整
  return !!document.cookie.match(/UID=/);
}

function notifyBackground() {
  chrome.runtime.sendMessage({ action: 'force_capture_cookies' });
}

// 页面加载后检测一次
if (isLoggedIn()) {
  notifyBackground();
}

// 监听DOM变化，检测登录状态变化
let lastLogin = isLoggedIn();
const observer = new MutationObserver(() => {
  const nowLogin = isLoggedIn();
  if (!lastLogin && nowLogin) {
    notifyBackground();
  }
  lastLogin = nowLogin;
});
observer.observe(document.body, { childList: true, subtree: true }); 