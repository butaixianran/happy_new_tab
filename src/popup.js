// ============================================================
// popup.js - Popup 页面逻辑
// ============================================================

let spaces = [];
let selSpaceId = null;
let selGroupId = 'new';

async function init() {
  await initLang();
  applyI18n();

  const sp = await Storage.getSpaces();
  spaces = sp.data || [];

  const sel = await Storage.getPopupSel();
  const last = sel.data || {};

  fillSpaces(last.spaceId);

  document.getElementById('spaceSelect').addEventListener('change', e => {
    selSpaceId = e.target.value;
    fillGroups(null);
  });

  document.getElementById('groupSelect').addEventListener('change', e => {
    selGroupId = e.target.value;
  });

  document.getElementById('btnCur').addEventListener('click', saveCurrent);
  document.getElementById('btnAll').addEventListener('click', saveAll);

  fillGroups(last.groupId);
}

/**
 * 填充空间下拉列表
 * @param {string|null} lastId - 上次选中的空间 ID
 */
function fillSpaces(lastId) {
  const sel = document.getElementById('spaceSelect');
  sel.innerHTML = '';
  spaces.forEach(sp => {
    const opt = document.createElement('option');
    opt.value = sp.id;
    opt.textContent = sp.name;
    sel.appendChild(opt);
  });
  if (lastId && spaces.find(s => s.id === lastId)) {
    sel.value = lastId;
    selSpaceId = lastId;
  } else if (spaces.length) {
    sel.value = spaces[0].id;
    selSpaceId = spaces[0].id;
  }
}

/**
 * 填充分组下拉列表
 * @param {string|null} lastId - 上次选中的分组 ID
 */
function fillGroups(lastId) {
  const sel = document.getElementById('groupSelect');
  sel.innerHTML = '';

  // 新建分组选项
  const newOpt = document.createElement('option');
  newOpt.value = 'new';
  newOpt.textContent = t('newGroupOpt');
  sel.appendChild(newOpt);

  const sp = spaces.find(s => s.id === selSpaceId);
  if (sp) {
    sp.groups.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = g.name;
      sel.appendChild(opt);
    });
  }

  // 恢复上次选择
  if (lastId && lastId !== 'new' && sp?.groups.find(g => g.id === lastId)) {
    sel.value = lastId;
    selGroupId = lastId;
  } else {
    sel.value = 'new';
    selGroupId = 'new';
  }
}

/**
 * 获取或新建目标分组
 * @returns {Object} 分组对象
 */
function getOrMakeGroup() {
  const sp = spaces.find(s => s.id === selSpaceId);
  if (!sp) throw new Error('Space not found');
  if (selGroupId === 'new') {
    const g = { id: Storage.genId(), name: new Date().toLocaleString(), tabs: [] };
    sp.groups.push(g);
    return g;
  }
  const g = sp.groups.find(g => g.id === selGroupId);
  if (!g) throw new Error('Group not found');
  return g;
}

async function saveCurrent() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) { showResult(t('noTabs'), 'warn'); return; }
    const g = getOrMakeGroup();
    g.tabs.push({ id: Storage.genId(), name: tab.title || tab.url, url: tab.url, favicon: Storage.faviconUrl(tab.url) });
    await Storage.saveSpaces(spaces);
    await Storage.savePopupSel(selSpaceId, selGroupId);
    chrome.runtime.sendMessage({ type: 'NOTIFY_REFRESH' });
    showResult(t('tabSaved'), 'ok');
  } catch (e) { showResult(t('importErr') + e.message, 'err'); }
}

async function saveAll() {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    if (!tabs?.length) { showResult(t('noTabs'), 'warn'); return; }
    const g = getOrMakeGroup();
    tabs.forEach(tab => {
      g.tabs.push({ id: Storage.genId(), name: tab.title || tab.url, url: tab.url, favicon: Storage.faviconUrl(tab.url) });
    });
    await Storage.saveSpaces(spaces);
    await Storage.savePopupSel(selSpaceId, selGroupId);
    chrome.runtime.sendMessage({ type: 'NOTIFY_REFRESH' });
    showResult(`${tabs.length} ${t('tabsSaved')}`, 'ok');
  } catch (e) { showResult(t('importErr') + e.message, 'err'); }
}

function showResult(msg, type) {
  const el = document.getElementById('result');
  el.className = `alert alert-${type}`;
  el.textContent = msg;
  setTimeout(() => { el.className = ''; el.textContent = ''; }, 3000);
}

document.addEventListener('DOMContentLoaded', init);
