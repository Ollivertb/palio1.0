/* ==========================================================================
   Ficha (Car Info) Page Component
   ========================================================================== */

import { getIcon } from '../utils/icons.js';
import { escapeHtml } from '../utils/helpers.js';
import { getState, updateFicha } from '../store.js';

const FICHA_FIELDS = [
  { key: 'motor', label: 'Motor / cilindrada', type: 'text', placeholder: 'Ex.: 1.4 Fire Flex 8V' },
  { key: 'cor', label: 'Cor', type: 'text', placeholder: 'Ex.: Vermelho Alpine' },
  { key: 'placa', label: 'Placa', type: 'text', placeholder: 'Ex.: ABC-1234' },
  { key: 'compra', label: 'Data / km de compra', type: 'text', placeholder: 'Ex.: 15/03/2020 · 72.000 km' },
  { key: 'tanque', label: 'Tanque (litros)', type: 'text', placeholder: 'Ex.: 48 L' },
  { key: 'oleo', label: 'Óleo (tipo e litros)', type: 'text', placeholder: 'Ex.: 5W30 · 3,5 L' },
  { key: 'pneu', label: 'Pneus (medida)', type: 'text', placeholder: 'Ex.: 175/65 R14' },
  { key: 'calib', label: 'Calibragem (psi)', type: 'text', placeholder: 'Ex.: 32 frente / 30 trás' },
  { key: 'bat', label: 'Bateria', type: 'text', placeholder: 'Ex.: 60 Ah / 450 A' },
  { key: 'velas', label: 'Velas', type: 'text', placeholder: 'Ex.: NGK BKR6E / 0,9 mm' },
  { key: 'far', label: 'Filtro de ar', type: 'text', placeholder: 'Ex.: Mann C 25 114' },
  { key: 'foleo', label: 'Filtro de óleo', type: 'text', placeholder: 'Ex.: Mann W 712/75' },
  { key: 'fcomb', label: 'Filtro de combustível', type: 'text', placeholder: 'Ex.: Mann WK 818' },
  { key: 'lamp', label: 'Lâmpadas do farol', type: 'text', placeholder: 'Ex.: H4 55/60W' },
  { key: 'conn', label: 'Conector do farol', type: 'text', placeholder: 'Ex.: 3 pinos (padrão Fiat)' },
  { key: 'freio', label: 'Pastilhas / discos', type: 'text', placeholder: 'Ex.: Pastilha: 13048 / Disco: 240mm' },
  { key: 'obs', label: 'Outras informações', type: 'textarea', placeholder: 'Códigos, números de série, observações...' }
];

/**
 * Render Ficha page
 */
export function renderFicha(state, { navigate }) {
  const ficha = state.ficha || {};

  return `
    <button class="back-btn" onclick="garagemApp.navigate('mais')">${getIcon('chevronRight')} Mais</button>

    <h2 style="font-size: 1.375rem; margin-top: 6px; display: flex; align-items: center; gap: 8px;">
      ${getIcon('wheel')} Ficha do carro
    </h2>

    <p class="text-muted" style="margin-bottom: 10px;">Salva automaticamente. Preencha conforme for descobrindo.</p>

    <div class="card">
      ${FICHA_FIELDS.map(field => renderFichaField(field, ficha[field.key] || '')).join('')}
    </div>
  `;
}

/**
 * Render a single ficha field
 */
function renderFichaField(field, value) {
  const id = `ficha-${field.key}`;

  if (field.type === 'textarea') {
    return `
      <div class="form-field">
        <label for="${id}">${field.label}</label>
        <textarea id="${id}" rows="3" placeholder="${field.placeholder}" oninput="saveFichaField('${field.key}', this.value)">${escapeHtml(value)}</textarea>
      </div>
    `;
  }

  return `
    <div class="form-field">
      <label for="${id}">${field.label}</label>
      <input type="text" id="${id}" placeholder="${field.placeholder}" value="${escapeHtml(value)}" oninput="saveFichaField('${field.key}', this.value)">
    </div>
  `;
}

/**
 * Save ficha field (debounced)
 */
let saveTimeout = null;
window.saveFichaField = function(key, value) {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    import('../store.js').then(m => m.updateFicha(key, value));
  }, 500);
};