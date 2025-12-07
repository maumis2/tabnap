// permite abrir o painel lateral ao clicar no ícone da extensão, básico

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));