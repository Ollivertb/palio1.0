/* ==========================================================================
   Main Entry Point
   ========================================================================== */

import './styles/main.css';
import { initApp } from './app.js';

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Register Service Worker (production only, respects the deploy base path)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js?v=${__BUILD_ID__}`;
    navigator.serviceWorker.register(swUrl).catch(err => {
      console.log('SW registration failed:', err);
    });
  });
}

// Recarrega automaticamente quando uma nova versao do SW assume o controle,
// garantindo que o usuario veja a atualizacao sem precisar limpar cache.
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

// Handle online/offline
window.addEventListener('online', () => {
  document.body.classList.remove('offline');
  // Trigger sync when coming online
  import('./utils/github-sync.js').then(m => m.pullFromGitHub(true));
});

window.addEventListener('offline', () => {
  document.body.classList.add('offline');
});

// Handle install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallPrompt();
});

function showInstallPrompt() {
  // Create install prompt if not exists
  let prompt = document.getElementById('install-prompt');
  if (!prompt) {
    prompt = document.createElement('div');
    prompt.id = 'install-prompt';
    prompt.className = 'install-prompt';
    prompt.innerHTML = `
      <div class="install-prompt__title">Instalar Garagem do Palio</div>
      <div class="install-prompt__text">Adicione à tela inicial para acesso rápido e uso offline.</div>
      <div class="install-prompt__actions">
        <button class="btn btn--secondary" id="install-cancel">Agora não</button>
        <button class="btn btn--primary" id="install-confirm">Instalar</button>
      </div>
    `;
    document.body.appendChild(prompt);
  }
  prompt.classList.add('visible');

  prompt.querySelector('#install-confirm').onclick = async () => {
    prompt.classList.remove('visible');
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('PWA installed');
      }
      deferredPrompt = null;
    }
  };

  prompt.querySelector('#install-cancel').onclick = () => {
    prompt.classList.remove('visible');
  };
}

// Export for debugging
window.__GARAGEM__ = {
  getState: () => import('./store.js').then(m => m.getState())
};