// popup.js: 展示115.com cookie，支持刷新和一键复制

const cookieList = document.getElementById('cookie-list');
const refreshBtn = document.getElementById('refresh');
const copyBtn = document.getElementById('copy');
const statusDiv = document.getElementById('status');
const getQrcodeBtn = document.getElementById('get-qrcode');
const qrcodeDiv = document.getElementById('qrcode');
const qrStatusDiv = document.getElementById('qr-status');

// get static token UI elements
const showTokenBtn = document.getElementById('show-token');
const copyTokenBtn = document.getElementById('copy-token');
const tokenDisplayDiv = document.getElementById('token-display');

let polling = false;
let pollTimer = null;
let lastPayload = null;
let loginData = null;

function renderCookies(cookies) {
  if (!cookies || Object.keys(cookies).length === 0) {
    cookieList.textContent = '未捕获到115.com的cookie，请先登录115.com';
    return;
  }
  cookieList.innerHTML = '';
  for (const [k, v] of Object.entries(cookies)) {
    const div = document.createElement('div');
    div.textContent = `${k} = ${v}`;
    cookieList.appendChild(div);
  }
}

function loadCookies() {
  statusDiv.textContent = '加载中...';
  chrome.storage.local.get('cookies_115', (result) => {
    renderCookies(result.cookies_115);
    statusDiv.textContent = '';
  });
}

refreshBtn.onclick = loadCookies;

copyBtn.onclick = async () => {
  chrome.storage.local.get('cookies_115', (result) => {
    const cookies = result.cookies_115;
    if (!cookies || Object.keys(cookies).length === 0) {
      statusDiv.textContent = '没有可复制的cookie';
      return;
    }
    const text = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    navigator.clipboard.writeText(text).then(() => {
      statusDiv.textContent = '已复制到剪贴板';
      setTimeout(() => statusDiv.textContent = '', 1500);
    }, () => {
      statusDiv.textContent = '复制失败';
    });
  });
};

async function startQrcodeLogin() {
  // Reset previous login token UI
  loginData = null;
  showTokenBtn.disabled = true;
  copyTokenBtn.disabled = true;
  tokenDisplayDiv.style.display = 'none';
  getQrcodeBtn.disabled = true;
  qrStatusDiv.textContent = '正在获取二维码...';
  qrcodeDiv.innerHTML = '';
  console.log('[115插件] popup.js: 请求二维码token');
  // 1. 获取二维码token
  chrome.runtime.sendMessage({ action: 'get_qrcode_token' }, (resp) => {
    console.log('[115插件] popup.js: get_qrcode_token响应', resp);
    if (!resp || !resp.data || !resp.data.data) {
      qrStatusDiv.textContent = '二维码获取失败';
      getQrcodeBtn.disabled = false;
      console.error('[115插件] popup.js: 二维码响应异常', resp);
      return;
    }
    const token = resp.data.data;
    lastPayload = { uid: token.uid, time: token.time, sign: token.sign };
    // Persist payload in local storage
    chrome.storage.local.set({ 'qrcode_payload': lastPayload });
    console.log('[115插件] popup.js: 二维码token数据', token);
    // 2. 渲染二维码图片
    try {
      new QRCode(qrcodeDiv, { text: token.qrcode, width: 200, height: 200 });
      qrStatusDiv.textContent = '请使用115 APP扫码登录';
      console.log('[115插件] popup.js: 二维码生成成功');
      polling = true;
      pollQrcodeStatusLoop();
    } catch (e) {
      qrStatusDiv.textContent = '二维码生成失败';
      getQrcodeBtn.disabled = false;
      console.error('[115插件] popup.js: 二维码生成失败', e);
      return;
    }
  });
}

function pollQrcodeStatusLoop() {
  if (!polling || !lastPayload) return;
  chrome.runtime.sendMessage({ action: 'poll_qrcode_status', payload: lastPayload }, (resp) => {
    if (!resp || !resp.data || !resp.data.data) {
      qrStatusDiv.textContent = '二维码状态获取失败';
      getQrcodeBtn.disabled = false;
      polling = false;
      return;
    }
    const status = resp.data.data.status;
    if (status === 0) {
      qrStatusDiv.textContent = '等待扫码...';
      pollTimer = setTimeout(pollQrcodeStatusLoop, 1500);
    } else if (status === 1) {
      qrStatusDiv.textContent = '已扫码，请在手机确认登录';
      pollTimer = setTimeout(pollQrcodeStatusLoop, 1500);
    } else if (status === 2) {
      qrStatusDiv.textContent = '扫码成功，正在获取登录结果...';
      // 获取扫码登录结果并保存
      chrome.runtime.sendMessage({ action: 'post_qrcode_result', payload: lastPayload, app: 'web' }, (resp2) => {
        if (!resp2 || !resp2.data || !resp2.data.data || !resp2.data.data.cookie) {
          qrStatusDiv.textContent = '获取登录结果失败';
          getQrcodeBtn.disabled = false;
          polling = false;
          return;
        }
        // 保存登录数据并启用显示/复制按钮
        loginData = resp2.data.data;
        showTokenBtn.disabled = false;
        copyTokenBtn.disabled = false;
        tokenDisplayDiv.style.display = 'none';
        // 注入cookie
        chrome.runtime.sendMessage({ action: 'inject_cookies', cookies: resp2.data.data.cookie }, (resp3) => {
          if (resp3 && resp3.ok) {
            qrStatusDiv.textContent = '登录成功，cookie已注入，可直接使用';
            loadCookies();
          } else {
            qrStatusDiv.textContent = 'cookie注入失败';
          }
          getQrcodeBtn.disabled = false;
          polling = false;
        });
      });
    } else if (status === -1) {
      qrStatusDiv.textContent = '二维码已过期，请重新获取';
      getQrcodeBtn.disabled = false;
      polling = false;
    } else if (status === -2) {
      qrStatusDiv.textContent = '扫码已取消';
      getQrcodeBtn.disabled = false;
      polling = false;
    } else {
      qrStatusDiv.textContent = '未知状态，扫码中止';
      getQrcodeBtn.disabled = false;
      polling = false;
    }
  });
}

getQrcodeBtn.onclick = () => {
  if (polling && pollTimer) {
    clearTimeout(pollTimer);
    polling = false;
  }
  startQrcodeLogin();
};

// show and copy loginToken logic
showTokenBtn.onclick = () => {
  if (loginData) {
    tokenDisplayDiv.textContent = JSON.stringify(loginData);
    tokenDisplayDiv.style.display = 'block';
  }
};
copyTokenBtn.onclick = () => {
  if (loginData) {
    navigator.clipboard.writeText(JSON.stringify(loginData)).then(() => {
      statusDiv.textContent = '登录Token 已复制';
      setTimeout(() => statusDiv.textContent = '', 1500);
    }, () => {
      statusDiv.textContent = '登录Token 复制失败';
      setTimeout(() => statusDiv.textContent = '', 1500);
    });
  }
};

// 初始加载
loadCookies(); 