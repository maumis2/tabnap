let whitelist = [];
let userConfig = {
  primaryColor: '#1a73e8',
  fontSize: '14px',
  askDownload: false
};

const tabList = document.getElementById('tabList');
const searchInput = document.getElementById('searchInput');
const settingsPanel = document.getElementById('settingsPanel');

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  applyTranslations();
  updateTabList();
  setupEventListeners();

  chrome.tabs.onUpdated.addListener(updateTabList);
  chrome.tabs.onRemoved.addListener(updateTabList);
  chrome.tabs.onActivated.addListener(updateTabList);
});

async function loadSettings() {
  const data = await chrome.storage.sync.get(['whitelist', 'config']);
  whitelist = data.whitelist || [];
  if (data.config) userConfig = { ...userConfig, ...data.config };

  applyTheme();
  
  document.getElementById('colorPicker').value = userConfig.primaryColor;
  document.getElementById('fontSizeSelect').value = userConfig.fontSize;
  document.getElementById('askDownloadToggle').checked = userConfig.askDownload;
}

function applyTheme() {
  const root = document.documentElement;
  root.style.setProperty('--primary-color', userConfig.primaryColor);
  root.style.setProperty('--font-size-base', userConfig.fontSize);
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = chrome.i18n.getMessage(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = chrome.i18n.getMessage(key);
  });
}

function setupEventListeners() {
  document.getElementById('btnSettingsToggle').onclick = () => {
    settingsPanel.classList.toggle('hidden');
  };

  document.getElementById('colorPicker').onchange = (e) => saveConfig('primaryColor', e.target.value);
  document.getElementById('fontSizeSelect').onchange = (e) => saveConfig('fontSize', e.target.value);
  
  document.getElementById('askDownloadToggle').onchange = (e) => {
    saveConfig('askDownload', e.target.checked);
    if(e.target.checked) chrome.tabs.create({ url: 'chrome://settings/downloads' });
  };

  document.getElementById('btnOpenDownloads').onclick = () => {
    chrome.tabs.create({ url: 'chrome://downloads' });
  };

  document.getElementById('btnDiscardAll').onclick = discardAllInactive;
  searchInput.addEventListener('input', updateTabList);
}

async function saveConfig(key, value) {
  userConfig[key] = value;
  applyTheme();
  await chrome.storage.sync.set({ config: userConfig });
}

async function updateTabList() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const filter = searchInput.value.toLowerCase();
  
  tabList.innerHTML = '';
  let activeCount = 0; 
  let hibernatedCount = 0;

  tabs.forEach(tab => {
    if (filter && !tab.title.toLowerCase().includes(filter) && !tab.url.toLowerCase().includes(filter)) return;

    if (tab.discarded) hibernatedCount++; else activeCount++;
    const isWhitelisted = whitelist.includes(tab.url);

    const li = document.createElement('li');
    li.className = `tab-item ${tab.active ? 'active-tab' : ''} ${tab.discarded ? 'discarded' : ''}`;
    
    const favicon = tab.favIconUrl ? `<img src="${tab.favIconUrl}" width="16" height="16">` : '📄';
    const title = tab.title.replace(/</g, "&lt;");

    li.innerHTML = `
      ${typeof favicon === 'string' ? favicon : ''}
      <div class="tab-info" title="${title}">${title}</div>
      <button class="icon-btn" title="Prioridade" data-action="whitelist">${isWhitelisted ? '⭐' : '☆'}</button>
      <button class="icon-btn" style="color:var(--danger-color)" data-action="close">✕</button>
    `;

    li.onclick = () => chrome.tabs.update(tab.id, { active: true });
    
    const btnWhitelist = li.querySelector('[data-action="whitelist"]');
    btnWhitelist.onclick = (e) => { 
      e.stopPropagation(); 
      toggleWhitelist(tab.url); 
    };

    const btnClose = li.querySelector('[data-action="close"]');
    btnClose.onclick = (e) => { 
      e.stopPropagation(); 
      chrome.tabs.remove(tab.id); 
    };

    tabList.appendChild(li);
  });

  document.getElementById('activeCount').textContent = activeCount;
  document.getElementById('hibernatedCount').textContent = hibernatedCount;
}

async function discardAllInactive() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  for (const tab of tabs) {
    if (!tab.active && !tab.discarded && !whitelist.includes(tab.url)) {
      chrome.tabs.discard(tab.id);
    }
  }
}

async function toggleWhitelist(url) {
  if (whitelist.includes(url)) whitelist = whitelist.filter(u => u !== url);
  else whitelist.push(url);
  await chrome.storage.sync.set({ whitelist });
  updateTabList();
}