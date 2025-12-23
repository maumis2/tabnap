let whitelist = [];
let userConfig = {
  primaryColor: '#1a73e8',
  fontSize: '14px',
  askDownload: false
};

let blockedSites = [];

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

  const extra = await chrome.storage.sync.get(['blockedSites','lockPassword']);
  blockedSites = extra.blockedSites || [];

  applyTheme();
  
  document.getElementById('colorPicker').value = userConfig.primaryColor;
  document.getElementById('fontSizeSelect').value = userConfig.fontSize;
  document.getElementById('askDownloadToggle').checked = userConfig.askDownload;

  document.getElementById('blockedSiteInput').value = '';
  renderBlockedList();
}

function applyTheme() {
  const root = document.documentElement;
  root.style.setProperty('--primary-color', userConfig.primaryColor);
  root.style.setProperty('--font-size-base', userConfig.fontSize);
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    try{
      const msg = chrome.i18n.getMessage(key);
      if(msg) el.textContent = msg;
    }catch(e){}
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    try{
      const msg = chrome.i18n.getMessage(key);
      if(msg) el.placeholder = msg;
    }catch(e){}
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

  
  const btnSavePassword = document.getElementById('btnSavePassword');
  if(btnSavePassword){
    btnSavePassword.onclick = async () => {
      const pass = document.getElementById('lockPasswordInput').value;
      const passConfirm = document.getElementById('lockPasswordConfirm').value;
      if(!pass && !passConfirm){
        await chrome.storage.sync.remove('lockPassword');
        alert('Senha removida');
        document.getElementById('lockPasswordInput').value = '';
        document.getElementById('lockPasswordConfirm').value = '';
        return;
      }
      if(pass !== passConfirm){ alert('As senhas não coincidem'); return; }
      const saltArr = crypto.getRandomValues(new Uint8Array(16));
      const saltHex = bufToHex(saltArr.buffer);
  const iterations = 100000;
      const derived = await derivePBKDF2(pass, saltHex, iterations);
      await chrome.storage.sync.set({ lockPassword: { salt: saltHex, hash: derived, iterations } });
      document.getElementById('lockPasswordInput').value = '';
      document.getElementById('lockPasswordConfirm').value = '';
      alert('Senha salva');
    };
  }

  const btnAddBlocked = document.getElementById('btnAddBlocked');
  if(btnAddBlocked){
    btnAddBlocked.onclick = async () => {
      const val = document.getElementById('blockedSiteInput').value.trim();
      if(!val) return;
      const host = val.replace(/^https?:\/\//,'').replace(/^www\./,'').split('/')[0];
      if(!blockedSites.includes(host)) blockedSites.push(host);
      await chrome.storage.sync.set({ blockedSites });
      document.getElementById('blockedSiteInput').value = '';
      renderBlockedList();
    };
  }

  document.getElementById('btnDiscardAll').onclick = discardAllInactive;
  searchInput.addEventListener('input', updateTabList);
}

async function saveConfig(key, value) {
  userConfig[key] = value;
  applyTheme();
  await chrome.storage.sync.set({ config: userConfig });
}

function renderBlockedList(){
  const ul = document.getElementById('blockedList');
  if(!ul) return;
  ul.innerHTML = '';
  blockedSites.forEach(host => {
    const li = document.createElement('li');
    li.style.display = 'flex'; li.style.justifyContent = 'space-between'; li.style.alignItems = 'center';
    li.style.marginBottom = '6px';
    const span = document.createElement('span'); span.textContent = host;
    const btns = document.createElement('div'); btns.style.display='flex'; btns.style.gap='8px';
    const btnBlock = document.createElement('button'); btnBlock.className='secondary-btn'; btnBlock.textContent='Bloquear agora';
    btnBlock.onclick = (e)=>{ e.stopPropagation(); blockSiteNow(host); };
    const btnRemove = document.createElement('button'); btnRemove.className='secondary-btn'; btnRemove.textContent='Remover';
    btnRemove.onclick = async (e)=>{ e.stopPropagation(); blockedSites = blockedSites.filter(h=>h!==host); await chrome.storage.sync.set({blockedSites}); renderBlockedList(); };
    btns.appendChild(btnBlock); btns.appendChild(btnRemove);
    li.appendChild(span); li.appendChild(btns);
    ul.appendChild(li);
  });
}

async function hashPassword(password){
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(password));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function verifyPassword(password){
  const data = await chrome.storage.sync.get('lockPassword');
  const stored = data.lockPassword;
  if(!stored) return false;
  if(typeof stored === 'string'){
    const h = await hashPassword(password);
    return h === stored;
  }
  const { salt, hash, iterations } = stored;
  if(!salt || !hash) return false;
  const derived = await derivePBKDF2(password, salt, iterations || 100000);
  return derived === hash;
}

function bufToHex(buffer){
  return Array.from(new Uint8Array(buffer)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

function hexToBuf(hex){
  const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(b=>parseInt(b,16)));
  return bytes.buffer;
}

async function derivePBKDF2(password, saltHex, iterations=100000){
  const enc = new TextEncoder();
  const passKey = await crypto.subtle.importKey('raw', enc.encode(password), {name:'PBKDF2'}, false, ['deriveBits']);
  const saltBuf = hexToBuf(saltHex);
  const derivedBits = await crypto.subtle.deriveBits({name:'PBKDF2', salt: saltBuf, iterations, hash: 'SHA-256'}, passKey, 256);
  return bufToHex(derivedBits);
}

async function blockSiteNow(host){
  const tabs = await chrome.tabs.query({currentWindow:true});
  for(const tab of tabs){
    try{
      const url = new URL(tab.url);
      const hostname = url.hostname.replace(/^www\./,'');
      if(isHostBlockedByEntry(hostname, host)){
        const target = chrome.runtime.getURL('blocked.html') + `?orig=${encodeURIComponent(tab.url)}&tabId=${tab.id}`;
        await chrome.tabs.update(tab.id, { url: target });
      }
    }catch(e){}
  }
}

function isHostBlockedByEntry(hostname, entry){
  if(!hostname || !entry) return false;
  if(entry.startsWith('*.')) entry = entry.slice(2);
  if(entry.startsWith('.')) entry = entry.slice(1);
  if(hostname === entry) return true;
  if(hostname.endsWith('.' + entry)) return true;
  return false;
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