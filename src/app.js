/* ==========================================================================
   Application Controller
   ========================================================================== */

import { getState, subscribe, resetAllData } from './store.js';
import { getIcon } from './utils/icons.js';
import { showToast } from './utils/helpers.js';
import { pullFromGitHub, onSyncStatusChange, getSyncInfo, isSyncConfigured } from './utils/github-sync.js';

// Pages
import { renderHome } from './components/Home.js';
import { renderList } from './components/List.js';
import { renderChat } from './components/Chat.js';
import { renderMais } from './components/Mais.js';
import { renderFicha } from './components/Ficha.js';
import { renderBackup } from './components/Backup.js';
import { renderSync } from './components/Sync.js';
import { renderIntervals } from './components/Intervals.js';

// Components
import { renderHeader } from './components/Header.js';
import { renderNav } from './components/Nav.js';
import { renderFab } from './components/Fab.js';
import { renderChatBar } from './components/ChatBar.js';
import { Modal } from './components/Modal.js';
import { FormModal } from './components/FormModal.js';

let currentRoute = 'home';
let searchQuery = '';
let modal = null;
let formModal = null;

// Route to page renderers
const pageRenderers = {
  home: renderHome,
  chat: renderChat,
  manut: () => renderList('manut'),
  abast: () => renderList('abast'),
  lemb: () => renderList('lemb'),
  doc: () => renderList('doc'),
  nota: () => renderList('nota'),
  mais: renderMais,
  ficha: renderFicha,
  backup: renderBackup,
  sync: renderSync,
  interv: renderIntervals
};

// Navigation tabs
const TABS = [
  { id: 'home', icon: 'home', label: 'Início' },
  { id: 'chat', icon: 'chat', label: 'Assistente' },
  { id: 'manut', icon: 'manut', label: 'Manutenção' },
  { id: 'abast', icon: 'abast', label: 'Abastecer' },
  { id: 'mais', icon: 'mais', label: 'Mais' }
];

/**
 * Initialize the application
 */
export async function initApp() {
  // Initialize modals
  modal = new Modal(document.getElementById('modal-root'));
  formModal = new FormModal(document.getElementById('form-modal-root'));

  // Initial render
  render();

  // Subscribe to state changes
  subscribe(render);

  // Subscribe to sync status
  onSyncStatusChange(renderHeader);

  // Initial sync if configured
  if (isSyncConfigured()) {
    pullFromGitHub(true);
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeydown);

  // Prevent zoom on input focus (iOS)
  document.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      e.target.style.fontSize = '16px';
    }
  });
}

/**
 * Navigate to a route
 */
export function navigate(route, options = {}) {
  currentRoute = route;
  searchQuery = '';
  render();
  if (!options.keepScroll) {
    window.scrollTo(0, 0);
  }
}

/**
 * Get current route
 */
export function getCurrentRoute() {
  return currentRoute;
}

/**
 * Set search query
 */
export function setSearchQuery(query) {
  searchQuery = query;
  render();
}

/**
 * Get search query
 */
export function getSearchQuery() {
  return searchQuery;
}

/**
 * Main render function
 */
function render() {
  const state = getState();

  // Render header
  renderHeader(state);

  // Render main content
  const mainEl = document.getElementById('main-content');
  const renderer = pageRenderers[currentRoute] || renderHome;
  mainEl.innerHTML = renderer(state, { searchQuery, navigate, modal, formModal });
  mainEl.classList.add('page');

  // Render nav
  renderNav(currentRoute);

  // Render FAB
  const fabContainer = document.getElementById('fab-container');
  const showFab = ['manut', 'abast', 'lemb', 'doc', 'nota'].includes(currentRoute);
  fabContainer.innerHTML = showFab ? renderFab(currentRoute) : '';

  // Render chat bar
  const chatBarContainer = document.getElementById('chat-bar-container');
  chatBarContainer.innerHTML = currentRoute === 'chat' ? renderChatBar() : '';

  // Update theme
  updateTheme();
}

/**
 * Handle keyboard shortcuts
 */
function handleKeydown(e) {
  // Escape closes modals
  if (e.key === 'Escape') {
    if (modal?.isOpen) modal.close();
    if (formModal?.isOpen) formModal.close();
  }

  // Cmd/Ctrl + K for search
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    const searchInput = document.querySelector('input[placeholder*="Buscar"]');
    if (searchInput) searchInput.focus();
  }
}

/**
 * Update theme based on preference
 */
function updateTheme() {
  const root = document.documentElement;
  const saved = root.dataset.theme;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (saved) {
    root.dataset.theme = saved;
  } else {
    root.dataset.theme = prefersDark ? 'dark' : 'light';
  }
}

/**
 * Toggle theme
 */
export function toggleTheme() {
  const root = document.documentElement;
  const current = root.dataset.theme || (prefersDark ? 'dark' : 'light');
  root.dataset.theme = current === 'dark' ? 'light' : 'dark';
  renderHeader(getState());
}

/**
 * Rename car
 */
export function renameCar() {
  const state = getState();
  formModal.open({
    title: 'Nome do carro',
    fields: [
      { name: 'nome', label: 'Como você chama o carro', type: 'text', value: state.nome, required: true }
    ],
    onSubmit: (data) => {
      import('./store.js').then(m => m.setCarName(data.nome));
      showToast('Nome alterado');
    }
  });
}

/**
 * Set current KM
 */
export function setKm() {
  const state = getState();
  const currentKm = state.km;
  formModal.open({
    title: 'Quilometragem atual',
    fields: [
      { name: 'km', label: 'Km rodados', type: 'number', value: currentKm, required: true, placeholder: 'Ex.: 86.200' }
    ],
    onSubmit: (data) => {
      import('./store.js').then(m => m.setCurrentKm(data.km));
      showToast('Quilometragem atualizada');
    }
  });
}

/**
 * Set consumption meta
 */
export function setMeta() {
  const state = getState();
  const meta = state.meta;
  formModal.open({
    title: 'Meta de consumo',
    fields: [
      { name: 'meta', label: 'Km por litro desejado', type: 'decimal', value: meta || '', placeholder: 'Ex.: 11,5', hint: 'Deixe vazio para remover a meta' }
    ],
    onSubmit: (data) => {
      import('./store.js').then(m => m.setMeta(data.meta));
      showToast(data.meta ? 'Meta salva' : 'Meta removida');
    }
  });
}

/**
 * Show toast notification
 */
export { showToast };

/**
 * Export for global access (used in inline handlers)
 */
window.garagemApp = {
  navigate,
  setSearchQuery,
  toggleTheme,
  renameCar,
  setKm,
  setMeta,
  showToast
};