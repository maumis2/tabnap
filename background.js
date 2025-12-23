chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try{
    const url = changeInfo.url || tab?.url;
    if(!url) return;
    const runtimeBase = chrome.runtime.getURL('');
    if(url.startsWith(runtimeBase)) return;

    const hostname = (()=>{ try{ return new URL(url).hostname.replace(/^www\./,''); }catch(e){ return null; }})();
    if(!hostname) return;

    const data = await chrome.storage.sync.get('blockedSites');
    const blocked = data.blockedSites || [];
    const blockedMatch = blocked.some(entry => {
      if(!entry) return false;
      let e = entry;
      if(e.startsWith('*.')) e = e.slice(2);
      if(e.startsWith('.')) e = e.slice(1);
      return hostname === e || hostname.endsWith('.' + e);
    });
    if(blockedMatch){
      const keys = await chrome.storage.local.get(['unlockedHosts','unlockedTabs']);
      const unlockedHosts = keys.unlockedHosts || {};
      const unlockedTabs = keys.unlockedTabs || {};
      const now = Date.now();
      Object.keys(unlockedHosts).forEach(h => { if(unlockedHosts[h] < now) delete unlockedHosts[h]; });
      Object.keys(unlockedTabs).forEach(t => { if(unlockedTabs[t] < now) delete unlockedTabs[t]; });
      await chrome.storage.local.set({ unlockedHosts, unlockedTabs });
      const tabAllowed = unlockedTabs[tabId] && unlockedTabs[tabId] > now;
      const hostAllowed = unlockedHosts[hostname] && unlockedHosts[hostname] > now;
      if(!tabAllowed && !hostAllowed){
        const target = chrome.runtime.getURL('blocked.html') + `?orig=${encodeURIComponent(url)}&tabId=${tabId}`;
        await chrome.tabs.update(tabId, { url: target });
      }
    }
  }catch(e){console.error(e)}
});