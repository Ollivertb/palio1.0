/* ==========================================================================
   Header Component
   ========================================================================== */

import { getIcon } from '../utils/icons.js';
import { escapeHtml, formatKm } from '../utils/helpers.js';
import { getCurrentKm } from '../store.js';

/**
 * Render header
 */
export function renderHeader(state) {
  const headerEl = document.getElementById('header');
  if (!headerEl) return;

  const currentKm = getCurrentKm();
  const kmDisplay = currentKm > 0
    ? [...formatKm(currentKm)].map(c => c === '.' ? '<u></u>' : `<i>${c}</i>`).join('') + '<em>km</em>'
    : '<em>—</em>';

  headerEl.innerHTML = `
    <div class="header__left">
      <div class="header__logo" onclick="garagemApp.renameCar()" aria-label="Renomear carro">${getIcon('wheel')}</div>
      <div>
        <h1 class="header__title">${escapeHtml(state.nome || 'Meu Palio')}</h1>
        <small class="header__subtitle">Fiat Palio 2010 ELX Flex</small>
      </div>
    </div>
    <div class="header__right">
      <button class="btn btn--icon" id="sync-btn" onclick="garagemApp.navigate('sync')" aria-label="Sincronização" hidden>${getIcon('cloud')}</button>
      <button class="btn btn--icon" onclick="garagemApp.toggleTheme()" aria-label="Alternar tema">${getIcon('theme')}</button>
    </div>
  `;

  // Update sync button visibility
  const syncBtn = headerEl.querySelector('#sync-btn');
  if (syncBtn) {
    import('../utils/github-sync.js').then(m => {
      const info = m.getSyncInfo();
      syncBtn.hidden = !info.configured;
      syncBtn.innerHTML = info.status === 'syncing' ? getIcon('sync') :
                          info.status === 'error' ? getIcon('warn') : getIcon('cloud');
    });
  }
}