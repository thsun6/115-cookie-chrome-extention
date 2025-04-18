// 监听115.com及其子域下cookie变化，捕获所有cookie并存储到chrome.storage.local

const DOMAIN = '115.com';

// 捕获并存储所有115.com下的cookie
async function captureCookies() {
  const allCookies = await chrome.cookies.getAll({});
  const cookieObj = {};
  for (const c of allCookies) {
    if (c.domain && c.domain.includes(DOMAIN)) {
      cookieObj[c.name] = c.value;
    }
  }
  await chrome.storage.local.set({ 'cookies_115': cookieObj });
}

// 监听cookie变化
chrome.cookies.onChanged.addListener((changeInfo) => {
  const { cookie } = changeInfo;
  if (cookie && cookie.domain && cookie.domain.includes(DOMAIN)) {
    captureCookies();
  }
});

// 监听tab更新（如页面加载完成时尝试捕获一次）
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url && tab.url.includes(DOMAIN) && changeInfo.status === 'complete') {
    captureCookies();
  }
});

// 监听content script消息，强制捕获cookie
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === 'force_capture_cookies') {
    captureCookies();
  }
});

// 获取二维码token
async function getQrcodeToken() {
  const api = "https://qrcodeapi.115.com/api/1.0/web/1.0/token/";
  try {
    console.log('[115插件] 请求二维码token:', api);
    const resp = await fetch(api);
    const data = await resp.json();
    console.log('[115插件] 二维码token响应:', data);
    return data;
  } catch (e) {
    console.error('[115插件] 获取二维码token异常:', e);
    throw e;
  }
}

// 轮询二维码扫码状态
async function pollQrcodeStatus(payload) {
  const api = "https://qrcodeapi.115.com/get/status/?" + new URLSearchParams(payload).toString();
  const resp = await fetch(api);
  return await resp.json();
}

// 获取扫码登录结果（含cookie）
async function postQrcodeResult(uid, app = "web") {
  const api = `https://passportapi.115.com/app/1.0/${app}/1.0/login/qrcode/`;
  const body = new URLSearchParams({ account: uid, app });
  const resp = await fetch(api, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  return await resp.json();
}

// 注入cookie到115.com
async function injectCookies(cookieObj) {
  for (const [name, value] of Object.entries(cookieObj)) {
    await chrome.cookies.set({
      url: "https://115.com/",
      name,
      value,
      domain: ".115.com",
      path: "/",
      secure: true,
      httpOnly: true,
      sameSite: 'no_restriction'
    });
  }
  await captureCookies();
}

// 监听popup消息
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === 'get_qrcode_token') {
    console.log('[115插件] 收到get_qrcode_token消息');
    getQrcodeToken().then(data => sendResponse({ data })).catch(e => sendResponse({ error: e.toString() }));
    return true;
  }
  if (msg && msg.action === 'poll_qrcode_status') {
    pollQrcodeStatus(msg.payload).then(data => sendResponse({ data })).catch(e => sendResponse({ error: e.toString() }));
    return true;
  }
  if (msg && msg.action === 'post_qrcode_result') {
    const uid = msg.payload && msg.payload.uid;
    postQrcodeResult(uid, msg.app).then(data => sendResponse({ data })).catch(e => sendResponse({ error: e.toString() }));
    return true;
  }
  if (msg && msg.action === 'inject_cookies') {
    injectCookies(msg.cookies).then(() => sendResponse({ ok: true })).catch(e => sendResponse({ error: e.toString() }));
    return true;
  }
});

// 插件启动时初始化一次
captureCookies(); 