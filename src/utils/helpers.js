/* ==========================================================================
   Utility Functions
   ========================================================================== */

/**
 * Escape HTML special characters
 */
export function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[c]));
}

/**
 * Generate unique ID
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

/**
 * Format number with Brazilian locale
 */
export function formatNumber(num) {
  return Number(num).toLocaleString('pt-BR');
}

/**
 * Format currency (BRL)
 */
export function formatCurrency(num) {
  return 'R$ ' + (Number(num) || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Format date as DD/MM/YYYY
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  return dateStr.split('-').reverse().join('/');
}

/**
 * Alias for formatNumber
 */
export const nf = formatNumber;

/**
 * Alias for formatDate
 */
export const dt = formatDate;

/**
 * Alias for formatCurrency (shorter name)
 */
export const mo = formatCurrency;

/**
 * Get today's date as YYYY-MM-DD
 */
export function getToday() {
  const d = new Date();
  return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
}

/**
 * Calculate days between date and today
 */
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(getToday() + 'T12:00:00');
  const target = new Date(dateStr + 'T12:00:00');
  return Math.ceil((target - today) / 864e5);
}

/**
 * Format km with dots
 */
export function formatKm(km) {
  if (!km && km !== 0) return '—';
  return String(km).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Parse km string to number
 */
export function parseKm(str) {
  return Number(String(str).replace(/\D/g, '')) || 0;
}

/**
 * Deep clone object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Debounce function
 */
export function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function
 */
export function throttle(fn, limit) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Format number input with thousand separators
 */
export function formatNumberInput(value) {
  if (value == null || value === '') return '';
  return String(value).replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Parse number from formatted string
 */
export function parseNumberInput(value) {
  if (typeof value === 'number') return Math.round(value) || 0;
  return Number(String(value).replace(/\D/g, '')) || 0;
}

/**
 * Parse decimal from formatted string (handles comma or dot decimals)
 */
export function parseDecimalInput(value) {
  if (typeof value === 'number') return isFinite(value) ? value : 0;

  let s = String(value).trim().replace(/[^\d.,-]/g, '');
  if (!s) return 0;

  if (s.includes(',') && s.includes('.')) {
    // "1.234,56" -> dots are thousands, comma is decimal
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  } else if (s.includes('.')) {
    const parts = s.split('.');
    if (parts.length > 2) {
      // "1.234.567" -> thousands
      s = parts.join('');
    } else if (parts[1].length === 3 && parts[0].length > 0) {
      // "1.500" -> thousands
      s = parts.join('');
    }
    // otherwise keep as decimal ("11.5", "150.50")
  }

  const n = Number(s);
  return isFinite(n) ? n : 0;
}

/**
 * Create element from HTML string
 */
export function createElement(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

/**
 * Show toast notification
 */
export function showToast(message, isError = false) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast${isError ? ' toast--error' : ''}`;
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 2200);
}

/**
 * Check if online
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Get safe area insets
 */
export function getSafeInsets() {
  return {
    top: `env(safe-area-inset-top, 0px)`,
    bottom: `env(safe-area-inset-bottom, 0px)`,
    left: `env(safe-area-inset-left, 0px)`,
    right: `env(safe-area-inset-right, 0px)`
  };
}

/**
 * Sleep utility
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry async function with exponential backoff
 */
export async function retry(fn, retries = 3, baseDelay = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await sleep(baseDelay);
    return retry(fn, retries - 1, baseDelay * 2);
  }
}