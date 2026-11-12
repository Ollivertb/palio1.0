/* ==========================================================================
   Date Utilities
   ========================================================================== */

import { getToday, daysUntil } from './helpers.js';

/**
 * Parse relative date strings (hoje, ontem, dia X, DD/MM, DD/MM/YYYY)
 */
export function parseRelativeDate(input) {
  const today = new Date(getToday() + 'T12:00:00');
  const lower = input.toLowerCase().trim();

  // Hoje
  if (lower === 'hoje') return getToday();

  // Ontem
  if (lower === 'ontem') {
    const d = new Date(today - 864e5);
    return formatDateISO(d);
  }

  // Dia X (ex: "dia 15")
  const dayMatch = lower.match(/^dia\s+(\d{1,2})$/);
  if (dayMatch) {
    const day = Number(dayMatch[1]);
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    // Se o dia já passou este mês, assume mês passado
    const target = new Date(year, month - 1, day);
    if (target > today) {
      target.setMonth(target.getMonth() - 1);
    }
    return formatDateISO(target);
  }

  // DD/MM ou DD/MM/YYYY
  const dateMatch = lower.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (dateMatch) {
    const day = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    let year = dateMatch[3] ? Number(dateMatch[3]) : today.getFullYear();
    if (year < 100) year += 2000;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // YYYY-MM-DD (already ISO)
  const isoMatch = lower.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return lower;

  return null;
}

/**
 * Format Date as YYYY-MM-DD
 */
export function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get month key (YYYY-MM)
 */
export function getMonthKey(dateStr) {
  return dateStr ? dateStr.slice(0, 7) : getToday().slice(0, 7);
}

/**
 * Get last 6 months keys
 */
export function getLast6Months() {
  const months = [];
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

/**
 * Get month name abbreviation (PT-BR)
 */
export function getMonthAbbr(monthKey) {
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const month = Number(monthKey.slice(5)) - 1;
  return months[month] || '';
}

/**
 * Check if date is in the past
 */
export function isPast(dateStr) {
  return dateStr && dateStr < getToday();
}

/**
 * Check if date is within days
 */
export function isWithinDays(dateStr, days) {
  if (!dateStr) return false;
  const diff = daysUntil(dateStr);
  return diff !== null && diff >= 0 && diff <= days;
}

/**
 * Add months to date
 */
export function addMonths(dateStr, months) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T12:00:00');
  d.setMonth(d.getMonth() + months);
  return formatDateISO(d);
}

/**
 * Calculate next service date based on last service and interval
 */
export function calculateNextService(lastDate, lastKm, intervalKm, intervalMonths) {
  const results = {};

  if (intervalKm && lastKm) {
    results.nextKm = lastKm + intervalKm;
  }

  if (intervalMonths && lastDate) {
    results.nextDate = addMonths(lastDate, intervalMonths);
  }

  return results;
}