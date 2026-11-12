/* ==========================================================================
   List Helpers
   ========================================================================== */

import { dt, nf, mo, escapeHtml } from '../utils/helpers.js';

/**
 * Get record title for display
 */
export function getRecordTitle(category, record) {
  switch (category) {
    case 'manut': return record.tipo || 'Manutenção';
    case 'abast': return `${record.comb || ''} · ${record.lit || 0} L`;
    case 'lemb': return record.desc || 'Lembrete';
    case 'doc': return record.tipo || 'Documento';
    case 'nota': return record.titulo || 'Anotação';
    default: return 'Registro';
  }
}

/**
 * Get record meta array for display
 */
export function getRecordMeta(category, record) {
  const parts = [];

  switch (category) {
    case 'manut':
      if (record.date) parts.push(dt(record.date));
      if (record.km) parts.push(nf(record.km) + ' km');
      if (record.ofi) parts.push(record.ofi);
      if (record.peca) parts.push(record.peca);
      break;

    case 'abast':
      if (record.date) parts.push(dt(record.date));
      if (record.km) parts.push(nf(record.km) + ' km');
      if (record.posto) parts.push(record.posto);
      if (record.lit && record.cost) parts.push(mo(record.cost / record.lit) + '/L');
      break;

    case 'lemb':
      if (record.km) parts.push('Km ' + nf(record.km));
      if (record.date) parts.push(dt(record.date));
      break;

    case 'doc':
      if (record.date) parts.push('Vence ' + dt(record.date));
      break;

    case 'nota':
      if (record.date) parts.push(dt(record.date));
      break;
  }

  return parts;
}

/**
 * Get icon name for category
 */
export function getRecordIcon(category) {
  const icons = {
    manut: 'manut',
    abast: 'abast',
    lemb: 'lemb',
    doc: 'doc',
    nota: 'nota'
  };
  return icons[category] || 'doc';
}