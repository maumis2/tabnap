(() => {
  const params = new URLSearchParams(location.search);
  const orig = params.get('orig') || '';
  const tabId = parseInt(params.get('tabId')) || null;

  document.getElementById('siteInfo').textContent = orig;

  function setMessage(msg, danger = false) {
    const el = document.getElementById('message');
    el.textContent = msg;
    el.style.color = danger
      ? getComputedStyle(document.documentElement).getPropertyValue('--danger-color')
      : getComputedStyle(document.documentElement).getPropertyValue('--muted-text');
  }

  function hex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function hashPassword(password) {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(password));
    return hex(buf);
  }

  async function tryUnlock() {
    const pass = document.getElementById('unlockPassword').value;
    const data = await chrome.storage.sync.get('lockPassword');
    const stored = data.lockPassword;
    if (!stored) {
      await markHostTemporarilyUnlocked();
      await openOriginal();
      return;
    }
    if (typeof stored === 'string') {
      const h = await hashPassword(pass);
      if (h === stored) await openOriginal();
      else setMessage('Senha incorreta', true);
      return;
    }
    const { salt, hash, iterations } = stored;
    if (!salt || !hash) {
      setMessage('Senha incorreta', true);
      return;
    }
    try {
      const enc = new TextEncoder();
      const passKey = await crypto.subtle.importKey('raw', enc.encode(pass), { name: 'PBKDF2' }, false, ['deriveBits']);
      const saltBuf = new Uint8Array(salt.match(/.{1,2}/g).map((b) => parseInt(b, 16))).buffer;
      const derivedBits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: saltBuf, iterations: iterations || 100000, hash: 'SHA-256' },
        passKey,
        256
      );
      const derivedHex = hex(derivedBits);
      if (derivedHex === hash) {
        await markHostTemporarilyUnlocked();
        await openOriginal();
      } else setMessage('Senha incorreta', true);
    } catch (e) {
      setMessage('Erro ao verificar senha', true);
    }
  }

  async function openOriginal() {
    if (tabId) {
      try {
        await chrome.tabs.update(tabId, { url: orig });
      } catch (e) {
        chrome.tabs.create({ url: orig });
      }
    } else {
      chrome.tabs.create({ url: orig });
    }
  }

  async function markHostTemporarilyUnlocked() {
    try {
      const host = (() => {
        try {
          return new URL(orig).hostname.replace(/^www\./, '');
        } catch (e) {
          return null;
        }
      })();
      if (!host) return;
      const ttl = 1000 * 60 * 5;
      const hostKey = 'unlockedHosts';
      const hdata = await chrome.storage.local.get(hostKey);
      const hmap = hdata[hostKey] || {};
      hmap[host] = Date.now() + ttl;
      const tabKey = 'unlockedTabs';
      const tdata = await chrome.storage.local.get(tabKey);
      const tmap = tdata[tabKey] || {};
      if (tabId) tmap[tabId] = Date.now() + ttl;
      await chrome.storage.local.set({ [hostKey]: hmap, [tabKey]: tmap });
    } catch (e) {
      console.error('markHostTemporarilyUnlocked', e);
    }
  }

  document.getElementById('btnUnlock').onclick = tryUnlock;
  document.getElementById('unlockPassword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryUnlock();
  });

  document.getElementById('btnOpenExternal').onclick = () => {
    chrome.tabs.create({ url: orig });
  };
})();
