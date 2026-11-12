/* ==========================================================================
   Navigation Component
   ========================================================================== */

import { getIcon } from '../utils/icons.js';
import { navigate, getCurrentRoute } from '../app.js';

const TABS = [
  { id: 'home', icon: 'home', label: 'Início' },
  { id: 'chat', icon: 'chat', label: 'Assistente' },
  { id: 'manut', icon: 'manut', label: 'Manutenção' },
  { id: 'abast', icon: 'abast', label: 'Abastecer' },
  { id: 'mais', icon: 'mais', label: 'Mais' }
];

/**
 * Render navigation
 */
export function renderNav(activeRoute) {
  const navEl = document.getElementById('nav');
  if (!navEl) return;

  const currentRoute = activeRoute || getCurrentRoute();
  const activeTab = TABS.find(t => t.id === currentRoute) || TABS[0];

  navEl.innerHTML = TABS.map(tab => `
    <button
      class="nav__item ${tab.id === activeTab.id ? 'nav__item--active' : ''}"
      onclick="garagemApp.navigate('${tab.id}')"
      aria-label="${tab.label}"
      aria-current="${tab.id === activeTab.id ? 'page' : 'false'}"
    >
      <span class="nav__icon">${getIcon(tab.icon)}</span>
      <span class="nav__label">${tab.label}</span>
    </button>
  `).join('');

  // On desktop, show labels
  if (window.innerWidth >= 900) {
    navEl.querySelectorAll('.nav__label').forEach(el => el.style.display = 'inline');
  }
}