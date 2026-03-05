// ============================================================
// storage.js - 本地存储模块
// 所有 chrome.storage.local 读写操作集中在此
// ============================================================

/* 存储键名常量 */
const KEYS = {
  SPACES:     'happy_new_tab_space',
  POPUP_SEL:  'happy_new_tab_popup_selection',
  SETTING:    'happy_new_tab_setting',
  OAUTH:      'happy_new_tab_oauth',
};

/* ---- 工具 ---- */

/**
 * 生成唯一 ID
 * @returns {string}
 */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * 从 URL 获取 favicon 地址（使用 Google favicon 服务）
 * @param {string} url
 * @returns {string}
 */
function faviconUrl(url) {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
  } catch { return ''; }
}

/**
 * 创建默认空间数据（首次安装时使用）
 * @returns {Array}
 */
function defaultSpaces() {
  return [{
    id: genId(), name: 'My Space',
    groups: [{
      id: genId(), name: 'Getting Started',
      tabs: [
        { id: genId(), name: 'Google', url: 'https://www.google.com', favicon: 'https://www.google.com/s2/favicons?domain=google.com&sz=32' },
        { id: genId(), name: 'GitHub', url: 'https://github.com', favicon: 'https://www.google.com/s2/favicons?domain=github.com&sz=32' },
      ]
    }]
  }];
}

/**
 * 创建默认设置数据
 * @returns {Object}
 */
function defaultSetting() {
  return {
    language: 'en', viewMode: 'list',
    syncEnabled: false, syncMethod: 'github',
    github: { owner: '', repo: '', token: '' },
    dropbox: { appKey: '', appSecret: '' },
    jianguoyun: { username: '', password: '' },
  };
}

/* ---- 空间数据 ---- */

/**
 * 读取空间列表数据
 * @returns {Promise<Object>} { data: [], updatedAt: '' }
 */
async function getSpaces() {
  return new Promise(resolve => {
    chrome.storage.local.get(KEYS.SPACES, res => {
      resolve(res[KEYS.SPACES] || { data: defaultSpaces(), updatedAt: new Date().toISOString() });
    });
  });
}

/**
 * 保存空间列表到本地存储
 * @param {Array} spaces
 * @returns {Promise<void>}
 */
async function saveSpaces(spaces) {
  return new Promise((resolve, reject) => {
    const payload = { data: spaces, updatedAt: new Date().toISOString() };
    chrome.storage.local.set({ [KEYS.SPACES]: payload }, () => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve();
    });
  });
}

/* ---- Popup 选择记录 ---- */

/**
 * 读取 Popup 上次选择的空间和分组
 * @returns {Promise<Object>}
 */
async function getPopupSel() {
  return new Promise(resolve => {
    chrome.storage.local.get(KEYS.POPUP_SEL, res => {
      resolve(res[KEYS.POPUP_SEL] || { data: { spaceId: null, groupId: 'new' }, updatedAt: new Date().toISOString() });
    });
  });
}

/**
 * 保存 Popup 选择记录
 * @param {string} spaceId
 * @param {string} groupId
 * @returns {Promise<void>}
 */
async function savePopupSel(spaceId, groupId) {
  return new Promise((resolve, reject) => {
    const payload = { data: { spaceId, groupId }, updatedAt: new Date().toISOString() };
    chrome.storage.local.set({ [KEYS.POPUP_SEL]: payload }, () => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve();
    });
  });
}

/* ---- 设置 ---- */

/**
 * 读取用户设置
 * @returns {Promise<Object>}
 */
async function getSetting() {
  return new Promise(resolve => {
    chrome.storage.local.get(KEYS.SETTING, res => {
      resolve(res[KEYS.SETTING] || { data: defaultSetting(), updatedAt: new Date().toISOString() });
    });
  });
}

/**
 * 保存用户设置
 * @param {Object} data
 * @returns {Promise<void>}
 */
/**
 * 保存用户设置
 * @param {Object} data
 * @param {boolean} keepTimestamp - 为 true 时不更新 updatedAt（用于保存同步配置等不影响数据版本的字段）
 */
async function saveSetting(data, keepTimestamp = false) {
  return new Promise((resolve, reject) => {
    if (keepTimestamp) {
      // 读取现有 updatedAt，保持不变
      chrome.storage.local.get(KEYS.SETTING, res => {
        const existing = res[KEYS.SETTING];
        const payload = { data, updatedAt: existing?.updatedAt || new Date(0).toISOString() };
        chrome.storage.local.set({ [KEYS.SETTING]: payload }, () => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve();
        });
      });
    } else {
      const payload = { data, updatedAt: new Date().toISOString() };
      chrome.storage.local.set({ [KEYS.SETTING]: payload }, () => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve();
      });
    }
  });
}

/* ---- OAuth ---- */

/**
 * 读取 OAuth 授权信息（不参与导入导出）
 * @returns {Promise<Object>}
 */
async function getOAuth() {
  return new Promise(resolve => {
    chrome.storage.local.get(KEYS.OAUTH, res => {
      resolve(res[KEYS.OAUTH] || { dropbox: { accessToken: null, refreshToken: null, expiresAt: 0 } });
    });
  });
}

/**
 * 保存 OAuth 信息
 * @param {Object} data
 * @returns {Promise<void>}
 */
async function saveOAuth(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [KEYS.OAUTH]: data }, () => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve();
    });
  });
}

/* ---- 导入导出 ---- */

/**
 * 导出所有数据（不含 OAuth）
 * @returns {Promise<Object>}
 */
async function exportAll() {
  const [sp, st, ps] = await Promise.all([getSpaces(), getSetting(), getPopupSel()]);
  return {
    exportedAt: new Date().toISOString(), version: '1.0',
    spaces: sp, setting: st, popupSelection: ps
  };
}

/**
 * 覆盖导入所有数据（使用当前时间作为更新时间）
 * @param {Object} imported
 * @returns {Promise<void>}
 */
async function importAll(imported) {
  if (imported.spaces) await saveSpaces(imported.spaces.data);
  if (imported.setting) await saveSetting(imported.setting.data);
  if (imported.popupSelection) {
    const s = imported.popupSelection.data;
    await savePopupSel(s.spaceId, s.groupId);
  }
}

// 挂载到全局
if (typeof window !== 'undefined') {
  window.Storage = { KEYS, genId, faviconUrl, defaultSpaces, defaultSetting, getSpaces, saveSpaces, getPopupSel, savePopupSel, getSetting, saveSetting, getOAuth, saveOAuth, exportAll, importAll };
}
