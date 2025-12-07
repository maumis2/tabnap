let whitelist = [];
let isDarkMode = false;

// Elementos DOM
const tabList = document.getElementById('tabList');
const activeCountEl = document.getElementById('activeCount');
const hibernatedCountEl = document.getElementById('hibernatedCount');
const searchInput = document.getElementById('searchInput');
const darkModeToggle = document.getElementById('darkModeToggle');
const btnDiscardAll = document.getElementById('btnDiscardAll');

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  updateTabList();
  
  // Listeners
  darkModeToggle.addEventListener('change', toggleDarkMode);
  searchInput.addEventListener('input', updateTabList);
  btnDiscardAll.addEventListener('click', discardAllInactive);
  
  // Atualiza a lista se abas mudarem
  chrome.tabs.onUpdated.addListener(updateTabList);
  chrome.tabs.onRemoved.addListener(updateTabList);
  chrome.tabs.onActivated.addListener(updateTabList);
});

async function loadSettings() {
  const data = await chrome.storage.sync.get(['whitelist', 'darkMode']);
  whitelist = data.whitelist || [];
  isDarkMode = data.darkMode || false;
  
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
    darkModeToggle.checked = true;
  }
}

async function toggleDarkMode(e) {
  isDarkMode = e.target.checked;
  if (isDarkMode) document.body.classList.add('dark-mode');
  else document.body.classList.remove('dark-mode');
  await chrome.storage.sync.set({ darkMode: isDarkMode });
}

async function getTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  return tabs;
}

async function updateTabList() {
  const tabs = await getTabs();
  const filter = searchInput.value.toLowerCase();
  
  // Limpa lista atual
  tabList.innerHTML = '';
  
  let activeCount = 0;
  let hibernatedCount = 0;

  tabs.forEach(tab => {
    // Filtro de busca
    if (filter && !tab.title.toLowerCase().includes(filter) && !tab.url.toLowerCase().includes(filter)) {
      return;
    }

    // Contadores
    if (tab.discarded) hibernatedCount++;
    else activeCount++;

    const isWhitelisted = whitelist.includes(tab.id) || whitelist.includes(tab.url); // Simplificação por URL ou ID

    const li = document.createElement('li');
    li.className = `tab-item ${tab.active ? 'active-tab' : ''} ${tab.discarded ? 'discarded' : ''}`;
    
    // Favicon
    const favicon = tab.favIconUrl ? `<img src="${tab.favIconUrl}" width="16" height="16">` : '📄';

    // Status Texto
    const statusText = tab.discarded ? '💤 Hibernada' : (isWhitelisted ? '🔒 Prioritária' : '🟢 Ativa');

    li.innerHTML = `
      ${typeof favicon === 'string' ? favicon : ''}
      <div class="tab-info">
        <span class="tab-title" title="${tab.title}">${tab.title}</span>
        <span class="tab-status">${statusText}</span>
      </div>
      <div class="actions">
        <!-- Botão Prioridade/Whitelist -->
        <button class="icon-btn" title="Prioridade (Whitelist)" data-action="toggle-priority">
          ${isWhitelisted ? '⭐' : '☆'}
        </button>
        
        <!-- Botão Hibernar/Acordar -->
        ${!tab.discarded && !tab.active ? 
          `<button class="icon-btn" title="Hibernar agora" data-action="discard">💤</button>` : ''}
        
        <!-- Botão Fechar -->
        <button class="icon-btn" style="color:var(--danger-color)" title="Fechar aba" data-action="close">✕</button>
      </div>
    `;

    // Event Listeners dos botões
    const priorityBtn = li.querySelector('[data-action="toggle-priority"]');
    priorityBtn.onclick = () => toggleWhitelist(tab.url);

    const closeBtn = li.querySelector('[data-action="close"]');
    closeBtn.onclick = () => chrome.tabs.remove(tab.id);

    if (li.querySelector('[data-action="discard"]')) {
      li.querySelector('[data-action="discard"]').onclick = () => discardTab(tab.id);
    }
    
    // Clicar no item foca a aba
    li.onclick = (e) => {
      if (e.target.tagName !== 'BUTTON') {
        chrome.tabs.update(tab.id, { active: true });
      }
    };

    tabList.appendChild(li);
  });

  activeCountEl.textContent = activeCount;
  hibernatedCountEl.textContent = hibernatedCount;
}

// Funções de Ação

async function discardTab(tabId) {
  try {
    await chrome.tabs.discard(tabId);
    // A lista atualizará automaticamente pelo listener onUpdated
  } catch (err) {
    console.error("Erro ao hibernar:", err);
  }
}

async function discardAllInactive() {
  const tabs = await getTabs();
  for (const tab of tabs) {
    // Não hiberna a aba ativa, nem as whitelisted, nem as já hibernadas
    if (!tab.active && !tab.discarded && !whitelist.includes(tab.url)) {
      await chrome.tabs.discard(tab.id);
    }
  }
}

async function toggleWhitelist(url) {
  if (whitelist.includes(url)) {
    whitelist = whitelist.filter(u => u !== url);
  } else {
    whitelist.push(url);
  }
  await chrome.storage.sync.set({ whitelist });
  updateTabList();
}