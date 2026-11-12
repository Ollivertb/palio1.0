/* ==========================================================================
   List Page Component
   ========================================================================== */

import { getIcon } from '../utils/icons.js';
import { escapeHtml, formatCurrency, formatNumber, dt, nf, mo } from '../utils/helpers.js';
import { getState } from '../store.js';
import { getRecordTitle, getRecordMeta, getRecordIcon } from './ListHelpers.js';

const CATEGORY_CONFIG = {
  manut: { label: 'Manutenções', icon: 'manut', plural: 'manutenções' },
  abast: { label: 'Abastecimentos', icon: 'abast', plural: 'abastecimentos' },
  lemb: { label: 'Lembretes', icon: 'lemb', plural: 'lembretes' },
  doc: { label: 'Documentos', icon: 'doc', plural: 'documentos' },
  nota: { label: 'Anotações', icon: 'nota', plural: 'anotações' }
};

/**
 * Render list page
 */
export function renderList(category, state, { searchQuery, navigate, formModal }) {
  const config = CATEGORY_CONFIG[category];
  const items = getFilteredItems(category, searchQuery);
  const total = getState().data[category].length;
  const totalCost = getTotalCost(category);

  let extraInfo = '';
  if (category === 'abast') {
    const avg = getAverageConsumptionForCategory();
    if (avg) extraInfo = ` · ${avg.toFixed(1).replace('.', ',')} km/l`;
  }

  return `
    ${['lemb', 'doc', 'nota'].includes(category) ? `<button class="back-btn" onclick="garagemApp.navigate('mais')">${getIcon('chevronRight')} Mais</button>` : ''}

    <h2 style="font-size: 1.375rem; margin-top: 6px; display: flex; align-items: center; gap: 8px;">
      ${getIcon(config.icon)} ${config.label}
    </h2>

    <div class="text-muted" style="margin: -4px 2px 8px;">
      ${total} ${config.plural}${totalCost ? ` · ${formatCurrency(totalCost)}` : ''}${extraInfo}
    </div>

    ${category === 'abast' ? renderConsumptionCard() : ''}

    <input type="search" placeholder="Buscar…" value="${escapeHtml(searchQuery)}"
           oninput="garagemApp.setSearchQuery(this.value)"
           class="search-input" aria-label="Buscar ${config.plural}">

    <div id="list-items" class="list-items" role="list">
      ${items.length ? items.map(item => renderListItem(category, item)).join('') : `
        <div class="empty">
          ${searchQuery ? 'Nada encontrado.' : `Nada por aqui ainda. Toque no + para adicionar uma ${config.label.toLowerCase().slice(0, -1)}.`}
        </div>
      `}
    </div>
  `;
}

/**
 * Get filtered items for category
 */
function getFilteredItems(category, query) {
  const items = getState().data[category] || [];
  const q = query.toLowerCase();

  return items
    .filter(item => !q || JSON.stringify(item).toLowerCase().includes(q))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

/**
 * Get total cost for category
 */
function getTotalCost(category) {
  return (getState().data[category] || []).reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
}

/**
 * Get average consumption for fuel
 */
function getAverageConsumptionForCategory() {
  const fillups = getState().data.abast
    .filter(f => f.km && f.lit && f.full === 'Sim')
    .sort((a, b) => a.km - b.km);

  if (fillups.length < 2) return null;

  let totalKm = 0, totalLit = 0, lastKm = null;
  for (const f of fillups) {
    const km = Number(f.km), lit = Number(f.lit);
    if (lastKm !== null && km > lastKm) {
      totalKm += km - lastKm;
      totalLit += lit;
    }
    lastKm = km;
  }
  return totalLit > 0 ? totalKm / totalLit : null;
}

/**
 * Render consumption card (for abastecimentos list)
 */
function renderConsumptionCard() {
  const series = getConsumptionSeries();
  if (series.length < 2) {
    return `
      <div class="card text-muted" style="margin-bottom: 16px;">
        Registre pelo menos 3 abastecimentos com tanque cheio para ver o gráfico de consumo.
        <br><button class="btn btn--ghost" onclick="garagemApp.setMeta()" style="margin-top: 8px;">Definir meta de consumo</button>
      </div>
    `;
  }

  const last = series[series.length - 1];
  const meta = getState().meta || 0;
  const allValues = series.map(s => s.consumption);
  const avg = allValues.reduce((a, b) => a + b, 0) / allValues.length;
  const best = Math.max(...allValues);
  const worst = Math.min(...allValues);

  // Chart data
  const maxVal = Math.max(...allValues, meta);
  const minVal = Math.min(...allValues, meta || Infinity);
  const range = maxVal - minVal || 1;
  const chartY = (val) => 92 - (val - minVal) / range * 58;

  const points = series.map((s, i) => {
    const x = 20 + i * 260 / (series.length - 1);
    return `${x},${chartY(s.consumption)}`;
  }).join(' ');

  const color = (val) => meta ? (val >= meta ? 'var(--color-success)' : 'var(--color-warning)') : 'var(--color-accent)';

  return `
    <div class="card consumption-card" style="margin-bottom: 16px;">
      <div class="consumption-card__header">
        <div class="section-header">
          <div>
            <b>${last.consumption.toFixed(1).replace('.', ',')}</b> <span class="text-muted">km/l no último tanque</span>
          </div>
          ${meta ? `<span class="tag ${last.consumption >= meta ? 'tag--ok' : 'tag--soon'}" style="margin: 0">${last.consumption >= meta ? 'Dentro da meta' : 'Abaixo da meta'}</span>` : ''}
        </div>
      </div>

      <div class="consumption-card__chart">
        <svg class="chart-container" viewBox="0 0 300 125" role="img" aria-label="Consumo por tanque em quilômetros por litro">
          ${meta ? `<line x1="8" x2="292" y1="${chartY(meta)}" y2="${chartY(meta)}" stroke="var(--color-success)" stroke-width="1.5" stroke-dasharray="4 4"/>` : ''}
          <polyline fill="none" stroke="var(--color-muted)" stroke-width="1.5" opacity="0.55" points="${points}"/>
          ${series.map((s, i) => {
            const x = 20 + i * 260 / (series.length - 1);
            const y = chartY(s.consumption);
            const isLast = i === series.length - 1;
            return `
              <circle cx="${x}" cy="${y}" r="${isLast ? 5.5 : 3.2}" fill="${color(s.consumption)}"${isLast ? ' stroke="var(--color-card)" stroke-width="2"' : ''}/>
              <text x="${x}" y="${y - (isLast ? 11 : 8)}" text-anchor="middle" font-size="${isLast ? 11 : 9}" font-weight="${isLast ? 700 : 400}" fill="var(--color-text)">${s.consumption.toFixed(1).replace('.', ',')}</text>
              <text x="${x}" y="118" text-anchor="middle" font-size="8" fill="var(--color-muted)">${dt(s.date).slice(0, 5)}</text>
            `;
          }).join('')}
        </svg>
      </div>

      <div class="consumption-card__stats text-muted">
        Média ${avg.toFixed(1).replace('.', ',')} · Melhor ${best.toFixed(1).replace('.', ',')} · Pior ${worst.toFixed(1).replace('.', ',')} km/l
      </div>

      ${renderFuelTypeAverages()}

      <div class="consumption-card__meta">
        <button class="btn btn--ghost" onclick="garagemApp.setMeta()" style="width: auto; padding: 8px 12px; font-size: 0.875rem;">
          ${meta ? 'Meta: ' + meta.toFixed(1).replace('.', ',') + ' km/l · editar' : 'Definir meta de consumo'}
        </button>
      </div>
    </div>
  `;
}

/**
 * Render fuel type averages
 */
function renderFuelTypeAverages() {
  const series = getConsumptionSeries();
  const ethanol = series.filter(s => s.fuel === 'Etanol');
  const gasoline = series.filter(s => s.fuel === 'Gasolina');

  if (!ethanol.length || !gasoline.length) return '';

  const avgE = ethanol.reduce((a, b) => a + b.consumption, 0) / ethanol.length;
  const avgG = gasoline.reduce((a, b) => a + b.consumption, 0) / gasoline.length;
  const ratio = Math.round(avgE / avgG * 100);

  return `
    <div class="consumption-card__fuel-types text-muted" style="margin-top: 4px;">
      Etanol ${avgE.toFixed(1).replace('.', ',')} · Gasolina ${avgG.toFixed(1).replace('.', ',')} km/l.
      O etanol compensa se custar até cerca de ${ratio}% do preço da gasolina.
    </div>
  `;
}

/**
 * Get consumption series for chart
 */
function getConsumptionSeries() {
  const fillups = getState().data.abast
    .filter(f => f.km && f.lit && f.full === 'Sim')
    .sort((a, b) => a.km - b.km);

  const series = [];
  let lastKm = null, accLit = 0;

  for (const f of fillups) {
    const km = Number(f.km), lit = Number(f.lit);
    accLit += lit;
    if (f.full === 'Sim') {
      if (lastKm !== null && km > lastKm) {
        series.push({
          date: f.date,
          consumption: (km - lastKm) / accLit,
          fuel: f.comb
        });
      }
      lastKm = km;
      accLit = 0;
    }
  }
  return series.slice(-10);
}

/**
 * Render list item
 */
function renderListItem(category, item) {
  const config = CATEGORY_CONFIG[category];
  const status = getItemStatus(category, item);

  return `
    <div class="item ${status.urgent ? 'card--bordered-late' : ''}" role="listitem" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}" onclick="garagemApp.openFormModal('${category}', '${item.id}')">
      <div class="item__icon">${getIcon(getRecordIcon(category))}</div>
      <div class="item__content">
        <div class="item__title">${escapeHtml(getRecordTitle(category, item))}</div>
        ${getRecordMeta(category, item).map(m => `<div class="item__meta">${escapeHtml(m)}</div>`).join('')}
        ${status.text ? `<span class="tag ${status.urgent ? 'tag--late' : 'tag--soon'}">${status.text}</span>` : ''}
      </div>
      ${item.cost ? `<b class="item__amount">${formatCurrency(item.cost)}</b>` : ''}
    </div>
  `;
}

/**
 * Get item status (for reminders/documents)
 */
function getItemStatus(category, item) {
  if (category === 'lemb') {
    return getReminderStatus(item);
  }
  if (category === 'doc') {
    const days = daysUntil(item.date);
    if (days !== null && days < 0) return { urgent: true, text: `Venceu há ${Math.abs(days)} dias` };
    if (days !== null && days <= 30) return { urgent: false, soon: true, text: `Em ${days} dias` };
  }
  return { urgent: false, soon: false, text: '' };
}

/**
 * Get reminder status
 */
function getReminderStatus(item) {
  const currentKm = getCurrentKmFromState();
  let urgent = false, soon = false, text = '';

  if (item.km) {
    const diff = Number(item.km) - currentKm;
    if (diff <= 0) { urgent = true; text = `Vencido no km (${nf(Math.abs(diff))} km atrasado)`; }
    else if (diff <= 500) { soon = true; text = `Faltam ${nf(diff)} km`; }
  }

  if (item.date) {
    const days = daysUntil(item.date);
    if (days < 0) { urgent = true; text += (text ? ' · ' : '') + `Venceu há ${Math.abs(days)} dias`; }
    else if (days <= 30 && !urgent) { soon = true; text += (text ? ' · ' : '') + `Em ${days} dias`; }
  }

  return { urgent, soon, text };
}

/**
 * Get current KM from state
 */
function getCurrentKmFromState() {
  const state = getState();
  return Math.max(
    state.km || 0,
    ...state.data.manut.map(x => Number(x.km) || 0),
    ...state.data.abast.map(x => Number(x.km) || 0)
  );
}

/**
 * Days until date
 */
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T12:00:00');
  const target = new Date(dateStr + 'T12:00:00');
  return Math.ceil((target - today) / 864e5);
}