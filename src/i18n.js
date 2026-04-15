// ============================================================
// i18n.js - 多语言支持模块
// 包含英文和中文字典，不使用 chrome 自带多语言系统
// ============================================================

/* 语言字典 */
const I18N = {
  en: {
    appName: "Happy New Tab",
    save: "Save", cancel: "Cancel", delete: "Delete", edit: "Edit",
    add: "Add", close: "Close", ok: "OK", back: "Back",
    refresh: "Refresh", sync: "Sync", settings: "Settings",
    name: "Name", url: "URL",

    // Header tooltips
    menuTooltip: "Toggle Sidebar", refreshTooltip: "Refresh",
    syncTooltip: "Sync Data", viewListTip: "List View",
    viewCardTip: "Card View", viewIconTip: "Icon View",

    // Sidebar
    addSpace: "Add Space", editSpace: "Edit Space", deleteSpace: "Delete Space",
    settingsTip: "Settings",

    // Space dialog
    spaceName: "Space Name", newSpace: "New Space",
    spaceNamePh: "Space name (max 40 chars)",
    deleteSpaceConfirm: "Delete this space? All groups and tabs inside will be removed.",
    lastSpaceError: "Cannot delete the last space. At least one space must remain.",

    // Group
    groupName: "Group Name", newGroup: "New Group",
    addGroup: "Add Group", editGroup: "Edit Group", deleteGroup: "Delete Group",
    groupNamePh: "Group name",
    deleteGroupConfirm: "Delete this group? All tabs inside will be removed.",

    // Tab
    tabName: "Tab Name", tabUrl: "URL",
    addTab: "Add Tab", editTab: "Edit Tab", deleteTab: "Delete Tab",
    tabNamePh: "Tab name", tabUrlPh: "https://...",
    deleteTabConfirm: "Delete this tab?",

    // Popup
    selectSpace: "Select Space", selectGroup: "Select Group",
    newGroupOpt: "-- New Group --",
    saveCurrent: "Save Current Tab", saveAll: "Save All Tabs",
    removeTab: "Remove Tab",
    tabSaved: "Tab saved!", tabsSaved: "tabs saved!",
    noTabs: "No tabs to save.",

    // Options nav
    syncSettings: "Sync Settings", syncTutorial: "Sync Tutorial",
    importExport: "Import / Export", langSettings: "Language",

    // Language
    langLabel: "Interface Language", english: "English", chinese: "中文",
    langSaved: "Language saved.",

    // Import/Export
    exportData: "Export Data", exportBtn: "Export as JSON",
    exportOk: "Data exported.",
    importData: "Import Data", selectSource: "Select Data Source",
    srcHappy: "Happy New Tab (JSON)", srcBookmarks: "Browser Bookmarks (HTML)",
    srcOneTab: "OneTab (TXT)", srcToby: "Toby (JSON)",
    selectFile: "Select File", importBtn: "Import",
    importOk: "Import successful!", importErr: "Import failed: ",
    fileTypeErr: "File type does not match the selected source.",
    importWarning: "This will overwrite ALL existing data. Continue?",

    // Sync Settings
    enableSync: "Enable Sync", syncNow: "Sync Now",
    syncOk: "Sync completed!", syncFail: "Sync failed: ",
    syncMethod: "Sync Method",
    github: "GitHub (Fine-grained Token)",
    dropbox: "Dropbox", jianguoyun: "Jianguoyun (WebDAV)",

    // GitHub
    ghOwner: "GitHub Username (Owner)", ghRepo: "Repository Name",
    ghRepoHint: "Must be a private repository",
    ghToken: "Fine-grained Personal Access Token",
    ghTokenHint: "Token must have Contents (read & write) permission on the above repo",

    // Dropbox
    dbRedirect: "Redirect URI (add this to your Dropbox App settings)",
    dbAppKey: "App Key", dbAppSecret: "App Secret",
    dbAuthorize: "Authorize Dropbox",
    dbAuthorized: "✓ Authorized", dbNotAuth: "Not authorized",

    // Jianguoyun
    jgyUser: "Jianguoyun Email (Username)",
    jgyPass: "App Password",
    jgyHint: "Use app-specific password, not your main account password",

    // Sync Tutorial
    tutorialMd: `# Sync Tutorial

## GitHub (Fine-grained Personal Access Token)

**Official Website**: [https://github.com](https://github.com)

### Setup Steps:

1. Log in to GitHub, go to **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**
2. Click **Generate new token**
3. Set a token name and expiration date
4. Under **Repository access**, select **Only select repositories** and choose your sync repo (must be **private**)
5. Under **Permissions** → **Repository permissions**, find **Contents** and set to **Read and write**
6. Click **Generate token**, copy the token immediately
7. Paste the token into the extension's GitHub Token field

---

## Dropbox

**Official Website**: [https://www.dropbox.com/developers/apps](https://www.dropbox.com/developers/apps)

### Setup Steps:

1. Log in to Dropbox, go to the [App Console](https://www.dropbox.com/developers/apps)
2. Click **Create app**
3. Choose **Scoped access** and **App folder**
4. Enter an app name and click **Create app**
5. In app settings, under **OAuth 2** → **Redirect URIs**, paste the Redirect URI shown in the extension
6. Under **Permissions**, enable: \`files.metadata.write\`, \`files.content.write\`, \`files.content.read\`
7. Copy **App key** and **App secret** to the extension
8. Click **Authorize Dropbox** in the extension to complete OAuth

---

## Jianguoyun (坚果云 WebDAV)

**Official Website**: [https://www.jianguoyun.com](https://www.jianguoyun.com)

### Setup Steps:

1. Log in to Jianguoyun, go to **Account Info** → **Security Options**
2. Under **Third-party app management**, click **Add application**
3. Enter an app name and click **Generate password**
4. Copy the generated app password
5. Enter your Jianguoyun email and the app password in the extension settings
`,
  },

  zh: {
    appName: "Happy New Tab",
    save: "保存", cancel: "取消", delete: "删除", edit: "编辑",
    add: "添加", close: "关闭", ok: "确定", back: "返回",
    refresh: "刷新", sync: "同步", settings: "设置",
    name: "名称", url: "链接",

    menuTooltip: "切换侧边栏", refreshTooltip: "刷新",
    syncTooltip: "同步数据", viewListTip: "列表视图",
    viewCardTip: "卡片视图", viewIconTip: "图标视图",

    addSpace: "添加空间", editSpace: "编辑空间", deleteSpace: "删除空间",
    settingsTip: "设置",

    spaceName: "空间名称", newSpace: "新建空间",
    spaceNamePh: "空间名称（最多20个中文字）",
    deleteSpaceConfirm: "确定删除该空间？其中所有分组和标签都将删除。",
    lastSpaceError: "无法删除最后一个空间，至少需要保留一个空间。",

    groupName: "分组名称", newGroup: "新建分组",
    addGroup: "添加分组", editGroup: "编辑分组", deleteGroup: "删除分组",
    groupNamePh: "分组名称",
    deleteGroupConfirm: "确定删除该分组？其中所有标签都将删除。",

    tabName: "标签名称", tabUrl: "链接",
    addTab: "添加标签", editTab: "编辑标签", deleteTab: "删除标签",
    tabNamePh: "标签名称", tabUrlPh: "https://...",
    deleteTabConfirm: "确定删除该标签？",

    selectSpace: "选择空间", selectGroup: "选择分组",
    newGroupOpt: "-- 新建分组 --",
    saveCurrent: "保存当前标签页", saveAll: "保存所有标签页",
    removeTab: "删除标签",
    tabSaved: "标签页保存成功！", tabsSaved: "个标签页保存成功！",
    noTabs: "没有可保存的标签页。",

    syncSettings: "同步设置", syncTutorial: "同步教程",
    importExport: "导入导出", langSettings: "语言设置",

    langLabel: "界面语言", english: "English", chinese: "中文",
    langSaved: "语言设置已保存。",

    exportData: "导出数据", exportBtn: "导出为 JSON",
    exportOk: "数据导出成功。",
    importData: "导入数据", selectSource: "选择数据来源",
    srcHappy: "Happy New Tab JSON", srcBookmarks: "浏览器收藏夹（HTML）",
    srcOneTab: "OneTab（TXT）", srcToby: "Toby（JSON）",
    selectFile: "选择文件", importBtn: "导入",
    importOk: "导入成功！", importErr: "导入失败：",
    fileTypeErr: "文件类型与所选数据来源不匹配。",
    importWarning: "这将覆盖所有现有数据，是否继续？",

    enableSync: "启用同步", syncNow: "立即同步",
    syncOk: "同步成功！", syncFail: "同步失败：",
    syncMethod: "同步方式",
    github: "GitHub（Fine-grained Token）",
    dropbox: "Dropbox", jianguoyun: "坚果云（WebDAV）",

    ghOwner: "GitHub 用户名（Owner）", ghRepo: "仓库名称（Repo）",
    ghRepoHint: "必须是私密仓库",
    ghToken: "Fine-grained 个人访问令牌",
    ghTokenHint: "Token 必须对上面的仓库有 Contents（读写）权限",

    dbRedirect: "Redirect URI（请将此链接添加到 Dropbox App 设置中）",
    dbAppKey: "App Key", dbAppSecret: "App Secret",
    dbAuthorize: "授权 Dropbox",
    dbAuthorized: "✓ 已授权", dbNotAuth: "未授权",

    jgyUser: "坚果云用户名（邮箱）",
    jgyPass: "App 密码",
    jgyHint: "请使用第三方应用授权密码，而非账号主密码",

    tutorialMd: `# 同步教程

## GitHub（Fine-grained 个人访问令牌）

**官方网站**：[https://github.com](https://github.com)

### 设置步骤：

1. 登录 GitHub，进入 **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**
2. 点击 **Generate new token**
3. 填写令牌名称和有效期
4. 在 **Repository access** 下，选择 **Only select repositories**，并选择用于同步的仓库（必须是**私密仓库**）
5. 在 **Permissions** → **Repository permissions** 中，找到 **Contents**，设置为 **Read and write**
6. 点击 **Generate token** 并立即复制令牌
7. 将令牌粘贴到扩展的 GitHub Token 输入框中

---

## Dropbox

**官方网站**：[https://www.dropbox.com/developers/apps](https://www.dropbox.com/developers/apps)

### 设置步骤：

1. 登录 Dropbox，进入 [App Console](https://www.dropbox.com/developers/apps)
2. 点击 **Create app**
3. 选择 **Scoped access** 和 **App folder**
4. 输入应用名称，点击 **Create app**
5. 在应用设置中，**OAuth 2** → **Redirect URIs** 中，粘贴扩展页面显示的 Redirect URI
6. 在 **Permissions** 中，启用：\`files.metadata.write\`、\`files.content.write\`、\`files.content.read\`
7. 将 **App key** 和 **App secret** 复制到扩展设置中
8. 在扩展中点击 **授权 Dropbox** 完成 OAuth 授权

---

## 坚果云（WebDAV）

**官方网站**：[https://www.jianguoyun.com](https://www.jianguoyun.com)

### 设置步骤：

1. 登录坚果云，进入 **账户信息** → **安全选项**
2. 在 **第三方应用管理** 中，点击 **添加应用**
3. 输入应用名称，点击 **生成密码**
4. 复制生成的应用密码
5. 在扩展设置中填写坚果云邮箱（用户名）和应用密码
`,
  }
};

/* 当前语言，默认英文 */
let _lang = 'en';

/**
 * 获取指定 key 的翻译文本
 * @param {string} key
 * @returns {string}
 */
function t(key) {
  return (I18N[_lang] || I18N.en)[key] || (I18N.en)[key] || key;
}

/**
 * 从 chrome.storage.local 读取语言设置并初始化 _lang
 * @returns {Promise<string>} 当前语言代码
 */
async function initLang() {
  return new Promise(resolve => {
    chrome.storage.local.get('happy_new_tab_setting', res => {
      const d = res['happy_new_tab_setting'];
      _lang = (d && d.data && d.data.language) || 'en';
      resolve(_lang);
    });
  });
}

/**
 * 设置语言并立即刷新页面所有 data-i18n 元素
 * @param {string} lang
 */
function setLang(lang) {
  _lang = lang;
  applyI18n();
}

/**
 * 将翻译应用到页面上所有 data-i18n 属性元素
 */
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  document.querySelectorAll('[data-i18n-tip]').forEach(el => {
    el.dataset.tip = t(el.dataset.i18nTip);
  });
}

// 挂载到全局
if (typeof window !== 'undefined') {
  window.t = t;
  window.initLang = initLang;
  window.setLang = setLang;
  window.applyI18n = applyI18n;
}
