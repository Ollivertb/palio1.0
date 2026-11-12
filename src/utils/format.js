/* ==========================================================================
   Format Utilities
   ========================================================================== */

import { formatNumber, formatCurrency, formatDate, formatKm, escapeHtml } from './helpers.js';

/**
 * Format maintenance type with icon
 */
export function formatMaintenanceType(type) {
  const icons = {
    'Óleo e filtro': '🛢️',
    'Correia dentada': '⚙️',
    'Freios': '🛑',
    'Suspensão': '🔧',
    'Pneus': '🛞',
    'Velas': '⚡',
    'Arrefecimento': '🌡️',
    'Elétrica': '🔌',
    'Embreagem': '⚙️',
    'Filtros': '🫙',
    'Motor': '🔧',
    'Revisão': '📋',
    'Funilaria': '🎨',
    'Outro': '📦'
  };
  return `${icons[type] || '📦'} ${escapeHtml(type)}`;
}

/**
 * Format fuel type with icon
 */
export function formatFuelType(type) {
  const icons = { Etanol: '🌱', Gasolina: '⛽', Misto: '⛽🌱' };
  return `${icons[type] || '⛽'} ${escapeHtml(type)}`;
}

/**
 * Format document type with icon
 */
export function formatDocType(type) {
  const icons = { IPVA: '📄', Seguro: '🛡️', Licenciamento: '📋', Multa: '🚨', Outro: '📄' };
  return `${icons[type] || '📄'} ${escapeHtml(type)}`;
}

/**
 * Format reminder status
 */
export function formatReminderStatus(km, date, currentKm) {
  const parts = [];

  if (km) {
    const diff = km - currentKm;
    if (diff <= 0) {
      parts.push({ text: `Vencido no km (${formatKm(Math.abs(diff))} km atrasado)`, class: 'tag--late' });
    } else {
      parts.push({ text: `Faltam ${formatKm(diff)} km`, class: diff <= 500 ? 'tag--soon' : 'tag--ok' });
    }
  }

  if (date) {
    const days = daysUntil(date);
    if (days < 0) {
      parts.push({ text: `Venceu há ${Math.abs(days)} dias`, class: 'tag--late' });
    } else {
      parts.push({ text: `Em ${days} dias`, class: days <= 30 ? 'tag--soon' : 'tag--ok' });
    }
  }

  return parts;
}

/**
 * Format item meta array for display
 */
export function formatItemMeta(metaArray) {
  return metaArray.filter(Boolean).map(escapeHtml).join(' · ');
}

/**
 * Calculate average consumption from full-tank fillups
 */
export function calculateAverageConsumption(fillups) {
  const valid = fillups
    .filter(f => f.km && f.lit && f.full === 'Sim')
    .sort((a, b) => a.km - b.km);

  if (valid.length < 2) return null;

  let totalKm = 0;
  let totalLit = 0;
  let lastKm = null;

  for (const f of valid) {
    const km = Number(f.km);
    const lit = Number(f.lit);
    if (lastKm !== null && km > lastKm) {
      totalKm += km - lastKm;
      totalLit += lit;
    }
    lastKm = km;
  }

  return totalLit > 0 ? totalKm / totalLit : null;
}

/**
 * Get consumption series for chart
 */
export function getConsumptionSeries(fillups) {
  const valid = fillups
    .filter(f => f.km && f.lit && f.full === 'Sim')
    .sort((a, b) => a.km - b.km);

  const series = [];
  let lastKm = null;
  let accLit = 0;

  for (const f of valid) {
    const km = Number(f.km);
    const lit = Number(f.lit);
    accLit += lit;

    if (f.full === 'Sim') {
      if (lastKm !== null && km > lastKm) {
        series.push({
          date: f.date,
          km: km - lastKm,
          lit: accLit,
          consumption: (km - lastKm) / accLit,
          fuel: f.comb
        });
      }
      lastKm = km;
      accLit = 0;
    }
  }

  return series;
}

/**
 * Get monthly expenses
 */
export function getMonthlyExpenses(data, months = 6) {
  const monthKeys = getLastMonthsKeys(months);
  const categories = ['manut', 'abast', 'doc'];

  return monthKeys.map(key => {
    const total = categories.reduce((sum, cat) => {
      return sum + (data[cat] || [])
        .filter(item => (item.date || '').slice(0, 7) === key)
        .reduce((s, item) => s + (Number(item.cost) || 0), 0);
    }, 0);
    return { month: key, total };
  });
}

/**
 * Get last N months keys
 */
function getLastMonthsKeys(n) {
  const keys = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

/**
 * Format consumption for display
 */
export function formatConsumption(kmPerLiter) {
  if (!kmPerLiter) return '—';
  return kmPerLiter.toFixed(1).replace('.', ',') + ' km/l';
}

/**
 * Format currency for display
 */
export function formatCurrencyDisplay(value) {
  return formatCurrency(value);
}

/**
 * Format percentage (ethanol vs gasoline)
 */
export function formatEthanolAdvantage(ethanolAvg, gasolineAvg) {
  if (!ethanolAvg || !gasolineAvg) return null;
  const ratio = ethanolAvg / gasolineAvg;
  return Math.round(ratio * 100);
}