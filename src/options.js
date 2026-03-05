// ============================================================
// options.js - 选项页面逻辑
// ============================================================

let setting = {};   // 当前设置数据
let curPage = '';   // 当前激活的页面

/* ============================================================
   初始化
   ============================================================ */

async function init() {
  await initLang();
  const sd = await Storage.getSetting();
  setting = sd.data || Storage.defaultSetting();
  applyI18n();

  // Header 按钮
  document.getElementById('btnMenu').addEventListener('click', () => {
    document.getElementById('optSidebar').classList.toggle('hidden');
  });
  document.getElementById('btnRefresh').addEventListener('click', () => location.reload());
  document.getElementById('btnSync').addEventListener('click', doSync);
  document.getElementById('btnBack').addEventListener('click', () => {
    chrome.tabs.update({ url: 'chrome://newtab/' });
  });

  // 导航项点击
  document.querySelectorAll('.opt-nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => showPage(item.dataset.page));
  });

  // 默认显示同步设置
  showPage('sync');

  // 窄屏隐藏侧边栏
  if (window.innerWidth < 640) document.getElementById('optSidebar').classList.add('hidden');
}

/**
 * 切换显示的内容页面
 * @param {string} page - 页面 key: sync | tutorial | io | lang
 */
async function showPage(page) {
  curPage = page;
  document.querySelectorAll('.opt-nav-item[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  switch (page) {
    case 'sync':     await renderSync(); break;
    case 'tutorial': renderTutorial(); break;
    case 'io':       renderIO(); break;
    case 'lang':     await renderLang(); break;
  }
}

/* ============================================================
   语言设置页
   ============================================================ */

async function renderLang() {
  const c = document.getElementById('optContent');
  // 每次渲染前重新从 storage 读取，确保导入后切换过来也能显示最新数据
  const sd = await Storage.getSetting();
  setting = sd.data || Storage.defaultSetting();
  c.innerHTML = `
    <h2 class="opt-sec-title" data-i18n="langSettings">${t('langSettings')}</h2>
    <div class="opt-card">
      <p class="form-label" style="margin-bottom:12px;" data-i18n="langLabel">${t('langLabel')}</p>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:10px;">
        <input type="radio" name="lang" value="en" ${setting.language === 'en' || !setting.language ? 'checked' : ''}>
        <span data-i18n="english">${t('english')}</span>
      </label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:14px;">
        <input type="radio" name="lang" value="zh" ${setting.language === 'zh' ? 'checked' : ''}>
        <span data-i18n="chinese">${t('chinese')}</span>
      </label>
      <button class="btn btn-primary" id="btnSaveLang">
        <span class="mi mi-save"></span>
        <span data-i18n="save">${t('save')}</span>
      </button>
    </div>`;

  document.getElementById('btnSaveLang').addEventListener('click', async () => {
    const sel = document.querySelector('input[name="lang"]:checked');
    if (!sel) return;
    setting.language = sel.value;
    setLang(sel.value);
    await Storage.saveSetting(setting);
    applyI18n();
    renderLang(); // 重新渲染当前页面以更新语言
    toast(t('langSaved'), 'ok');
  });
}

/* ============================================================
   导入导出页
   ============================================================ */

function renderIO() {
  const c = document.getElementById('optContent');
  c.innerHTML = `
    <h2 class="opt-sec-title" data-i18n="importExport">${t('importExport')}</h2>

    <!-- 导出 -->
    <div class="opt-card">
      <div class="opt-card-title">
        <span class="mi mi-export" style="color:var(--primary);"></span>
        <span data-i18n="exportData">${t('exportData')}</span>
      </div>
      <button class="btn btn-outline" id="btnExport">
        <span class="mi mi-download"></span>
        <span data-i18n="exportBtn">${t('exportBtn')}</span>
      </button>
      <div id="exportMsg" style="margin-top:8px;"></div>
    </div>

    <!-- 导入 -->
    <div class="opt-card">
      <div class="opt-card-title">
        <span class="mi mi-import" style="color:var(--primary);"></span>
        <span data-i18n="importData">${t('importData')}</span>
      </div>
      <div class="form-group">
        <label class="form-label" data-i18n="selectSource">${t('selectSource')}</label>
        <select class="form-select" id="importSrc">
          <option value="happy" data-i18n="srcHappy">${t('srcHappy')}</option>
          <option value="bookmarks" data-i18n="srcBookmarks">${t('srcBookmarks')}</option>
          <option value="onetab" data-i18n="srcOneTab">${t('srcOneTab')}</option>
          <option value="toby" data-i18n="srcToby">${t('srcToby')}</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" data-i18n="selectFile">${t('selectFile')}</label>
        <input type="file" id="importFile" accept=".json,.html,.htm,.txt" style="font-size:13px;">
      </div>
      <button class="btn btn-primary" id="btnImport">
        <span class="mi mi-upload"></span>
        <span data-i18n="importBtn">${t('importBtn')}</span>
      </button>
      <div id="importMsg" style="margin-top:8px;"></div>
    </div>`;

  // 导出按钮
  document.getElementById('btnExport').addEventListener('click', async () => {
    try {
      const data = await Storage.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `happy_new_tab_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showMsg('exportMsg', t('exportOk'), 'ok');
    } catch (e) {
      showMsg('exportMsg', e.message, 'err');
    }
  });

  // 导入按钮
  document.getElementById('btnImport').addEventListener('click', async () => {
    const src = document.getElementById('importSrc').value;
    const file = document.getElementById('importFile').files[0];
    if (!file) { showMsg('importMsg', t('selectFile') + '...', 'warn'); return; }

    // 验证文件类型
    const ext = file.name.split('.').pop().toLowerCase();
    const validExt = { happy: ['json'], bookmarks: ['html','htm'], onetab: ['txt'], toby: ['json'] };
    if (!validExt[src]?.includes(ext)) {
      showMsg('importMsg', t('fileTypeErr'), 'err');
      return;
    }

    if (src === 'happy' && !window.confirm(t('importWarning'))) return;

    try {
      const text = await readFile(file);
      await importData(src, text);
      showMsg('importMsg', t('importOk'), 'ok');
    } catch (e) {
      showMsg('importMsg', t('importErr') + e.message, 'err');
    }
  });
}

/**
 * 读取文件为文本
 * @param {File} f
 * @returns {Promise<string>}
 */
function readFile(f) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = e => resolve(e.target.result);
    r.onerror = () => reject(new Error('File read error'));
    r.readAsText(f, 'UTF-8');
  });
}

/**
 * 根据数据源类型解析并保存导入数据
 * @param {string} src - 数据源类型
 * @param {string} text - 文件内容
 */
async function importData(src, text) {
  switch (src) {
    case 'happy':     return importHappy(text);
    case 'bookmarks': return importBookmarks(text);
    case 'onetab':    return importOneTab(text);
    case 'toby':      return importToby(text);
    default: throw new Error('Unknown source');
  }
}

/* ---- Happy New Tab JSON 导入 ---- */
async function importHappy(text) {
  const data = JSON.parse(text);
  if (!data.spaces) throw new Error('Invalid format: missing spaces');
  await Storage.importAll(data);
}

/* ---- 浏览器书签 HTML 导入 ---- */
async function importBookmarks(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const space = { id: Storage.genId(), name: 'Imported Bookmarks', groups: [] };

  /**
   * 递归处理书签目录 DT 元素
   * @param {Element} dt - 包含目录的 DT 元素
   * @param {Object} targetSpace - 要写入的空间
   */
  function processDT(dt, targetSpace) {
    const dl = dt.querySelector(':scope > dl');
    if (!dl) return;
    const folderName = dt.querySelector(':scope > h3')?.textContent?.trim() || 'Folder';
    const group = { id: Storage.genId(), name: folderName, tabs: [] };

    // 遍历直接子 DT
    dl.querySelectorAll(':scope > dt').forEach(child => {
      const a = child.querySelector(':scope > a');
      if (a && a.href && !a.href.startsWith('javascript:')) {
        // 链接 → 标签
        group.tabs.push({
          id: Storage.genId(),
          name: a.textContent?.trim() || a.href,
          url: a.href,
          favicon: Storage.faviconUrl(a.href),
        });
      } else if (child.querySelector(':scope > h3')) {
        // 子目录 → 递归
        processDT(child, targetSpace);
      }
    });

    if (group.tabs.length > 0) targetSpace.groups.push(group);
  }

  // 处理顶层目录
  doc.querySelectorAll('dl > dt').forEach(dt => {
    if (dt.querySelector(':scope > h3') || dt.querySelector(':scope > dl')) processDT(dt, space);
  });

  // 如果没有目录，把所有链接放入一个分组
  if (space.groups.length === 0) {
    const group = { id: Storage.genId(), name: 'Bookmarks', tabs: [] };
    doc.querySelectorAll('a[href]').forEach(a => {
      if (!a.href.startsWith('javascript:')) {
        group.tabs.push({ id: Storage.genId(), name: a.textContent?.trim() || a.href, url: a.href, favicon: Storage.faviconUrl(a.href) });
      }
    });
    if (group.tabs.length) space.groups.push(group);
  }

  const sp = await Storage.getSpaces();
  sp.data.push(space);
  await Storage.saveSpaces(sp.data);
}

/* ---- OneTab TXT 导入 ---- */
async function importOneTab(text) {
  const lines = text.split(/\r?\n/);
  const space = { id: Storage.genId(), name: 'Imported from OneTab', groups: [] };
  let curGroup = null;
  let counter = 1;

  lines.forEach(line => {
    const tr = line.trim();
    if (tr === '') {
      // 空行 → 结束当前分组
      if (curGroup?.tabs.length) { space.groups.push(curGroup); }
      curGroup = null;
    } else if (tr.includes(' | ')) {
      // 标签行：url | title
      if (!curGroup) curGroup = { id: Storage.genId(), name: `Group ${counter++}`, tabs: [] };
      const sep = tr.indexOf(' | ');
      const url = tr.slice(0, sep).trim();
      const title = tr.slice(sep + 3).trim();
      if (url) curGroup.tabs.push({ id: Storage.genId(), name: title || url, url, favicon: Storage.faviconUrl(url) });
    }
  });
  // 文件末尾没空行时处理最后一组
  if (curGroup?.tabs.length) space.groups.push(curGroup);

  if (!space.groups.length) throw new Error('No valid data found in OneTab file');

  const sp = await Storage.getSpaces();
  sp.data.push(space);
  await Storage.saveSpaces(sp.data);
}

/* ---- Toby JSON 导入 ---- */
async function importToby(text) {
  const data = JSON.parse(text);
  if (!data.groups) throw new Error('Invalid Toby format: missing groups');

  const sp = await Storage.getSpaces();
  // Toby: groups → 本扩展: spaces
  data.groups.forEach(tg => {
    const space = { id: Storage.genId(), name: tg.name || 'Toby Group', groups: [] };
    // Toby: lists → 本扩展: groups
    (tg.lists || []).forEach(tl => {
      const group = { id: Storage.genId(), name: tl.title || 'List', tabs: [] };
      // Toby: cards → 本扩展: tabs
      (tl.cards || []).forEach(card => {
        if (card.url) {
          group.tabs.push({
            id: Storage.genId(),
            name: card.customTitle || card.title || card.url,
            url: card.url,
            favicon: card.favIconUrl || Storage.faviconUrl(card.url),
          });
        }
      });
      if (group.tabs.length) space.groups.push(group);
    });
    sp.data.push(space);
  });

  await Storage.saveSpaces(sp.data);
}

/* ============================================================
   同步设置页
   ============================================================ */

async function renderSync() {
  const c = document.getElementById('optContent');
  // 每次渲染前重新从 storage 读取，确保导入后切换过来也能显示最新数据
  const sd = await Storage.getSetting();
  setting = sd.data || Storage.defaultSetting();
  const oauth = await Storage.getOAuth();
  const redirectUri = await getRedirectUri();
  const dbOK = !!oauth.dropbox?.accessToken;

  c.innerHTML = `
    <h2 class="opt-sec-title" data-i18n="syncSettings">${t('syncSettings')}</h2>

    <!-- 启用开关 -->
    <div class="opt-card">
      <label class="toggle-row">
        <div class="toggle">
          <input type="checkbox" id="syncEnabled" ${setting.syncEnabled ? 'checked' : ''}>
          <span class="toggle-track"></span>
        </div>
        <span data-i18n="enableSync">${t('enableSync')}</span>
      </label>
    </div>

    <!-- 立即同步 -->
    <div class="opt-card" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <button class="btn btn-primary" id="btnSyncNow">
        <span class="mi mi-sync"></span>
        <span data-i18n="syncNow">${t('syncNow')}</span>
      </button>
      <div id="syncMsg"></div>
    </div>

    <!-- GitHub -->
    <div class="opt-card">
      <div class="opt-card-title">
        <input type="radio" name="syncMethod" value="github" ${(setting.syncMethod||'github')==='github'?'checked':''}>
        <a href="https://github.com" target="_blank" style="font-weight:500;" data-i18n="github">${t('github')}</a>
      </div>
      <div class="form-group">
        <label class="form-label" data-i18n="ghOwner">${t('ghOwner')}</label>
        <input class="form-input" id="ghOwner" value="${esc(setting.github?.owner||'')}" placeholder="github-username">
      </div>
      <div class="form-group">
        <label class="form-label" data-i18n="ghRepo">${t('ghRepo')}</label>
        <input class="form-input" id="ghRepo" value="${esc(setting.github?.repo||'')}" placeholder="my-private-repo">
        <p class="form-hint" data-i18n="ghRepoHint">${t('ghRepoHint')}</p>
      </div>
      <div class="form-group">
        <label class="form-label" data-i18n="ghToken">${t('ghToken')}</label>
        <input class="form-input" id="ghToken" type="password" value="${esc(setting.github?.token||'')}" placeholder="github_pat_...">
        <p class="form-hint" data-i18n="ghTokenHint">${t('ghTokenHint')}</p>
      </div>
    </div>

    <!-- Dropbox -->
    <div class="opt-card">
      <div class="opt-card-title">
        <input type="radio" name="syncMethod" value="dropbox" ${setting.syncMethod==='dropbox'?'checked':''}>
        <a href="https://www.dropbox.com/developers/apps" target="_blank" style="font-weight:500;" data-i18n="dropbox">${t('dropbox')}</a>
      </div>
      <div class="form-group">
        <label class="form-label" data-i18n="dbRedirect">${t('dbRedirect')}</label>
        <input class="form-input" id="dbRedirect" value="${esc(redirectUri)}" readonly onclick="this.select()" style="cursor:pointer;background:var(--bg);">
      </div>
      <div class="form-group">
        <label class="form-label" data-i18n="dbAppKey">${t('dbAppKey')}</label>
        <input class="form-input" id="dbKey" value="${esc(setting.dropbox?.appKey||'')}">
      </div>
      <div class="form-group">
        <label class="form-label" data-i18n="dbAppSecret">${t('dbAppSecret')}</label>
        <input class="form-input" id="dbSecret" type="password" value="${esc(setting.dropbox?.appSecret||'')}">
      </div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <button class="btn btn-outline" id="btnDbAuth">
          <span class="mi mi-lock"></span>
          <span data-i18n="dbAuthorize">${t('dbAuthorize')}</span>
        </button>
        <span id="dbAuthStatus" style="font-size:12px;color:${dbOK?'var(--success)':'var(--text-sec)'};">
          ${dbOK ? t('dbAuthorized') : t('dbNotAuth')}
        </span>
      </div>
    </div>

    <!-- 坚果云 -->
    <div class="opt-card">
      <div class="opt-card-title">
        <input type="radio" name="syncMethod" value="jianguoyun" ${setting.syncMethod==='jianguoyun'?'checked':''}>
        <a href="https://www.jianguoyun.com" target="_blank" style="font-weight:500;" data-i18n="jianguoyun">${t('jianguoyun')}</a>
      </div>
      <div class="form-group">
        <label class="form-label" data-i18n="jgyUser">${t('jgyUser')}</label>
        <input class="form-input" id="jgyUser" type="email" value="${esc(setting.jianguoyun?.username||'')}">
      </div>
      <div class="form-group">
        <label class="form-label" data-i18n="jgyPass">${t('jgyPass')}</label>
        <input class="form-input" id="jgyPass" type="password" value="${esc(setting.jianguoyun?.password||'')}">
        <p class="form-hint" data-i18n="jgyHint">${t('jgyHint')}</p>
      </div>
    </div>

    <!-- 保存 -->
    <div style="margin-bottom:20px;">
      <button class="btn btn-primary" id="btnSaveSync">
        <span class="mi mi-save"></span>
        <span data-i18n="save">${t('save')}</span>
      </button>
    </div>`;

  // 绑定事件
  document.getElementById('btnSaveSync').addEventListener('click', saveSync);
  document.getElementById('btnSyncNow').addEventListener('click', doSync);
  document.getElementById('btnDbAuth').addEventListener('click', authorizeDropbox);
}

/**
 * 从页面收集同步设置并保存
 */
async function saveSync() {
  setting.syncEnabled = document.getElementById('syncEnabled').checked;
  setting.syncMethod = document.querySelector('input[name="syncMethod"]:checked')?.value || 'github';
  setting.github = {
    owner: document.getElementById('ghOwner').value.trim(),
    repo: document.getElementById('ghRepo').value.trim(),
    token: document.getElementById('ghToken').value.trim(),
  };
  setting.dropbox = {
    appKey: document.getElementById('dbKey').value.trim(),
    appSecret: document.getElementById('dbSecret').value.trim(),
  };
  setting.jianguoyun = {
    username: document.getElementById('jgyUser').value.trim(),
    password: document.getElementById('jgyPass').value.trim(),
  };
  await Storage.saveSetting(setting, true); // 保存同步配置不更新 updatedAt，避免覆盖远程数据
  toast(t('save') + ' ✓', 'ok');
}

/**
 * 获取扩展 Redirect URI
 * @returns {Promise<string>}
 */
async function getRedirectUri() {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type: 'GET_REDIRECT_URI' }, res => {
      resolve(res?.uri || '');
    });
  });
}

/**
 * 发起 Dropbox OAuth 授权
 */
async function authorizeDropbox() {
  const key = document.getElementById('dbKey')?.value.trim();
  const secret = document.getElementById('dbSecret')?.value.trim();
  if (!key || !secret) { toast('Please fill App Key and App Secret first.', 'warn'); return; }

  try {
    const res = await chrome.runtime.sendMessage({ type: 'DROPBOX_AUTH', appKey: key, appSecret: secret });
    if (res.ok) {
      const el = document.getElementById('dbAuthStatus');
      if (el) { el.textContent = t('dbAuthorized'); el.style.color = 'var(--success)'; }
      toast(t('dbAuthorized'), 'ok');
    } else {
      toast(res.err, 'err');
    }
  } catch (e) { toast(e.message, 'err'); }
}

/* ============================================================
   同步教程页
   ============================================================ */

function renderTutorial() {
  const c = document.getElementById('optContent');
  c.innerHTML = `
    <h2 class="opt-sec-title" data-i18n="syncTutorial">${t('syncTutorial')}</h2>
    <div class="opt-card md-content">${md2html(t('tutorialMd'))}</div>`;
}

/**
 * 简单 Markdown → HTML 转换
 * 支持标题、加粗、行内代码、链接、有序/无序列表、分隔线、段落
 * @param {string} md
 * @returns {string}
 */
function md2html(md) {
  let html = '';
  let inUl = false, inOl = false;

  /**
   * 关闭所有打开的列表
   */
  function closeLists() {
    if (inUl) { html += '</ul>\n'; inUl = false; }
    if (inOl) { html += '</ol>\n'; inOl = false; }
  }

  /**
   * 处理行内 Markdown（加粗、链接、代码）
   * @param {string} s
   * @returns {string}
   */
  function inline(s) {
    // HTML 转义
    let r = s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    // 行内代码 `code`
    r = r.replace(/`([^`]+)`/g, '<code>$1</code>');
    // 链接 [text](url)
    r = r.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    // 加粗 **text**
    r = r.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    return r;
  }

  // 逐行处理
  md.split('\n').forEach(line => {
    if (line.startsWith('### '))      { closeLists(); html += `<h3>${inline(line.slice(4))}</h3>\n`; }
    else if (line.startsWith('## ')) { closeLists(); html += `<h2>${inline(line.slice(3))}</h2>\n`; }
    else if (line.startsWith('# '))  { closeLists(); html += `<h1>${inline(line.slice(2))}</h1>\n`; }
    else if (line.startsWith('- '))  {
      if (!inUl) { closeLists(); html += '<ul>\n'; inUl = true; }
      html += `<li>${inline(line.slice(2))}</li>\n`;
    }
    else if (/^\d+\.\s/.test(line)) {
      if (!inOl) { closeLists(); html += '<ol>\n'; inOl = true; }
      html += `<li>${inline(line.replace(/^\d+\.\s/, ''))}</li>\n`;
    }
    else if (line.trim() === '---') { closeLists(); html += '<hr>\n'; }
    else if (line.trim() === '')    { closeLists(); }
    else                            { closeLists(); html += `<p>${inline(line)}</p>\n`; }
  });

  closeLists();
  return html;
}

/* ============================================================
   执行同步
   ============================================================ */

async function doSync() {
  // 如果在同步设置页，先保存当前填写的数据
  if (curPage === 'sync') await saveSync();

  const sd = await Storage.getSetting();
  if (!sd.data.syncEnabled) {
    showSyncMsg(t('syncFail') + 'Sync is disabled.', 'err');
    return;
  }

  const oauth = await Storage.getOAuth();
  try {
    const res = await chrome.runtime.sendMessage({ type: 'SYNC', setting: sd.data, oauth });
    if (res.ok) { showSyncMsg(t('syncOk'), 'ok'); toast(t('syncOk'), 'ok'); }
    else { showSyncMsg(t('syncFail') + res.err, 'err'); }
  } catch (e) {
    showSyncMsg(t('syncFail') + e.message, 'err');
  }
}

function showSyncMsg(msg, type) {
  const el = document.getElementById('syncMsg');
  if (el) { el.className = `alert alert-${type}`; el.textContent = msg; }
  else toast(msg, type);
}

/* ============================================================
   工具
   ============================================================ */

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showMsg(id, msg, type) {
  const el = document.getElementById(id);
  if (el) { el.className = `alert alert-${type}`; el.textContent = msg; }
}

function toast(msg, type = '', dur = 3000) {
  const w = document.getElementById('toastWrap');
  if (!w) return;
  const el = document.createElement('div');
  el.className = `toast${type ? ' '+type : ''}`;
  el.textContent = msg;
  w.appendChild(el);
  setTimeout(() => el.remove(), dur);
}

document.addEventListener('DOMContentLoaded', init);
