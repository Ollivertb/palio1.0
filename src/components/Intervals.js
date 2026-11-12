/* ==========================================================================
   Intervals Page Component
   ========================================================================== */

import { getIcon } from '../utils/icons.js';
import { escapeHtml } from '../utils/helpers.js';
import { getState, getAllIntervals, setInterval } from '../store.js';

const DEFAULT_INTERVALS = {
  'Óleo e filtro': [10000, 12],
  'Correia dentada': [50000, 60],
  'Freios': [30000, 24],
  'Velas': [40000, 36],
  'Filtros': [15000, 12],
  'Arrefecimento': [40000, 24],
  'Pneus': [40000, 48],
  'Suspensão': [60000, 48],
  'Embreagem': [80000, 0]
};

/**
 * Render Intervals page
 */
export function renderIntervals(state, { navigate }) {
  const intervals = getAllIntervals();

  return `
    <button class="back-btn" onclick="garagemApp.navigate('mais')">${getIcon('chevronRight')} Mais</button>

    <h2 style="font-size: 1.375rem; margin-top: 6px; display: flex; align-items: center; gap: 8px;">
      ${getIcon('cal')} Intervalos de revisão
    </h2>

    <p class="text-muted" style="margin-bottom: 10px;">
      Os valores iniciais são estimativas genéricas. Confira o manual do seu Palio e ajuste. Use 0 para ignorar.
    </p>

    <div class="card">
      ${Object.entries(DEFAULT_INTERVALS).map(([service, [defKm, defMonths]]) => {
        const [km, months] = intervals[service] || [defKm, defMonths];
        return `
          <div class="interval-field">
            <b>${escapeHtml(service)}</b>
            <div class="row">
              <div class="form-field">
                <label>A cada (km)</label>
                <input type="number" inputmode="numeric" value="${km}" min="0" onchange="saveInterval('${service}', 0, this.value)">
              </div>
              <div class="form-field">
                <label>Ou (meses)</label>
                <input type="number" inputmode="numeric" value="${months}" min="0" onchange="saveInterval('${service}', 1, this.value)">
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <div class="card text-muted" style="margin-top: 16px;">
      <small>
        <b>Dica:</b> O app calcula automaticamente as próximas revisões baseadas no último registro de cada serviço.
        Veja na tela inicial (Próximas revisões) ou em Manutenção.
      </small>
    </div>
  `;
}

/**
 * Save interval
 */
window.saveInterval = function(service, index, value) {
  const num = parseInt(value, 10) || 0;
  const current = getAllIntervals()[service] || DEFAULT_INTERVALS[service];
  const [km, months] = current;
  if (index === 0) {
    setInterval(service, num, months);
  } else {
    setInterval(service, km, num);
  }
};