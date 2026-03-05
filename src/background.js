// ============================================================
// background.js - Service Worker
// 负责所有远程服务器访问（同步操作）和扩展初始化
// ============================================================

const KEYS = {
  SPACES: 'happy_new_tab_space',
  POPUP_SEL: 'happy_new_tab_popup_selection',
  SETTING: 'happy_new_tab_setting',
  OAUTH: 'happy_new_tab_oauth',
};

/* ---- 扩展安装初始化 ---- */

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    initDefaults();
  }
});

/**
 * 首次安装时写入默认数据
 */
function initDefaults() {
  const id1 = genId(), id2 = genId(), id3 = genId(), id4 = genId();
  const EPOCH = new Date(0).toISOString(); // 初始占位时间，确保第一次同步时远程数据优先
  chrome.storage.local.set({
    [KEYS.SPACES]: {
      data: [{
        id: id1, name: 'My Space',
        groups: [{
          id: id2, name: 'Getting Started',
          tabs: [
            { id: id3, name: 'Google', url: 'https://www.google.com', favicon: 'https://www.google.com/s2/favicons?domain=google.com&sz=32' },
            { id: id4, name: 'GitHub', url: 'https://github.com', favicon: 'https://www.google.com/s2/favicons?domain=github.com&sz=32' },
          ]
        }]
      }],
      updatedAt: EPOCH
    },
    [KEYS.SETTING]: {
      data: {
        language: 'en', viewMode: 'list',
        syncEnabled: false, syncMethod: 'github',
        github: { owner: '', repo: '', token: '' },
        dropbox: { appKey: '', appSecret: '' },
        jianguoyun: { username: '', password: '' },
      },
      updatedAt: EPOCH
    }
  });
}

/**
 * 将字符串以 UTF-8 编码转为 Base64
 * 原理：encodeURIComponent 输出 UTF-8 的 %XX 百分号编码，
 *       再把每个 %XX 还原成对应字节的 Latin-1 字符，最后 btoa 编码。
 * 不使用任何废弃 API，不依赖 TextEncoder。
 * @param {string} str
 * @returns {string} base64 字符串
 */
function utf8ToBase64(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  ));
}

/**
 * 将 Base64 字符串以 UTF-8 解码为字符串
 * 原理：atob 还原 Latin-1 字节字符串，
 *       每个字节转成 %XX 形式，再 decodeURIComponent 还原 UTF-8。
 * 不使用任何废弃 API，不依赖 TextDecoder。
 * @param {string} b64
 * @returns {string}
 */
function base64ToUtf8(b64) {
  return decodeURIComponent(atob(b64).split('').map(c =>
    '%' + c.charCodeAt(0).toString(16).padStart(2, '0')
  ).join(''));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/* ---- 消息监听 ---- */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case 'SYNC':
      doSync(msg.setting, msg.oauth)
        .then(r => sendResponse({ ok: true, msg: r }))
        .catch(e => sendResponse({ ok: false, err: e.message }));
      return true;

    case 'DROPBOX_AUTH':
      doDropboxAuth(msg.appKey, msg.appSecret)
        .then(r => sendResponse({ ok: true, data: r }))
        .catch(e => sendResponse({ ok: false, err: e.message }));
      return true;

    case 'GET_REDIRECT_URI':
      sendResponse({ uri: chrome.identity.getRedirectURL() });
      return false;

    case 'NOTIFY_REFRESH':
      // 通知所有已打开的新标签页刷新数据
      chrome.tabs.query({}, tabs => {
        tabs.forEach(tab => {
          if (tab.url && tab.url.includes('newtab.html')) {
            chrome.tabs.sendMessage(tab.id, { type: 'REFRESH' }).catch(() => {});
          }
        });
      });
      sendResponse({ ok: true });
      return false;

    default:
      sendResponse({ ok: false, err: 'Unknown message' });
      return false;
  }
});

/* ---- 读取本地全量数据 ---- */

async function getAllLocal() {
  return new Promise(resolve => {
    chrome.storage.local.get([KEYS.SPACES, KEYS.SETTING, KEYS.POPUP_SEL], res => {
      resolve({
        spaces: res[KEYS.SPACES] || { data: [], updatedAt: new Date(0).toISOString() },
        setting: res[KEYS.SETTING] || { data: {}, updatedAt: new Date(0).toISOString() },
        popupSel: res[KEYS.POPUP_SEL] || { data: {}, updatedAt: new Date(0).toISOString() },
      });
    });
  });
}

/* ---- 合并本地和远程数据 ---- */

/**
 * 比较本地与远程三类数据的更新时间，用较新的覆盖较旧的，
 * 并返回是否需要把本地更新推送到远程。
 * @param {Object} local
 * @param {Object} remote
 * @returns {Promise<Object|null>} 需要上传则返回数据对象，否则 null
 */
async function mergeAndSave(local, remote) {
  let needUpload = false;
  const merged = { spaces: { ...local.spaces }, setting: { ...local.setting }, popupSel: { ...local.popupSel } };

  // 比较空间数据
  if (remote.spaces && new Date(remote.spaces.updatedAt) > new Date(local.spaces.updatedAt)) {
    merged.spaces = remote.spaces;
  } else if (new Date(local.spaces.updatedAt) > new Date(remote.spaces?.updatedAt || 0)) {
    needUpload = true;
  }

  // 比较设置数据
  if (remote.setting && new Date(remote.setting.updatedAt) > new Date(local.setting.updatedAt)) {
    merged.setting = remote.setting;
  } else if (new Date(local.setting.updatedAt) > new Date(remote.setting?.updatedAt || 0)) {
    needUpload = true;
  }

  // 比较 Popup 选择记录
  const rps = remote.popupSelection || remote.popupSel;
  if (rps && new Date(rps.updatedAt) > new Date(local.popupSel.updatedAt)) {
    merged.popupSel = rps;
  } else if (new Date(local.popupSel.updatedAt) > new Date(rps?.updatedAt || 0)) {
    needUpload = true;
  }

  // 保存合并结果到本地
  await new Promise(resolve => {
    chrome.storage.local.set({
      [KEYS.SPACES]: merged.spaces,
      [KEYS.SETTING]: merged.setting,
      [KEYS.POPUP_SEL]: merged.popupSel,
    }, resolve);
  });

  if (needUpload) {
    return {
      exportedAt: new Date().toISOString(), version: '1.0',
      spaces: merged.spaces, setting: merged.setting,
      popupSelection: merged.popupSel,
    };
  }
  return null;
}

/* ---- 同步入口 ---- */

async function doSync(setting, oauth) {
  if (!setting || !setting.syncEnabled) throw new Error('Sync is disabled');
  const local = await getAllLocal();
  switch (setting.syncMethod) {
    case 'github': return syncGithub(setting.github, local);
    case 'dropbox': return syncDropbox(setting.dropbox, oauth?.dropbox || {}, local);
    case 'jianguoyun': return syncJianguoyun(setting.jianguoyun, local);
    default: throw new Error('Unknown sync method');
  }
}

/* ---- GitHub 同步 ---- */

async function syncGithub(cfg, local) {
  const { owner, repo, token } = cfg;
  if (!owner || !repo || !token) throw new Error('GitHub configuration incomplete');

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/happy_new_tab/sync_data.json`;
  const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };

  // 获取远程文件
  let remoteSha = null, remoteData = null;
  try {
    const r = await fetch(apiUrl, { headers });
    if (r.ok) {
      const info = await r.json();
      remoteSha = info.sha;
      remoteData = JSON.parse(base64ToUtf8(info.content.replace(/\n/g, '')));
    } else if (r.status !== 404) {
      throw new Error(`GitHub GET failed: ${r.status}`);
    }
  } catch (e) {
    if (!e.message.includes('404')) throw e;
  }

  // 合并数据
  const uploadData = await mergeAndSave(local, remoteData || {});

  // 上传（如需要）
  if (uploadData || !remoteData) {
    const content = utf8ToBase64(JSON.stringify(uploadData || {
      exportedAt: new Date().toISOString(), version: '1.0',
      spaces: local.spaces, setting: local.setting, popupSelection: local.popupSel,
    }, null, 2));

    const body = { message: 'Sync from Happy New Tab', content };
    if (remoteSha) body.sha = remoteSha;

    const r = await fetch(apiUrl, { method: 'PUT', headers, body: JSON.stringify(body) });
    if (!r.ok) { const e = await r.json(); throw new Error(e.message || `GitHub PUT failed: ${r.status}`); }
  }
  return 'Sync completed';
}

/* ---- Dropbox OAuth ---- */

async function doDropboxAuth(appKey, appSecret) {
  const redirectUri = chrome.identity.getRedirectURL();
  const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${appKey}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&token_access_type=offline`;

  const responseUrl = await new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, url => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(url);
    });
  });

  const code = new URL(responseUrl).searchParams.get('code');
  if (!code) throw new Error('Authorization code not received');

  const r = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, grant_type: 'authorization_code', client_id: appKey, client_secret: appSecret, redirect_uri: redirectUri })
  });
  if (!r.ok) throw new Error('Failed to get Dropbox access token');

  const data = await r.json();
  const expiresAt = Date.now() + (data.expires_in * 1000);

  // 保存 token
  const oauth = await new Promise(resolve => chrome.storage.local.get(KEYS.OAUTH, res => resolve(res[KEYS.OAUTH] || {})));
  oauth.dropbox = { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt };
  await new Promise(resolve => chrome.storage.local.set({ [KEYS.OAUTH]: oauth }, resolve));

  return { authorized: true };
}

/* ---- Dropbox 同步 ---- */

async function syncDropbox(cfg, dbOAuth, local) {
  if (!dbOAuth?.accessToken) throw new Error('Dropbox not authorized. Please authorize first.');

  let { accessToken, refreshToken, expiresAt } = dbOAuth;

  // 检查 token 是否过期
  if (Date.now() >= expiresAt) {
    const r = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ refresh_token: refreshToken, grant_type: 'refresh_token', client_id: cfg.appKey, client_secret: cfg.appSecret })
    });
    if (!r.ok) throw new Error('Failed to refresh Dropbox token');
    const d = await r.json();
    accessToken = d.access_token;
    expiresAt = Date.now() + (d.expires_in * 1000);

    // 保存新 token
    const oauth = await new Promise(resolve => chrome.storage.local.get(KEYS.OAUTH, res => resolve(res[KEYS.OAUTH] || {})));
    oauth.dropbox = { ...oauth.dropbox, accessToken, expiresAt };
    await new Promise(resolve => chrome.storage.local.set({ [KEYS.OAUTH]: oauth }, resolve));
  }

  const filePath = '/happy_new_tab/sync_data.json';
  let remoteData = null;

  // 下载远程文件
  try {
    const r = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Dropbox-API-Arg': JSON.stringify({ path: filePath }) }
    });
    if (r.ok) remoteData = await r.json();
    else if (r.status !== 409) throw new Error(`Dropbox download failed: ${r.status}`);
  } catch (e) {
    if (!e.message.includes('409') && !e.message.includes('not_found')) throw e;
  }

  const uploadData = await mergeAndSave(local, remoteData || {});

  // 上传
  const toUpload = uploadData || { exportedAt: new Date().toISOString(), version: '1.0', spaces: local.spaces, setting: local.setting, popupSelection: local.popupSel };
  const r = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/octet-stream', 'Dropbox-API-Arg': JSON.stringify({ path: filePath, mode: 'overwrite' }) },
    body: JSON.stringify(toUpload)
  });
  if (!r.ok) throw new Error(`Dropbox upload failed: ${r.status}`);
  return 'Sync completed';
}

/* ---- 坚果云 WebDAV 同步 ---- */

async function syncJianguoyun(cfg, local) {
  const { username, password } = cfg;
  if (!username || !password) throw new Error('Jianguoyun configuration incomplete');

  const base = 'https://dav.jianguoyun.com/dav';
  const auth = 'Basic ' + btoa(`${username}:${password}`);
  const dirUrl = `${base}/happy_new_tab/`;
  const fileUrl = `${base}/happy_new_tab/sync_data.json`;

  // 创建目录（405 表示已存在）
  const mk = await fetch(dirUrl, { method: 'MKCOL', headers: { Authorization: auth } });
  if (!mk.ok && mk.status !== 405) throw new Error(`WebDAV MKCOL failed: ${mk.status}`);

  // 获取远程文件
  let remoteData = null;
  const get = await fetch(fileUrl, { method: 'GET', headers: { Authorization: auth } });
  if (get.ok) {
    try { remoteData = await get.json(); } catch {}
  } else if (get.status !== 404) {
    throw new Error(`WebDAV GET failed: ${get.status}`);
  }

  const uploadData = await mergeAndSave(local, remoteData || {});
  const toUpload = uploadData || { exportedAt: new Date().toISOString(), version: '1.0', spaces: local.spaces, setting: local.setting, popupSelection: local.popupSel };

  const put = await fetch(fileUrl, {
    method: 'PUT',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(toUpload)
  });
  if (!put.ok) throw new Error(`WebDAV PUT failed: ${put.status}`);
  return 'Sync completed';
}
