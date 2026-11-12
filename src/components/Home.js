/* ==========================================================================
   Home Page Component
   ========================================================================== */

import { getIcon } from '../utils/icons.js';
import { escapeHtml, formatCurrency, formatNumber, dt, nf, mo } from '../utils/helpers.js';
import { getCurrentKm, getAverageConsumption, getMonthlyExpensesTotal, getUpcomingServices, getTotalExpenses, getAllReminders, getAllDocuments, getAllMaintenance, getAllFuel, getState } from '../store.js';
import { getMonthAbbr } from '../utils/date.js';

/**
 * Render home page
 */
export function renderHome(state, { navigate }) {
  const currentKm = getCurrentKm();
  const avgConsumption = getAverageConsumption();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyExpenses = getMonthlyExpensesTotal(currentMonth);
  const totalExpenses = getTotalExpenses();
  const upcoming = getUpcomingServices();
  const alerts = getAlerts();
  const recent = getRecentActivity();

  return `
    <!-- Hero Section -->
    <section class="hero" aria-label="Resumo do veículo">
      <div class="hero__row">
        <span class="hero__status ${alerts.length ? 'hero__status--alert' : ''}">
          <i></i>${alerts.length ? `${alerts.length} ${alerts.length === 1 ? 'alerta' : 'alertas'}` : 'Em dia'}
        </span>
        ${state.ficha?.placa
          ? `<span class="hero__plate">${escapeHtml(state.ficha.placa)}</span>`
          : '<span class="hero__model">2010 · ELX Flex</span>'}
      </div>

      <!-- Odometer -->
      <button class="odometer" onclick="garagemApp.setKm()" aria-label="Ajustar quilometragem atual: ${currentKm} km">
        <b class="odometer__value">${currentKm > 0 ? renderOdometer(currentKm) : '<em>—</em>'}</b>
        <span class="odometer__label">toque para ajustar a quilometragem</span>
      </button>

      <!-- Stats Grid -->
      <div class="stats-grid" role="list" aria-label="Estatísticas rápidas">
        <div class="stats-grid__item" role="listitem">
          <b class="stats-grid__value ${alerts.length ? 'stats-grid__value--alert' : ''}">${avgConsumption ? avgConsumption.toFixed(1).replace('.', ',') + ' km/l' : '—'}</b>
          <span class="stats-grid__label">consumo médio</span>
        </div>
        <div class="stats-grid__item" role="listitem">
          <b class="stats-grid__value">${formatCurrency(monthlyExpenses)}</b>
          <span class="stats-grid__label">gasto no mês</span>
        </div>
        <div class="stats-grid__item" role="listitem">
          <b class="stats-grid__value ${alerts.length ? 'stats-grid__value--alert' : ''}">${alerts.length}</b>
          <span class="stats-grid__label">${alerts.length === 1 ? 'alerta' : 'alertas'}</span>
        </div>
      </div>
    </section>

    <!-- Quick Actions -->
    <section aria-label="Ações rápidas">
      <h2>Ações rápidas</h2>
      <div class="quick-actions" role="list">
        <button class="quick-action" onclick="garagemApp.navigate('chat')" role="listitem" aria-label="Abrir assistente">
          <span class="quick-action__icon">${getIcon('chat')}</span>
          <span>Assistente</span>
        </button>
        <button class="quick-action" onclick="garagemApp.openFormModal('manut')" role="listitem" aria-label="Nova manutenção">
          <span class="quick-action__icon">${getIcon('manut')}</span>
          <span>Manutenção</span>
        </button>
        <button class="quick-action" onclick="garagemApp.openFormModal('abast')" role="listitem" aria-label="Novo abastecimento">
          <span class="quick-action__icon">${getIcon('abast')}</span>
          <span>Abastecer</span>
        </button>
        <button class="quick-action" onclick="garagemApp.openFormModal('lemb')" role="listitem" aria-label="Novo lembrete">
          <span class="quick-action__icon">${getIcon('lemb')}</span>
          <span>Lembrete</span>
        </button>
        <button class="quick-action" onclick="garagemApp.openFormModal('doc')" role="listitem" aria-label="Novo documento">
          <span class="quick-action__icon">${getIcon('doc')}</span>
          <span>Documento</span>
        </button>
        <button class="quick-action" onclick="garagemApp.openFormModal('nota')" role="listitem" aria-label="Nova anotação">
          <span class="quick-action__icon">${getIcon('nota')}</span>
          <span>Anotação</span>
        </button>
      </div>
    </section>

    <!-- Alerts -->
    ${alerts.length ? `
    <section aria-label="Alertas">
      <h2>Atenção</h2>
      ${alerts.map(alert => renderAlertCard(alert)).join('')}
    </section>
    ` : `
    <section aria-label="Alertas">
      <h2>Atenção</h2>
      <div class="status-panel">
        <span class="status-panel__icon">${getIcon('ok')}</span>
        <div>
          <b class="status-panel__title">Tudo em dia</b>
          <span class="status-panel__text">Nenhum lembrete ou vencimento nos próximos 30 dias.</span>
        </div>
      </div>
    </section>
    `}

    <!-- Upcoming Services -->
    ${upcoming.length ? `
    <section aria-label="Próximas revisões">
      <h2>Próximas revisões</h2>
      ${upcoming.slice(0, 4).map((s, i) => renderUpcomingCard(s, i)).join('')}
      <p class="text-muted" style="margin: 0 2px 6px;">Estimativas por intervalos genéricos. Ajuste em Mais › Intervalos.</p>
    </section>
    ` : ''}

    <!-- Expenses Chart -->
    <section aria-label="Gastos nos últimos 6 meses">
      <h2>Gastos nos últimos 6 meses</h2>
      <div class="card">
        <div class="section-header">
          <b class="section-header__title">${formatCurrency(monthlyExpenses)}</b>
          <span class="text-muted">neste mês · total geral ${formatCurrency(totalExpenses)}</span>
        </div>
        ${renderExpensesChart()}
      </div>
    </section>

    <!-- Recent Activity -->
    <section aria-label="Últimos registros">
      <h2>Últimos registros</h2>
      ${recent.length ? recent.map(r => renderActivityCard(r)).join('') : '<div class="empty">Comece registrando uma manutenção ou abastecimento.</div>'}
    </section>
  `;
}

/**
 * Get alerts (overdue/soon reminders and documents)
 */
function getAlerts() {
  const reminders = getAllReminders();
  const documents = getAllDocuments();
  const alerts = [];

  for (const r of reminders) {
    const status = getReminderStatus(r);
    if (status.urgent || status.soon) {
      alerts.push({ type: 'lemb', record: r, status });
    }
  }

  for (const d of documents) {
    const days = daysUntil(d.date);
    if (days !== null && days <= 30) {
      alerts.push({ type: 'doc', record: d, status: { urgent: days < 0, soon: days >= 0 && days <= 30, text: days < 0 ? `Venceu há ${Math.abs(days)} dias` : `Em ${days} dias` } });
    }
  }

  return alerts.slice(0, 5);
}

/**
 * Get reminder status
 */
function getReminderStatus(r) {
  const currentKm = getCurrentKm();
  let urgent = false, soon = false, text = '';

  if (r.km) {
    const diff = Number(r.km) - currentKm;
    if (diff <= 0) { urgent = true; text = `Vencido no km (${nf(Math.abs(diff))} km atrasado)`; }
    else if (diff <= 500) { soon = true; text = `Faltam ${nf(diff)} km`; }
  }

  if (r.date) {
    const days = daysUntil(r.date);
    if (days < 0) { urgent = true; text += (text ? ' · ' : '') + `Venceu há ${Math.abs(days)} dias`; }
    else if (days <= 30 && !urgent) { soon = true; text += (text ? ' · ' : '') + `Em ${days} dias`; }
  }

  return { urgent, soon, text };
}

/**
 * Get recent activity (last 5 records)
 */
function getRecentActivity() {
  const all = [
    ...getAllMaintenance().slice(0, 3).map(r => ({ ...r, category: 'manut' })),
    ...getAllFuel().slice(0, 3).map(r => ({ ...r, category: 'abast' }))
  ];
  return all.sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);
}

/**
 * Render odometer display
 */
function renderOdometer(km) {
  return [...nf(km)].map(c => c === '.' ? '<u></u>' : `<i>${c}</i>`).join('') + '<em>km</em>';
}

/**
 * Render alert card
 */
function renderAlertCard(alert) {
  const { type, record, status } = alert;
  const icons = { lemb: 'lemb', doc: 'doc' };
  const labels = { lemb: 'Lembrete', doc: 'Documento' };

  return `
    <div class="item card--bordered ${status.urgent ? 'card--bordered-late' : ''}" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}" onclick="garagemApp.openFormModal('${type}', '${record.id}')">
      <div class="item__icon">${getIcon(icons[type])}</div>
      <div class="item__content">
        <div class="item__title">${escapeHtml(type === 'lemb' ? record.desc : record.tipo)}</div>
        <div class="item__meta">${renderRecordMeta(type, record)}</div>
        <span class="tag ${status.urgent ? 'tag--late' : 'tag--soon'}">${status.text}</span>
      </div>
    </div>
  `;
}

/**
 * Render upcoming service card
 */
function renderUpcomingCard(service, index) {
  const currentKm = getCurrentKm();
  const progress = (service.lastKm && service.nextKm && Number(service.nextKm) > Number(service.lastKm))
    ? Math.min(100, Math.max(0, Math.round(((currentKm - Number(service.lastKm)) / (Number(service.nextKm) - Number(service.lastKm))) * 100)))
    : null;
  return `
    <div class="item" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}" onclick="garagemApp.openFormModal('lemb', '', { desc: 'Revisar: ${service.service}', km: ${service.nextKm || ''}, date: '${service.nextDate || ''} })">
      <div class="item__icon">${getIcon('manut')}</div>
      <div class="item__content">
        <div class="item__title">${escapeHtml(service.service)}</div>
        <div class="item__meta text-muted">Última: ${dt(service.lastDate)}${service.lastKm ? ' · ' + nf(service.lastKm) + ' km' : ''}</div>
        <div class="item__meta text-muted">Prevista: ${[service.nextKm ? nf(service.nextKm) + ' km' : '', service.nextDate ? dt(service.nextDate) : ''].filter(Boolean).join(' ou ')}</div>
        ${progress !== null ? `<div class="service-progress" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso até a próxima revisão"><div class="service-progress__fill" style="width:${progress}%"></div></div>` : ''}
        <span class="tag ${service.status === 'late' ? 'tag--late' : service.status === 'soon' ? 'tag--soon' : 'tag--ok'}">${service.statusText}</span>
      </div>
      <span class="text-muted">+ lembrete</span>
    </div>
  `;
}

/**
 * Render activity card
 */
function renderActivityCard(record) {
  const { category, ...r } = record;
  const icons = { manut: 'manut', abast: 'abast', lemb: 'lemb', doc: 'doc', nota: 'nota' };
  const labels = { manut: 'Manutenção', abast: 'Abastecimento', lemb: 'Lembrete', doc: 'Documento', nota: 'Anotação' };

  return `
    <div class="item" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}" onclick="garagemApp.openFormModal('${category}', '${r.id}')">
      <div class="item__icon">${getIcon(icons[category])}</div>
      <div class="item__content">
        <div class="item__title">${renderRecordTitle(category, r)}</div>
        ${r.peca || r.desc ? `<div class="item__subtitle">${escapeHtml(r.peca || r.desc)}</div>` : ''}
        <div class="item__meta">${renderRecordMeta(category, r)}</div>
      </div>
      ${r.cost ? `<b class="item__amount">${formatCurrency(r.cost)}</b>` : ''}
    </div>
  `;
}

/**
 * Render record title
 */
function renderRecordTitle(category, record) {
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
 * Render record meta
 */
function renderRecordMeta(category, record) {
  const parts = [];
  if (record.date) parts.push(dt(record.date));
  if (record.km) parts.push(nf(record.km) + ' km');
  if (record.ofi) parts.push(record.ofi);
  if (record.posto) parts.push(record.posto);
  if (record.lit && record.cost) parts.push(mo(record.cost / record.lit) + '/L');
  return parts.join(' · ');
}

/**
 * Render expenses chart
 */
function renderExpensesChart() {
  const months = getLast6Months();
  const data = months.map(m => ({
    month: m,
    total: ['manut', 'abast', 'doc'].reduce((sum, cat) => {
      const items = getState().data[cat] || [];
      return sum + items.filter(x => (x.date || '').slice(0, 7) === m).reduce((s, x) => s + (Number(x.cost) || 0), 0);
    }, 0)
  }));

  const max = Math.max(...data.map(d => d.total), 1);
  const avg = data.reduce((s, d) => s + d.total, 0) / data.length;
  const hasData = data.some(d => d.total > 0);

  return `
    <div class="expense-chart" role="img" aria-label="Gastos mensais em reais nos últimos 6 meses">
      ${data.map((d, i) => {
        const isCurrent = i === data.length - 1;
        const pct = hasData ? Math.round((d.total / max) * 100) : 0;
        return `
          <div class="expense-chart__col ${isCurrent ? 'expense-chart__col--current' : ''}" title="${getMonthAbbr(d.month)}: ${formatCurrency(d.total)}">
            <span class="expense-chart__value">${d.total > 0 ? Math.round(d.total) : ''}</span>
            <span class="expense-chart__track">
              <span class="expense-chart__bar" style="height:${Math.max(pct, 3)}%"></span>
            </span>
            <span class="expense-chart__month">${getMonthAbbr(d.month)}</span>
          </div>
        `;
      }).join('')}
    </div>
    <div class="expense-chart__caption">
      ${hasData
        ? `Gasto por mês (R$), com o mês atual em destaque · média de ${formatCurrency(avg)}`
        : 'Sem gastos registrados nos últimos 6 meses.'}
    </div>
  `;
}

/**
 * Get last 6 months keys
 */
function getLast6Months() {
  const months = [];
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
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