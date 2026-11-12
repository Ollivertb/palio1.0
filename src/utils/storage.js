/* ==========================================================================
   Storage Utilities - localStorage + IndexedDB + GitHub Sync
   ========================================================================== */

import { generateId, deepClone } from './helpers.js';

const STORAGE_KEY = 'garagem-palio-v2';
const GH_CONFIG_KEY = 'garagem-gh-config';
const GH_STATE_KEY = 'garagem-gh-state';

/**
 * Default state structure
 */
export const DEFAULT_STATE = {
  data: {
    manut: [],
    abast: [],
    lemb: [],
    doc: [],
    nota: []
  },
  ficha: {},
  km: 0,
  nome: 'Meu Palio',
  intervals: {},
  meta: 0,
  chat: []
};

/**
 * Load state from localStorage
 */
export function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all fields exist
      return mergeWithDefaults(parsed);
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
  return deepClone(DEFAULT_STATE);
}

/**
 * Save state to localStorage
 */
export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.error('Failed to save state:', e);
    return false;
  }
}

/**
 * Merge loaded state with defaults
 */
function mergeWithDefaults(state) {
  const result = deepClone(DEFAULT_STATE);
  if (state.data) result.data = { ...DEFAULT_STATE.data, ...state.data };
  if (state.ficha) result.ficha = { ...DEFAULT_STATE.ficha, ...state.ficha };
  if (typeof state.km === 'number') result.km = state.km;
  if (state.nome) result.nome = state.nome;
  if (state.intervals) result.intervals = state.intervals;
  if (typeof state.meta === 'number') result.meta = state.meta;
  if (state.chat) result.chat = state.chat;
  return result;
}

/**
 * Clear all data
 */
export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
  return deepClone(DEFAULT_STATE);
}

/**
 * Export state as JSON string
 */
export function exportState(state) {
  return JSON.stringify(state, null, 2);
}

/**
 * Import state from JSON string
 */
export function importState(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr);
    // Handle legacy format
    if (parsed.maint || parsed.rem || parsed.notes) {
      return migrateLegacyData(parsed);
    }
    return mergeWithDefaults(parsed);
  } catch (e) {
    throw new Error('Arquivo de backup inválido');
  }
}

/**
 * Migrate legacy data format
 */
function migrateLegacyData(legacy) {
  const state = deepClone(DEFAULT_STATE);
  const now = new Date().toISOString().slice(0, 10);

  if (legacy.maint) {
    legacy.maint.forEach(item => {
      state.data.manut.push({
        id: generateId(),
        date: item.date || now,
        km: item.km || 0,
        tipo: item.tipo || 'Outro',
        peca: item.peca || '',
        desc: item.desc || '',
        cost: item.cost || 0,
        ofi: item.shop || '',
        obs: ''
      });
    });
  }

  if (legacy.rem) {
    legacy.rem.forEach(item => {
      state.data.lemb.push({
        id: generateId(),
        desc: item.desc || '',
        km: item.km || 0,
        date: item.date || '',
        obs: ''
      });
    });
  }

  if (legacy.notes) {
    legacy.notes.forEach(item => {
      state.data.nota.push({
        id: generateId(),
        titulo: item.t || '',
        texto: item.b || '',
        date: item.date || now
      });
    });
  }

  return state;
}

/**
 * GitHub Sync Configuration
 */
export function getGitHubConfig() {
  try {
    const stored = localStorage.getItem(GH_CONFIG_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
}

export function saveGitHubConfig(config) {
  try {
    localStorage.setItem(GH_CONFIG_KEY, JSON.stringify(config));
    return true;
  } catch (e) {
    return false;
  }
}

export function clearGitHubConfig() {
  localStorage.removeItem(GH_CONFIG_KEY);
  localStorage.removeItem(GH_STATE_KEY);
}

/**
 * GitHub Sync State
 */
export function getGitHubState() {
  try {
    const stored = localStorage.getItem(GH_STATE_KEY);
    return stored ? JSON.parse(stored) : { sha: '', dirty: false, lastSync: '', error: '' };
  } catch (e) {
    return { sha: '', dirty: false, lastSync: '', error: '' };
  }
}

export function saveGitHubState(state) {
  try {
    localStorage.setItem(GH_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save GitHub state:', e);
  }
}

/**
 * Prepare payload for GitHub sync
 */
export function createSyncPayload(state) {
  return {
    v: 2,
    ts: Date.now(),
    d: state.data,
    f: state.ficha,
    km: state.km,
    nome: state.nome,
    iv: state.intervals,
    meta: state.meta
  };
}

/**
 * Merge remote state with local state (last-write-wins per record)
 */
export function mergeStates(local, remote) {
  const merged = deepClone(local);

  // Merge data arrays by ID
  for (const key of Object.keys(DEFAULT_STATE.data)) {
    const localItems = local.data[key] || [];
    const remoteItems = remote.d?.[key] || [];
    const map = new Map();

    localItems.forEach(item => map.set(item.id, item));
    remoteItems.forEach(item => map.set(item.id, item));

    merged.data[key] = Array.from(map.values());
  }

  // Merge ficha (shallow merge)
  merged.ficha = { ...merged.ficha, ...(remote.f || {}) };

  // Take max km
  merged.km = Math.max(merged.km, remote.km || 0);

  // Merge intervals
  merged.intervals = { ...merged.intervals, ...(remote.iv || {}) };

  // Take meta (allow 0 to be a valid value)
  if (typeof remote.meta === 'number') merged.meta = remote.meta;

  // Keep local chat history (don't sync chat)
  return merged;
}

/**
 * Base64 encode for GitHub API
 */
export function base64Encode(str) {
  let binary = '';
  const bytes = new TextEncoder().encode(str);
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary);
}

/**
 * Base64 decode from GitHub API
 */
export function base64Decode(str) {
  const binary = atob(str.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}