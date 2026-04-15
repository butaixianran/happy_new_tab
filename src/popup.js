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
    // 空间切换后重新检查当前 tab 是否在所选分组中
    checkActiveTabInSelectedGroup();
  });

  document.getElementById('groupSelect').addEventListener('change', e => {
    selGroupId = e.target.value;
    // 分组切换后重新检查当前 tab 是否在所选分组中
    checkActiveTabInSelectedGroup();
  });

  document.getElementById('btnCur').addEventListener('click', saveCurrent);
  document.getElementById('btnAll').addEventListener('click', saveAll);
  const btnRemove = document.getElementById('btnRemoveTag');
  if (btnRemove) {
    // 点击删除按钮：从所选分组删除该标签，保存并关闭 popup
    btnRemove.addEventListener('click', async () => {
      try {
        const spaceId = btnRemove.dataset.spaceId || selSpaceId;
        const groupId = btnRemove.dataset.groupId || selGroupId;
        const tabId = btnRemove.dataset.tabId;
        if (!spaceId || !groupId || !tabId) return;
        await Storage.deleteTab(spaceId, groupId, tabId);
        await Storage.savePopupSel(selSpaceId, selGroupId);
        chrome.runtime.sendMessage({ type: 'NOTIFY_REFRESH' });
        window.close();
      } catch (e) { showResult(t('importErr') + e.message, 'err'); }
    });
  }

  fillGroups(last.groupId);
  // 初始化时检查当前标签是否已存在于所选空间/分组中
  checkActiveTabInSelectedGroup();
}

/**
 * 检查浏览器当前活动 tab 是否已存在于用户在 popup 中选择的空间和分组中
 * - 如果选中的是“新建分组”(value === 'new') 则不进行检查并隐藏删除按钮
 * - 若存在匹配的 tab，则显示删除按钮并将对应 tabId 保存到按钮的 dataset
 */
async function checkActiveTabInSelectedGroup() {
  const btn = document.getElementById('btnRemoveTag');
  if (!btn) return;
  try {
    // 如果选择的是新建分组，则不检查
    if (selGroupId === 'new') { btn.style.display = 'none'; delete btn.dataset.tabId; return; }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) { btn.style.display = 'none'; delete btn.dataset.tabId; return; }
    // 读取最新的 spaces 数据以确保检查基于最新状态
    const spRes = await Storage.getSpaces();
    const sps = spRes.data || [];
    const found = Storage.findTabInGroup(sps, selSpaceId, selGroupId, tab.url);
    if (found) {
      btn.style.display = '';
      btn.dataset.tabId = found.id;
      btn.dataset.spaceId = selSpaceId;
      btn.dataset.groupId = selGroupId;
    } else {
      btn.style.display = 'none';
      delete btn.dataset.tabId;
    }
  } catch (e) {
    btn.style.display = 'none';
    delete btn.dataset.tabId;
  }
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
