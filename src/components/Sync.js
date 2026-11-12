/* ==========================================================================
   Sync Page Component
   ========================================================================== */

import { getIcon } from '../utils/icons.js';
import { escapeHtml } from '../utils/helpers.js';
import { getState } from '../store.js';
import { getGitHubConfig, saveGitHubConfig, clearGitHubConfig } from '../utils/storage.js';
import { testConnection, pullFromGitHub, pushToGitHub, getSyncInfo, onSyncStatusChange } from '../utils/github-sync.js';
import { showToast } from '../utils/helpers.js';

let statusUnsubscribe = null;

/**
 * Render Sync page
 */
export function renderSync(state, { navigate }) {
  const config = getGitHubConfig();
  const info = getSyncInfo();

  if (!config) {
    return renderSyncSetup();
  }

  // Subscribe to status changes and re-render only while on this page.
  if (!statusUnsubscribe) {
    statusUnsubscribe = onSyncStatusChange(() => {
      import('../app.js').then(({ getCurrentRoute, navigate }) => {
        if (getCurrentRoute() === 'sync') navigate('sync', { keepScroll: true });
      });
    });
  }

  return `
    <button class="back-btn" onclick="garagemApp.navigate('mais')">${getIcon('chevronRight')} Mais</button>

    <h2 style="font-size: 1.375rem; margin-top: 6px; display: flex; align-items: center; gap: 8px;">
      ${getIcon('cloud')} Sincronização (GitHub)
    </h2>

    <div class="card text-muted" style="margin-bottom: 24px;">
      Seus dados ficam num arquivo <b>dados.json</b> no seu repositório. Em outro aparelho, abra o app e conecte com o mesmo repositório e token. Use um repositório <b>privado só para os dados</b>. O repositório do app, que é público, não deve ter dados.
    </div>

    <div class="card">
      <div class="kv-list">
        <dt>Repositório</dt><dd>${escapeHtml(config.repo)}</dd>
        <dt>Branch</dt><dd>${escapeHtml(config.branch || 'main')}</dd>
        <dt>Arquivo</dt><dd>${escapeHtml(config.path || 'dados.json')}</dd>
        <dt>Última sincronização</dt><dd>${info.lastSync || 'Nunca'}</dd>
      </div>
    </div>

    <div class="card sync__status sync__status--${info.status}" style="margin-top: 16px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="status-dot" style="width: 8px; height: 8px; border-radius: 50%; background: ${getStatusColor(info.status)};"></span>
        <span>${getStatusText(info.status, info.error)}</span>
      </div>
      ${info.error ? `<div class="text-muted" style="margin-top: 4px;">${escapeHtml(info.error)}</div>` : ''}
    </div>

    <div style="display: flex; gap: 8px; margin-top: 16px;">
      <button class="btn btn--primary" onclick="manualSync()" style="flex: 1;" ${info.status === 'syncing' ? 'disabled' : ''}>
        ${info.status === 'syncing' ? `<span class="loading-dots" style="display:inline-flex;margin:0"><i></i><i></i><i></i></span>` : `${getIcon('sync')} Sincronizar agora`}
      </button>
      <button class="btn btn--secondary" onclick="disconnectGitHub()" style="flex: 1;">${getIcon('x')} Desconectar</button>
    </div>

    <details style="margin-top: 24px;">
      <summary class="text-muted" style="cursor: pointer;">Detalhes técnicos</summary>
      <pre class="card" style="margin-top: 8px; font-size: 0.75rem; overflow: auto; white-space: pre-wrap;">${JSON.stringify(info, null, 2)}</pre>
    </details>
  `;
}

/**
 * Render sync setup form
 */
function renderSyncSetup() {
  return `
    <button class="back-btn" onclick="garagemApp.navigate('mais')">${getIcon('chevronRight')} Mais</button>

    <h2 style="font-size: 1.375rem; margin-top: 6px; display: flex; align-items: center; gap: 8px;">
      ${getIcon('cloud')} Sincronização (GitHub)
    </h2>

    <div class="card text-muted" style="margin-bottom: 24px;">
      Configure um repositório <b>privado</b> no GitHub para guardar seus backups automaticamente.
      <ol style="margin: 12px 0 0 18px; font-size: 0.875rem;">
        <li>Crie um repositório privado no GitHub (ex: <code>palio-data</code>)</li>
        <li>Gere um <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener">Personal Access Token</a> com escopo <code>repo</code></li>
        <li>Preencha os campos abaixo e toque em "Conectar"</li>
      </ol>
    </div>

    <div class="card">
      <div class="form-field">
        <label for="sync-repo">Repositório (usuario/repo)</label>
        <input type="text" id="sync-repo" placeholder="Ex.: meuusuario/palio-data" autocomplete="off">
      </div>

      <div class="form-field">
        <label for="sync-branch">Branch</label>
        <input type="text" id="sync-branch" value="main" placeholder="main">
      </div>

      <div class="form-field">
        <label for="sync-path">Caminho do arquivo</label>
        <input type="text" id="sync-path" value="dados.json" placeholder="dados.json">
      </div>

      <div class="form-field">
        <label for="sync-token">Personal Access Token</label>
        <input type="password" id="sync-token" placeholder="ghp_xxxxxxxxxxxx" autocomplete="off">
        <small class="text-muted">Nunca compartilhe este token. Ele fica salvo apenas no seu navegador.</small>
      </div>

      <button class="btn btn--primary" onclick="connectGitHub()" style="margin-top: 8px; width: 100%;">${getIcon('cloud')} Conectar e testar</button>
    </div>
  `;
}

/**
 * Connect to GitHub
 */
async function connectGitHub() {
  const repo = document.getElementById('sync-repo').value.trim();
  const branch = document.getElementById('sync-branch').value.trim() || 'main';
  const path = document.getElementById('sync-path').value.trim() || 'dados.json';
  const token = document.getElementById('sync-token').value.trim();

  if (!repo || !token) {
    showToast('Preencha repositório e token', true);
    return;
  }

  if (!repo.includes('/')) {
    showToast('Formato: usuario/repositorio', true);
    return;
  }

  const config = { repo, branch, path, token };

  // Test connection
  showToast('Testando conexão...');
  const result = await testConnection(config);

  if (!result.success) {
    showToast('Erro: ' + result.error, true);
    return;
  }

  saveGitHubConfig(config);
  showToast(result.exists ? 'Conectado! Dados encontrados no GitHub.' : 'Conectado! Repositório pronto para o primeiro backup.');

  // Reload to show sync page
  setTimeout(() => window.location.reload(), 500);
}

/**
 * Disconnect GitHub
 */
function disconnectGitHub() {
  if (confirm('Desconectar do GitHub? Os dados locais não serão apagados.')) {
    clearGitHubConfig();
    showToast('Desconectado do GitHub');
    setTimeout(() => window.location.reload(), 500);
  }
}

/**
 * Manual sync
 */
async function manualSync() {
  const info = getSyncInfo();
  if (info.status === 'syncing') return;

  showToast('Sincronizando...');
  await pullFromGitHub(true);
  await pushToGitHub();
}

/**
 * Get status color
 */
function getStatusColor(status) {
  switch (status) {
    case 'ok': return 'var(--color-success)';
    case 'syncing': return 'var(--color-warning)';
    case 'error': return 'var(--color-accent)';
    default: return 'var(--color-muted)';
  }
}

/**
 * Get status text
 */
function getStatusText(status, error) {
  switch (status) {
    case 'ok': return 'Sincronizado';
    case 'syncing': return 'Sincronizando...';
    case 'error': return 'Erro: ' + (error || 'Desconhecido');
    default: return 'Desconhecido';
  }
}

/* ==========================================================================
   Global handlers used by inline template attributes
   ========================================================================== */
window.connectGitHub = connectGitHub;
window.disconnectGitHub = disconnectGitHub;
window.manualSync = manualSync;