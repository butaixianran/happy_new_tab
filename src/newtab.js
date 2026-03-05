// ============================================================
// newtab.js - 新标签页主逻辑
// ============================================================

let spaces = [];        // 所有空间数据
let curSpaceId = null;  // 当前选中的空间 ID
let viewMode = 'list';  // 标签显示方式：list/card/icon
let collapsedGroups = new Set(); // 已折叠的分组 ID 集合

// 拖拽状态
let dragType = null;    // 'space' | 'group' | 'tab'
let dragData = {};      // 拖拽元数据

/* ============================================================
   初始化
   ============================================================ */

async function init() {
  // 读取语言和设置
  await initLang();
  const sd = await Storage.getSetting();
  viewMode = sd.data.viewMode || 'list';

  // 读取空间数据
  const sp = await Storage.getSpaces();
  spaces = sp.data || [];
  if (!spaces.length) {
    spaces = Storage.defaultSpaces();
    await Storage.saveSpaces(spaces);
  }

  // 应用语言到 DOM
  applyI18n();

  // 渲染空间列表
  renderSpaces();

  // 选中第一个空间
  if (spaces.length) selectSpace(spaces[0].id);

  // 更新视图按钮状态
  updateViewBtns();

  // 绑定 header 事件
  document.getElementById('btnMenu').addEventListener('click', toggleSidebar);
  document.getElementById('btnViewList').addEventListener('click', () => setView('list'));
  document.getElementById('btnViewCard').addEventListener('click', () => setView('card'));
  document.getElementById('btnViewIcon').addEventListener('click', () => setView('icon'));
  document.getElementById('btnSync').addEventListener('click', doSync);
  document.getElementById('btnRefresh').addEventListener('click', () => location.reload());
  document.getElementById('btnAddSpace').addEventListener('click', () => openSpaceDialog(null));
  document.getElementById('btnSettings').addEventListener('click', () => {
    chrome.tabs.update({ url: chrome.runtime.getURL('options.html') });
  });
  document.getElementById('btnAddGroup').addEventListener('click', () => {
    if (curSpaceId) openGroupDialog(curSpaceId, null);
  });

  // 窄屏默认隐藏侧边栏
  if (window.innerWidth < 640) document.getElementById('sidebar').classList.add('hidden');

  // 监听来自 background 的刷新消息
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === 'REFRESH') reload();
  });
}

async function reload() {
  const sp = await Storage.getSpaces();
  spaces = sp.data || [];
  renderSpaces();
  if (curSpaceId && spaces.find(s => s.id === curSpaceId)) {
    renderGroups(curSpaceId);
  } else if (spaces.length) {
    selectSpace(spaces[0].id);
  }
}

/* ============================================================
   侧边栏
   ============================================================ */

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('hidden');
}

/* ============================================================
   视图模式
   ============================================================ */

async function setView(mode) {
  viewMode = mode;
  updateViewBtns();
  if (curSpaceId) renderGroups(curSpaceId);
  const sd = await Storage.getSetting();
  sd.data.viewMode = mode;
  await Storage.saveSetting(sd.data);
}

function updateViewBtns() {
  document.getElementById('btnViewList').classList.toggle('active', viewMode === 'list');
  document.getElementById('btnViewCard').classList.toggle('active', viewMode === 'card');
  document.getElementById('btnViewIcon').classList.toggle('active', viewMode === 'icon');
}

/* ============================================================
   空间列表渲染
   ============================================================ */

function renderSpaces() {
  const list = document.getElementById('spaceList');
  list.innerHTML = '';
  spaces.forEach(sp => list.appendChild(createSpaceItem(sp)));
}

/**
 * 创建空间列表项 DOM
 * @param {Object} sp - 空间对象
 * @returns {HTMLElement}
 */
function createSpaceItem(sp) {
  const el = document.createElement('div');
  el.className = 'space-item' + (sp.id === curSpaceId ? ' active' : '');
  el.dataset.id = sp.id;
  el.draggable = true;
  el.innerHTML = `
    <span class="sname">${esc(sp.name)}</span>
    <div class="space-actions">
      <button class="icon-btn" data-act="edit" data-tip data-tip-pos="right" data-i18n-tip="editSpace" title="${t('editSpace')}">
        <span class="mi mi-edit"></span>
      </button>
      <button class="icon-btn danger" data-act="del" data-tip data-tip-pos="right" data-i18n-tip="deleteSpace" title="${t('deleteSpace')}">
        <span class="mi mi-delete"></span>
      </button>
    </div>`;

  // 点击切换空间
  el.addEventListener('click', e => {
    if (e.target.closest('[data-act]')) return;
    selectSpace(sp.id);
  });
  el.querySelector('[data-act="edit"]').addEventListener('click', e => { e.stopPropagation(); openSpaceDialog(sp); });
  el.querySelector('[data-act="del"]').addEventListener('click', e => { e.stopPropagation(); deleteSpace(sp.id); });

  // 拖拽排序
  el.addEventListener('dragstart', e => {
    dragType = 'space'; dragData = { spaceId: sp.id };
    e.dataTransfer.effectAllowed = 'move';
  });
  el.addEventListener('dragover', e => { e.preventDefault(); if (dragType === 'space') el.classList.add('drag-over'); });
  el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
  el.addEventListener('drop', async e => {
    e.preventDefault(); el.classList.remove('drag-over');
    if (dragType !== 'space' || dragData.spaceId === sp.id) return;
    const si = spaces.findIndex(s => s.id === dragData.spaceId);
    const di = spaces.findIndex(s => s.id === sp.id);
    if (si === -1 || di === -1) return;
    spaces.splice(di, 0, spaces.splice(si, 1)[0]);
    await Storage.saveSpaces(spaces);
    renderSpaces();
  });

  return el;
}

/* ============================================================
   空间选中
   ============================================================ */

function selectSpace(id) {
  curSpaceId = id;
  const sp = spaces.find(s => s.id === id);
  if (!sp) return;
  document.getElementById('spaceTitle').textContent = sp.name;
  document.querySelectorAll('.space-item').forEach(el => el.classList.toggle('active', el.dataset.id === id));
  renderGroups(id);
}

/* ============================================================
   空间增删改
   ============================================================ */

function openSpaceDialog(sp) {
  const isEdit = !!sp;
  modal(isEdit ? t('editSpace') : t('addSpace'), `
    <div class="form-group">
      <label class="form-label" data-i18n="spaceName">${t('spaceName')}</label>
      <input class="form-input" id="mSpaceName" maxlength="40" value="${esc(sp?.name || '')}">
    </div>`, [
    { label: t('cancel'), cls: 'btn-outline', cb: closeModal },
    { label: t('save'), cls: 'btn-primary', cb: async () => {
      const name = document.getElementById('mSpaceName').value.trim();
      if (!name) return;
      if (isEdit) {
        spaces.find(s => s.id === sp.id).name = name;
        await Storage.saveSpaces(spaces);
        renderSpaces();
        if (curSpaceId === sp.id) document.getElementById('spaceTitle').textContent = name;
      } else {
        const ns = { id: Storage.genId(), name, groups: [] };
        spaces.push(ns);
        await Storage.saveSpaces(spaces);
        renderSpaces();
        selectSpace(ns.id);
      }
      closeModal();
    }}
  ], () => document.getElementById('mSpaceName').focus());
}

async function deleteSpace(id) {
  if (spaces.length <= 1) { toast(t('lastSpaceError'), 'warn'); return; }
  if (!await confirm(t('deleteSpaceConfirm'))) return;
  const idx = spaces.findIndex(s => s.id === id);
  if (idx !== -1) spaces.splice(idx, 1);
  await Storage.saveSpaces(spaces);
  if (curSpaceId === id) { renderSpaces(); selectSpace(spaces[0].id); }
  else renderSpaces();
}

/* ============================================================
   分组渲染
   ============================================================ */

function renderGroups(spaceId) {
  const sp = spaces.find(s => s.id === spaceId);
  const list = document.getElementById('groupList');
  list.innerHTML = '';
  if (!sp) return;
  sp.groups.forEach(g => list.appendChild(createGroupEl(sp, g)));
  bindGroupDropZones(sp);
}

/**
 * 创建分组 DOM 元素
 * @param {Object} sp - 空间
 * @param {Object} g - 分组
 * @returns {HTMLElement}
 */
function createGroupEl(sp, g) {
  const collapsed = collapsedGroups.has(g.id);
  const wrap = document.createElement('div');
  wrap.className = 'group-wrap';
  wrap.dataset.gid = g.id;
  wrap.innerHTML = `
    <div class="group-hd" draggable="true">
      <span class="mi mi-grip" style="font-size:14px;color:var(--text-sec);margin-right:4px;"></span>
      <button class="icon-btn group-collapse-btn" data-act="collapse" title="${collapsed ? '展开' : '折叠'}">
        <span class="mi ${collapsed ? 'mi-chevron-down' : 'mi-chevron-up'}"></span>
      </button>
      <span class="group-name">${esc(g.name)}</span>
      <button class="icon-btn" data-act="edit" title="${t('editGroup')}"><span class="mi mi-edit"></span></button>
      <button class="icon-btn danger" data-act="del" title="${t('deleteGroup')}"><span class="mi mi-delete"></span></button>
      <button class="icon-btn primary" data-act="addtab" title="${t('addTab')}"><span class="mi mi-add"></span></button>
    </div>
    <div class="group-body" data-gbody="${g.id}" ${collapsed ? 'style="display:none;"' : ''}>
      ${renderTabsHTML(g.tabs)}
    </div>`;

  wrap.querySelector('[data-act="collapse"]').addEventListener('click', () => {
    const isNowCollapsed = collapsedGroups.has(g.id);
    if (isNowCollapsed) collapsedGroups.delete(g.id);
    else collapsedGroups.add(g.id);
    const body = wrap.querySelector('[data-gbody]');
    const btn = wrap.querySelector('[data-act="collapse"]');
    const icon = btn.querySelector('.mi');
    if (isNowCollapsed) {
      body.style.display = '';
      icon.className = 'mi mi-chevron-up';
      btn.title = '折叠';
    } else {
      body.style.display = 'none';
      icon.className = 'mi mi-chevron-down';
      btn.title = '展开';
    }
  });

  wrap.querySelector('[data-act="edit"]').addEventListener('click', () => openGroupDialog(sp.id, g));
  wrap.querySelector('[data-act="del"]').addEventListener('click', () => deleteGroup(sp.id, g.id));
  wrap.querySelector('[data-act="addtab"]').addEventListener('click', () => openTabDialog(sp.id, g.id, null));

  // 绑定标签事件
  bindTabEvents(wrap, sp.id, g);

  // 分组拖拽（排序）
  const hd = wrap.querySelector('.group-hd');
  hd.addEventListener('dragstart', e => {
    dragType = 'group'; dragData = { spaceId: sp.id, groupId: g.id };
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  });

  return wrap;
}

/**
 * 绑定分组容器上的 dragover/drop，实现分组排序和标签跨组移动
 * @param {Object} sp - 空间对象
 */
function bindGroupDropZones(sp) {
  document.querySelectorAll('.group-wrap').forEach(wrap => {
    wrap.addEventListener('dragover', e => {
      e.preventDefault();
      if (dragType === 'group') wrap.classList.add('drag-over');
      else if (dragType === 'tab') wrap.querySelector('[data-gbody]')?.classList.add('drag-over');
    });
    wrap.addEventListener('dragleave', () => {
      wrap.classList.remove('drag-over');
      wrap.querySelector('[data-gbody]')?.classList.remove('drag-over');
    });
    wrap.addEventListener('drop', async e => {
      e.preventDefault();
      wrap.classList.remove('drag-over');
      wrap.querySelector('[data-gbody]')?.classList.remove('drag-over');
      const destGid = wrap.dataset.gid;

      if (dragType === 'group') {
        const srcGid = dragData.groupId;
        if (srcGid === destGid) return;
        const si = sp.groups.findIndex(g => g.id === srcGid);
        const di = sp.groups.findIndex(g => g.id === destGid);
        if (si !== -1 && di !== -1) {
          sp.groups.splice(di, 0, sp.groups.splice(si, 1)[0]);
          await Storage.saveSpaces(spaces);
          renderGroups(sp.id);
        }
      } else if (dragType === 'tab') {
        // 跨组移动
        const srcGid = dragData.groupId;
        if (srcGid === destGid) return;
        const srcG = sp.groups.find(g => g.id === srcGid);
        const dstG = sp.groups.find(g => g.id === destGid);
        if (!srcG || !dstG) return;
        const ti = srcG.tabs.findIndex(t => t.id === dragData.tabId);
        if (ti !== -1) {
          dstG.tabs.push(...srcG.tabs.splice(ti, 1));
          await Storage.saveSpaces(spaces);
          renderGroups(sp.id);
        }
      }
    });
  });
}

/* ============================================================
   标签渲染
   ============================================================ */

/**
 * 根据当前视图模式生成标签列表 HTML
 * @param {Array} tabs
 * @returns {string}
 */
function renderTabsHTML(tabs) {
  if (!tabs?.length) return `<div class="group-empty">${t('addTab')} ...</div>`;
  if (viewMode === 'list') return renderListHTML(tabs);
  if (viewMode === 'card') return renderCardHTML(tabs);
  return renderIconHTML(tabs);
}

function renderListHTML(tabs) {
  return `<div class="tabs-list">${tabs.map(tab => `
    <div class="tab-list" draggable="true" data-tid="${tab.id}">
      <img class="tab-favicon" src="${esc(tab.favicon||'')}" onerror="this.style.visibility='hidden'" alt="">
      <span class="tname">${esc(tab.name)}</span>
      <div class="tactions">
        <button class="icon-btn" data-act="edit" data-tid="${tab.id}" title="${t('editTab')}"><span class="mi mi-edit"></span></button>
        <button class="icon-btn danger" data-act="del" data-tid="${tab.id}" title="${t('deleteTab')}"><span class="mi mi-delete"></span></button>
      </div>
    </div>`).join('')}</div>`;
}

function renderCardHTML(tabs) {
  return `<div class="tabs-cards">${tabs.map(tab => `
    <div class="tab-card" draggable="true" data-tid="${tab.id}">
      <img class="tab-favicon" src="${esc(tab.favicon||'')}" onerror="this.style.visibility='hidden'" alt="">
      <span class="tname" title="${esc(tab.name)}">${esc(truncate(tab.name, 40))}</span>
      <div class="tactions">
        <button class="icon-btn" data-act="edit" data-tid="${tab.id}" title="${t('editTab')}"><span class="mi mi-edit" style="font-size:14px;"></span></button>
        <button class="icon-btn danger" data-act="del" data-tid="${tab.id}" title="${t('deleteTab')}"><span class="mi mi-delete" style="font-size:14px;"></span></button>
      </div>
    </div>`).join('')}</div>`;
}

function renderIconHTML(tabs) {
  return `<div class="tabs-icons">${tabs.map(tab => `
    <div class="tab-icon" draggable="true" data-tid="${tab.id}" title="${esc(tab.name)}">
      <img class="tab-favicon" src="${esc(tab.favicon||'')}" onerror="this.style.visibility='hidden'" alt="">
      <span class="tname">${esc(truncate(tab.name, 12))}</span>
    </div>`).join('')}</div>`;
}

/* ============================================================
   标签事件绑定
   ============================================================ */

/**
 * 绑定分组内所有标签的点击、编辑、删除、拖拽事件
 * @param {HTMLElement} wrap - 分组容器
 * @param {string} spaceId
 * @param {Object} g - 分组
 */
function bindTabEvents(wrap, spaceId, g) {
  const body = wrap.querySelector('[data-gbody]');
  if (!body) return;

  // 点击打开标签（排除按钮区域）
  body.addEventListener('click', e => {
    if (e.target.closest('[data-act]')) return;
    const ti = e.target.closest('[data-tid]');
    if (!ti) return;
    const tab = g.tabs.find(t => t.id === ti.dataset.tid);
    if (tab) chrome.tabs.create({ url: tab.url });
  });

  // 编辑 / 删除按钮
  body.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const tid = btn.dataset.tid;
    if (btn.dataset.act === 'edit') {
      const tab = g.tabs.find(t => t.id === tid);
      if (tab) openTabDialog(spaceId, g.id, tab);
    } else if (btn.dataset.act === 'del') {
      deleteTab(spaceId, g.id, tid);
    }
  });

  // 标签内拖拽排序
  body.querySelectorAll('[data-tid]').forEach(el => {
    el.addEventListener('dragstart', e => {
      dragType = 'tab'; dragData = { spaceId, groupId: g.id, tabId: el.dataset.tid };
      e.dataTransfer.effectAllowed = 'move';
      e.stopPropagation();
    });
    el.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); if (dragType === 'tab') el.classList.add('drag-over'); });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', async e => {
      e.preventDefault(); e.stopPropagation(); el.classList.remove('drag-over');
      if (dragType !== 'tab' || dragData.groupId !== g.id || dragData.tabId === el.dataset.tid) return;
      const si = g.tabs.findIndex(t => t.id === dragData.tabId);
      const di = g.tabs.findIndex(t => t.id === el.dataset.tid);
      if (si !== -1 && di !== -1) {
        g.tabs.splice(di, 0, g.tabs.splice(si, 1)[0]);
        await Storage.saveSpaces(spaces);
        renderGroups(spaceId);
      }
    });
  });
}

/* ============================================================
   分组增删改
   ============================================================ */

function openGroupDialog(spaceId, g) {
  const isEdit = !!g;
  modal(isEdit ? t('editGroup') : t('addGroup'), `
    <div class="form-group">
      <label class="form-label">${t('groupName')}</label>
      <input class="form-input" id="mGName" value="${esc(g?.name||'')}">
    </div>`, [
    { label: t('cancel'), cls: 'btn-outline', cb: closeModal },
    { label: t('save'), cls: 'btn-primary', cb: async () => {
      const name = document.getElementById('mGName').value.trim();
      if (!name) return;
      const sp = spaces.find(s => s.id === spaceId);
      if (isEdit) sp.groups.find(x => x.id === g.id).name = name;
      else sp.groups.push({ id: Storage.genId(), name, tabs: [] });
      await Storage.saveSpaces(spaces);
      renderGroups(spaceId);
      closeModal();
    }}
  ], () => document.getElementById('mGName').focus());
}

async function deleteGroup(spaceId, groupId) {
  if (!await confirm(t('deleteGroupConfirm'))) return;
  const sp = spaces.find(s => s.id === spaceId);
  const idx = sp?.groups.findIndex(g => g.id === groupId);
  if (idx !== undefined && idx !== -1) {
    sp.groups.splice(idx, 1);
    await Storage.saveSpaces(spaces);
    renderGroups(spaceId);
  }
}

/* ============================================================
   标签增删改
   ============================================================ */

function openTabDialog(spaceId, groupId, tab) {
  const isEdit = !!tab;
  modal(isEdit ? t('editTab') : t('addTab'), `
    <div class="form-group">
      <label class="form-label">${t('tabName')}</label>
      <input class="form-input" id="mTName" value="${esc(tab?.name||'')}">
    </div>
    <div class="form-group">
      <label class="form-label">${t('tabUrl')}</label>
      <input class="form-input" id="mTUrl" type="url" value="${esc(tab?.url||'')}">
    </div>`, [
    { label: t('cancel'), cls: 'btn-outline', cb: closeModal },
    { label: t('save'), cls: 'btn-primary', cb: async () => {
      const name = document.getElementById('mTName').value.trim();
      const url = document.getElementById('mTUrl').value.trim();
      if (!name || !url) return;
      const sp = spaces.find(s => s.id === spaceId);
      const g = sp?.groups.find(g => g.id === groupId);
      if (!g) return;
      if (isEdit) {
        const tb = g.tabs.find(t => t.id === tab.id);
        if (tb) { tb.name = name; tb.url = url; tb.favicon = Storage.faviconUrl(url); }
      } else {
        g.tabs.push({ id: Storage.genId(), name, url, favicon: Storage.faviconUrl(url) });
      }
      await Storage.saveSpaces(spaces);
      renderGroups(spaceId);
      closeModal();
    }}
  ], () => document.getElementById('mTName').focus());
}

async function deleteTab(spaceId, groupId, tabId) {
  if (!await confirm(t('deleteTabConfirm'))) return;
  const sp = spaces.find(s => s.id === spaceId);
  const g = sp?.groups.find(g => g.id === groupId);
  if (!g) return;
  const idx = g.tabs.findIndex(t => t.id === tabId);
  if (idx !== -1) {
    g.tabs.splice(idx, 1);
    await Storage.saveSpaces(spaces);
    renderGroups(spaceId);
  }
}

/* ============================================================
   同步
   ============================================================ */

async function doSync() {
  const sd = await Storage.getSetting();
  if (!sd.data.syncEnabled) { toast(t('syncFail') + 'Sync is disabled.', 'warn'); return; }
  const oauth = await Storage.getOAuth();
  document.getElementById('btnSync').disabled = true;
  try {
    const res = await chrome.runtime.sendMessage({ type: 'SYNC', setting: sd.data, oauth });
    if (res.ok) { await reload(); toast(t('syncOk'), 'ok'); }
    else toast(t('syncFail') + res.err, 'err');
  } catch (e) { toast(t('syncFail') + e.message, 'err'); }
  finally { document.getElementById('btnSync').disabled = false; }
}

/* ============================================================
   Modal 工具
   ============================================================ */

/**
 * 显示模态对话框
 * @param {string} title
 * @param {string} bodyHtml
 * @param {Array} buttons [{label, cls, cb}]
 * @param {Function} onOpen - 对话框打开后的回调（可选）
 */
function modal(title, bodyHtml, buttons, onOpen) {
  closeModal();
  const root = document.getElementById('modalRoot');
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'activeModal';

  const btns = buttons.map((b, i) => `<button class="btn ${b.cls}" data-bi="${i}">${esc(b.label)}</button>`).join('');
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-hd">
        <span class="modal-title">${esc(title)}</span>
        <button class="icon-btn" id="mClose"><span class="mi mi-close"></span></button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      <div class="modal-ft">${btns}</div>
    </div>`;

  root.appendChild(overlay);
  overlay.querySelector('#mClose').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  buttons.forEach((b, i) => {
    overlay.querySelector(`[data-bi="${i}"]`).addEventListener('click', () => b.cb?.());
  });
  overlay.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') buttons[buttons.length-1]?.cb?.();
  });
  if (onOpen) setTimeout(onOpen, 30);
}

function closeModal() {
  document.getElementById('activeModal')?.remove();
}

/**
 * 显示确认对话框，返回 Promise<boolean>
 * @param {string} msg
 * @returns {Promise<boolean>}
 */
function confirm(msg) {
  return new Promise(resolve => {
    modal(t('ok'), `<p style="font-size:13px;">${esc(msg)}</p>`, [
      { label: t('cancel'), cls: 'btn-outline', cb: () => { closeModal(); resolve(false); } },
      { label: t('ok'), cls: 'btn-danger', cb: () => { closeModal(); resolve(true); } },
    ]);
  });
}

/* ============================================================
   Toast
   ============================================================ */

function toast(msg, type = '', dur = 3000) {
  const w = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = `toast${type ? ' ' + type : ''}`;
  el.textContent = msg;
  w.appendChild(el);
  setTimeout(() => el.remove(), dur);
}

/* ============================================================
   Helpers
   ============================================================ */

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function truncate(s, max) {
  return s && s.length > max ? s.slice(0, max) + '...' : (s || '');
}

/* ============================================================
   启动
   ============================================================ */
document.addEventListener('DOMContentLoaded', init);
