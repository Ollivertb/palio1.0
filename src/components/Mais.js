/* ==========================================================================
   Mais (More) Page Component
   ========================================================================== */

import { getIcon } from '../utils/icons.js';
import { escapeHtml, formatCurrency, formatNumber } from '../utils/helpers.js';
import { getState } from '../store.js';

const MORE_ITEMS = [
  { id: 'lemb', icon: 'lemb', label: 'Lembretes', countKey: 'lemb' },
  { id: 'doc', icon: 'doc', label: 'Documentos', countKey: 'doc' },
  { id: 'nota', icon: 'nota', label: 'Anotações', countKey: 'nota' },
  { id: 'sync', icon: 'cloud', label: 'Sincronização (GitHub)', desc: 'Guarda e puxa seus dados do seu repositório', action: 'sync' },
  { id: 'interv', icon: 'cal', label: 'Intervalos de revisão', desc: 'Ajuste de km e meses para cada serviço', action: 'interv' },
  { id: 'ficha', icon: 'wheel', label: 'Ficha do carro', desc: 'Conhecimento: medidas, óleo, peças, códigos', action: 'ficha' },
  { id: 'backup', icon: 'save', label: 'Backup e dados', desc: 'Exportar, importar, apagar', action: 'backup' }
];

/**
 * Render Mais page
 */
export function renderMais(state, { navigate }) {
  const data = getState().data;

  return `
    <button class="back-btn" onclick="garagemApp.navigate('home')">${getIcon('chevronRight')} Início</button>

    <h2 style="font-size: 1.375rem; margin-top: 6px;">Mais</h2>

    <div class="more-list">
      ${MORE_ITEMS.map(item => {
        if (item.countKey) {
          const count = data[item.countKey]?.length || 0;
          return `
            <div class="item" onclick="garagemApp.navigate('${item.id}')">
              <div class="item__icon">${getIcon(item.icon)}</div>
              <div class="item__content">
                <div class="item__title">${item.label}</div>
                <div class="item__meta text-muted">${count} ${count === 1 ? 'registro' : 'registros'}</div>
              </div>
              <span class="item__chevron">${getIcon('chevronRight')}</span>
            </div>
          `;
        }
        return `
          <div class="item" onclick="garagemApp.navigate('${item.id}')">
            <div class="item__icon">${getIcon(item.icon)}</div>
            <div class="item__content">
              <div class="item__title">${item.label}</div>
              <div class="item__meta text-muted">${item.desc}</div>
            </div>
            <span class="item__chevron">${getIcon('chevronRight')}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}