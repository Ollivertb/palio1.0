/* ==========================================================================
   FAB (Floating Action Button) Component
   ========================================================================== */

import { getIcon } from '../utils/icons.js';

const CATEGORY_LABELS = {
  manut: 'Manutenção',
  abast: 'Abastecimento',
  lemb: 'Lembrete',
  doc: 'Documento',
  nota: 'Anotação'
};

const CATEGORY_ICONS = {
  manut: 'manut',
  abast: 'abast',
  lemb: 'lemb',
  doc: 'doc',
  nota: 'nota'
};

/**
 * Render FAB
 */
export function renderFab(category) {
  const label = CATEGORY_LABELS[category] || 'Adicionar';
  const icon = CATEGORY_ICONS[category] || 'plus';

  return `
    <button
      class="fab"
      onclick="garagemApp.formModal?.openForm('${category}')"
      aria-label="Adicionar ${label}"
    >
      ${getIcon(icon)}
    </button>
  `;
}