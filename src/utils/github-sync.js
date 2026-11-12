/* ==========================================================================
   GitHub Sync Module
   ========================================================================== */

import { base64Encode, base64Decode, createSyncPayload, mergeStates, getGitHubConfig, getGitHubState, saveGitHubState } from './storage.js';
import { showToast } from './helpers.js';

const GITHUB_API = 'https://api.github.com';

let pullInProgress = false;
let pushTimeout = null;
let lastPullTime = 0;

const SYNC_STATUS = {
  OK: 'ok',
  SYNCING: 'syncing',
  ERROR: 'error'
};

let statusListeners = [];

/**
 * Subscribe to sync status changes
 */
export function onSyncStatusChange(listener) {
  statusListeners.push(listener);
  return () => {
    statusListeners = statusListeners.filter(l => l !== listener);
  };
}

function notifyStatus(status, error = '') {
  statusListeners.forEach(l => l(status, error));
}

/**
 * Get GitHub API headers
 */
function getHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

/**
 * Build GitHub API URL
 */
function buildUrl(config, method) {
  const base = `${GITHUB_API}/repos/${config.repo}/contents/${config.path}`;
  if (method === 'GET') {
    return `${base}?ref=${encodeURIComponent(config.branch)}`;
  }
  return base;
}

/**
 * Handle GitHub API error responses
 */
function handleGitHubError(response) {
  if (response.status === 401 || response.status === 403) {
    return 'Token inválido ou sem permissão';
  }
  if (response.status === 404) {
    return 'Repositório, branch ou arquivo não encontrado';
  }
  return `Erro do GitHub (${response.status})`;
}

/**
 * Pull data from GitHub
 */
export async function pullFromGitHub(force = false) {
  const config = getGitHubConfig();
  if (!config || pullInProgress) return false;

  // Rate limit: don't pull more than once per 15 seconds unless forced
  const now = Date.now();
  if (!force && now - lastPullTime < 15000) return false;

  pullInProgress = true;
  lastPullTime = now;
  notifyStatus(SYNC_STATUS.SYNCING);

  try {
    const response = await fetch(buildUrl(config, 'GET'), {
      method: 'GET',
      cache: 'no-store',
      headers: getHeaders(config.token)
    });

    if (response.status === 404) {
      // File doesn't exist yet, push local data
      pullInProgress = false;
      await pushToGitHub(true);
      return true;
    }

    if (!response.ok) {
      throw new Error(handleGitHubError(response));
    }

    const result = await response.json();
    const remoteData = JSON.parse(base64Decode(result.content));

    const state = getGitHubState();
    const shaChanged = result.sha !== state.sha;

    if (shaChanged) {
      // Merge remote with local
      const localState = await import('./storage.js').then(m => m.loadState());
      const merged = mergeStates(localState, remoteData);

      await import('./storage.js').then(m => m.saveState(merged));

      // Update in-memory state so the UI reflects the merged data
      await import('../store.js').then(m => m.reloadState());

      state.sha = result.sha;
      state.dirty = true;
      saveGitHubState(state);

      showToast(state.sha ? 'Dados mesclados com o GitHub' : 'Dados carregados do GitHub');
    }

    notifyStatus(SYNC_STATUS.OK);
    pullInProgress = false;

    // If we have local changes, push after pull
    if (state.dirty) {
      await pushToGitHub(true);
    }

    return true;
  } catch (error) {
    console.error('GitHub pull error:', error);
    notifyStatus(SYNC_STATUS.ERROR, error.message);
    pullInProgress = false;
    return false;
  }
}

/**
 * Push data to GitHub
 */
export async function pushToGitHub(retry = false) {
  const config = getGitHubConfig();
  if (!config) return false;

  clearTimeout(pushTimeout);
  notifyStatus(SYNC_STATUS.SYNCING);

  try {
    const localState = await import('./storage.js').then(m => m.loadState());
    const payload = createSyncPayload(localState);
    const content = base64Encode(JSON.stringify(payload, null, 2));

    const state = getGitHubState();
    const body = {
      message: `Garagem do Palio: ${new Date().toLocaleString('pt-BR')}`,
      content,
      branch: config.branch
    };

    if (state.sha && state.sha !== 'x') {
      body.sha = state.sha;
    }

    const response = await fetch(buildUrl(config, 'PUT'), {
      method: 'PUT',
      cache: 'no-store',
      headers: getHeaders(config.token),
      body: JSON.stringify(body)
    });

    if ((response.status === 409 || response.status === 422) && !retry) {
      // Conflict, need to pull first
      state.sha = 'x';
      saveGitHubState(state);
      await pullFromGitHub(true);
      return pushToGitHub(true);
    }

    if (!response.ok) {
      throw new Error(handleGitHubError(response));
    }

    const result = await response.json();
    state.sha = result.content.sha;
    state.dirty = false;
    state.lastSync = new Date().toLocaleString('pt-BR');
    state.error = '';
    saveGitHubState(state);

    notifyStatus(SYNC_STATUS.OK);
    showToast('Sincronizado com GitHub ✓');
    return true;
  } catch (error) {
    console.error('GitHub push error:', error);
    const state = getGitHubState();
    state.error = error.message;
    saveGitHubState(state);
    notifyStatus(SYNC_STATUS.ERROR, error.message);
    return false;
  }
}

/**
 * Mark local data as dirty (needs push)
 */
export function markDirty() {
  const state = getGitHubState();
  state.dirty = true;
  saveGitHubState(state);

  // Debounced push
  clearTimeout(pushTimeout);
  pushTimeout = setTimeout(() => pushToGitHub(), 2500);
}

/**
 * Check if sync is configured
 */
export function isSyncConfigured() {
  return !!getGitHubConfig();
}

/**
 * Get sync status info
 */
export function getSyncInfo() {
  const config = getGitHubConfig();
  const state = getGitHubState();
  return {
    configured: !!config,
    repo: config?.repo || '',
    branch: config?.branch || 'main',
    path: config?.path || 'dados.json',
    status: state.error ? SYNC_STATUS.ERROR : (state.dirty ? SYNC_STATUS.SYNCING : SYNC_STATUS.OK),
    lastSync: state.lastSync || '',
    error: state.error || '',
    sha: state.sha || ''
  };
}

/**
 * Test GitHub connection
 */
export async function testConnection(config) {
  try {
    const response = await fetch(
      `${GITHUB_API}/repos/${config.repo}/contents/${config.path}?ref=${encodeURIComponent(config.branch)}`,
      { method: 'GET', headers: getHeaders(config.token), cache: 'no-store' }
    );

    if (response.status === 404) {
      // Repo exists but file doesn't - that's OK for first sync
      return { success: true, exists: false };
    }

    if (!response.ok) {
      return { success: false, error: handleGitHubError(response) };
    }

    return { success: true, exists: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}