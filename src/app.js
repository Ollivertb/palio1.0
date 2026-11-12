/* ==========================================================================
   Application Controller
   ========================================================================== */

import { getState, subscribe } from './store.js';
import { showToast } from './utils/helpers.js';
import { pullFromGitHub, onSyncStatusChange, isSyncConfigured } from './utils/github-sync.js';

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
import { renderChatBar, setupChatBar } from './components/ChatBar.js';
import { Modal } from './components/Modal.js';
import { FormModal, openFormModal } from './components/FormModal.js';
import { sendChatMessage } from './components/Chat.js';

let currentRoute = 'home';
let searchQuery = '';
let modal = null;
let formModal = null;

// Route to page renderers. Every renderer receives (state, ctx).
const pageRenderers = {
  home: renderHome,
  chat: renderChat,
  manut: (state, ctx) => renderList('manut', state, ctx),
  abast: (state, ctx) => renderList('abast', state, ctx),
  lemb: (state, ctx) => renderList('lemb', state, ctx),
  doc: (state, ctx) => renderList('doc', state, ctx),
  nota: (state, ctx) => renderList('nota', state, ctx),
  mais: renderMais,
  ficha: renderFicha,
  backup: renderBackup,
  sync: renderSync,
  interv: renderIntervals
};

/**
 * Initialize the application
 */
export async function initApp() {
  // Initialize modals
  const modalRoot = document.getElementById('modal-root');
  const formModalRoot = document.getElementById('form-modal-root');
  modal = new Modal(modalRoot);
  formModal = new FormModal(formModalRoot);

  // Expose the form modal instance for inline handlers (FAB, cards, etc.)
  window.garagemApp.formModal = formModal;

  // Initial render
  render();

  // Subscribe to state changes
  subscribe(render);

  // Subscribe to sync status (re-render header only)
  onSyncStatusChange(() => renderHeader(getState()));

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
 * Set search query (re-renders only the list container)
 */
export function setSearchQuery(query) {
  searchQuery = query;
  render();
  // Restore focus to the search box after re-render
  const input = document.querySelector('.search-input');
  if (input) {
    input.focus();
    const val = input.value;
    input.value = '';
    input.value = val;
  }
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

  renderHeader(state);

  const mainEl = document.getElementById('main-content');
  const renderer = pageRenderers[currentRoute] || renderHome;
  mainEl.innerHTML = renderer(state, { searchQuery, navigate, modal, formModal });

  renderNav(currentRoute);

  // FAB
  const fabContainer = document.getElementById('fab-container');
  const showFab = ['manut', 'abast', 'lemb', 'doc', 'nota'].includes(currentRoute);
  fabContainer.innerHTML = showFab ? renderFab(currentRoute) : '';

  // Chat bar
  const chatBarContainer = document.getElementById('chat-bar-container');
  if (currentRoute === 'chat') {
    chatBarContainer.innerHTML = renderChatBar();
    setupChatBar(sendChatMessage);
    // Keep the conversation scrolled to the bottom
    window.scrollTo(0, document.body.scrollHeight);
  } else {
    chatBarContainer.innerHTML = '';
  }

  updateTheme();
}

/**
 * Handle keyboard shortcuts
 */
function handleKeydown(e) {
  if (e.key === 'Escape') {
    if (modal?.isOpen) modal.close();
    if (formModal?.isOpen) formModal.close();
  }
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
  if (!root.dataset.theme) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = prefersDark ? 'dark' : 'light';
  }
}

/**
 * Toggle theme
 */
export function toggleTheme() {
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
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
    category: 'wheel',
    fields: [
      { name: 'nome', label: 'Como você chama o carro', type: 'text', value: state.nome, required: true, placeholder: 'Ex.: Meu Palio' }
    ],
    onSubmit: (data) => {
      import('./store.js').then(m => m.setCarName(data.nome));
    }
  });
}

/**
 * Set current KM
 */
export function setKm() {
  const state = getState();
  formModal.open({
    title: 'Quilometragem atual',
    category: 'wheel',
    fields: [
      { name: 'km', label: 'Km rodados', type: 'number', value: state.km, required: true, placeholder: 'Ex.: 86.200', hint: 'Se houver um registro com km maior, ele prevalece.' }
    ],
    onSubmit: (data) => {
      import('./store.js').then(m => m.setCurrentKm(data.km));
    }
  });
}

/**
 * Set consumption meta
 */
export function setMeta() {
  const state = getState();
  formModal.open({
    title: 'Meta de consumo',
    category: 'abast',
    fields: [
      { name: 'meta', label: 'Km por litro desejado', type: 'decimal', value: state.meta || '', placeholder: 'Ex.: 11,5', hint: 'Deixe vazio para remover a meta.' }
    ],
    onSubmit: (data) => {
      import('./store.js').then(m => m.setMeta(data.meta));
    }
  });
}

/**
 * Clear the assistant conversation (with confirmation)
 */
export function clearConversation() {
  if (confirm('Limpar a conversa? Os registros salvos continuam.')) {
    import('./store.js').then(m => m.clearChat());
  }
}

/* ==========================================================================
   Global API used by inline handlers in templates
   ========================================================================== */
window.garagemApp = Object.assign(window.garagemApp || {}, {
  navigate,
  setSearchQuery,
  toggleTheme,
  renameCar,
  setKm,
  setMeta,
  showToast,
  openFormModal,
  clearChat: clearConversation
});

export { showToast };