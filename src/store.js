/* ==========================================================================
   State Management (Store)
   ========================================================================== */

import { loadState, saveState, clearState, DEFAULT_STATE } from './utils/storage.js';
import { markDirty } from './utils/github-sync.js';
import { generateId, getToday, parseNumberInput, parseDecimalInput, formatNumber } from './utils/helpers.js';
import { calculateAverageConsumption, getConsumptionSeries, getMonthlyExpenses } from './utils/format.js';

const listeners = new Set();
let state = null;

/**
 * Get current state
 */
export function getState() {
  if (!state) {
    state = loadState();
  }
  return state;
}

/**
 * Subscribe to state changes
 */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Notify all listeners
 */
function notify() {
  listeners.forEach(l => l(getState()));
}

/**
 * Set state and persist
 */
function setState(newState) {
  state = newState;
  saveState(state);
  markDirty();
  notify();
}

/**
 * Update state partially
 */
export function updateState(updates) {
  const newState = { ...getState(), ...updates };
  setState(newState);
}

/* ==========================================================================
   Car Info (Ficha)
   ========================================================================== */
export function updateFicha(field, value) {
  const s = getState();
  s.ficha = { ...s.ficha, [field]: value };
  setState(s);
}

/* ==========================================================================
   Car Name
   ========================================================================== */
export function setCarName(name) {
  const s = getState();
  s.nome = name;
  setState(s);
}

/* ==========================================================================
   Current KM
   ========================================================================== */
export function setCurrentKm(km) {
  const s = getState();
  s.km = parseNumberInput(km);
  setState(s);
}

export function getCurrentKm() {
  const s = getState();
  // Calculate from records if higher
  const recordKm = Math.max(
    ...s.data.manut.map(x => Number(x.km) || 0),
    ...s.data.abast.map(x => Number(x.km) || 0),
    s.km || 0
  );
  return recordKm;
}

/* ==========================================================================
   Maintenance Records
   ========================================================================== */
export function addMaintenance(record) {
  const s = getState();
  s.data.manut.push({ id: generateId(), date: getToday(), ...record });
  setState(s);
}

export function updateMaintenance(id, updates) {
  const s = getState();
  const idx = s.data.manut.findIndex(x => x.id === id);
  if (idx >= 0) {
    s.data.manut[idx] = { ...s.data.manut[idx], ...updates };
    setState(s);
  }
}

export function deleteMaintenance(id) {
  const s = getState();
  s.data.manut = s.data.manut.filter(x => x.id !== id);
  setState(s);
}

export function getMaintenance(id) {
  return getState().data.manut.find(x => x.id === id);
}

export function getAllMaintenance() {
  return [...getState().data.manut].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

/* ==========================================================================
   Fuel Records (Abastecimentos)
   ========================================================================== */
export function addFuel(record) {
  const s = getState();
  s.data.abast.push({ id: generateId(), date: getToday(), full: 'Sim', ...record });
  setState(s);
}

export function updateFuel(id, updates) {
  const s = getState();
  const idx = s.data.abast.findIndex(x => x.id === id);
  if (idx >= 0) {
    s.data.abast[idx] = { ...s.data.abast[idx], ...updates };
    setState(s);
  }
}

export function deleteFuel(id) {
  const s = getState();
  s.data.abast = s.data.abast.filter(x => x.id !== id);
  setState(s);
}

export function getFuel(id) {
  return getState().data.abast.find(x => x.id === id);
}

export function getAllFuel() {
  return [...getState().data.abast].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

/* ==========================================================================
   Reminders (Lembretes)
   ========================================================================== */
export function addReminder(record) {
  const s = getState();
  s.data.lemb.push({ id: generateId(), ...record });
  setState(s);
}

export function updateReminder(id, updates) {
  const s = getState();
  const idx = s.data.lemb.findIndex(x => x.id === id);
  if (idx >= 0) {
    s.data.lemb[idx] = { ...s.data.lemb[idx], ...updates };
    setState(s);
  }
}

export function deleteReminder(id) {
  const s = getState();
  s.data.lemb = s.data.lemb.filter(x => x.id !== id);
  setState(s);
}

export function getReminder(id) {
  return getState().data.lemb.find(x => x.id === id);
}

export function getAllReminders() {
  return [...getState().data.lemb].sort((a, b) => {
    // Sort by urgency: overdue first, then by date/km
    const aStatus = getReminderStatus(a);
    const bStatus = getReminderStatus(b);
    if (aStatus.urgent !== bStatus.urgent) return aStatus.urgent ? -1 : 1;
    if (aStatus.soon !== bStatus.soon) return aStatus.soon ? -1 : 1;
    return (b.date || '').localeCompare(a.date || '');
  });
}

/* ==========================================================================
   Documents
   ========================================================================== */
export function addDocument(record) {
  const s = getState();
  s.data.doc.push({ id: generateId(), ...record });
  setState(s);
}

export function updateDocument(id, updates) {
  const s = getState();
  const idx = s.data.doc.findIndex(x => x.id === id);
  if (idx >= 0) {
    s.data.doc[idx] = { ...s.data.doc[idx], ...updates };
    setState(s);
  }
}

export function deleteDocument(id) {
  const s = getState();
  s.data.doc = s.data.doc.filter(x => x.id !== id);
  setState(s);
}

export function getDocument(id) {
  return getState().data.doc.find(x => x.id === id);
}

export function getAllDocuments() {
  return [...getState().data.doc].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}

/* ==========================================================================
   Notes (Anotações)
   ========================================================================== */
export function addNote(record) {
  const s = getState();
  s.data.nota.push({ id: generateId(), date: getToday(), ...record });
  setState(s);
}

export function updateNote(id, updates) {
  const s = getState();
  const idx = s.data.nota.findIndex(x => x.id === id);
  if (idx >= 0) {
    s.data.nota[idx] = { ...s.data.nota[idx], ...updates };
    setState(s);
  }
}

export function deleteNote(id) {
  const s = getState();
  s.data.nota = s.data.nota.filter(x => x.id !== id);
  setState(s);
}

export function getNote(id) {
  return getState().data.nota.find(x => x.id === id);
}

export function getAllNotes() {
  return [...getState().data.nota].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

/* ==========================================================================
   Intervals (Revisão)
   ========================================================================== */
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

export function getInterval(service) {
  const s = getState();
  return s.intervals[service] || DEFAULT_INTERVALS[service] || [0, 0];
}

export function setInterval(service, km, months) {
  const s = getState();
  s.intervals = { ...s.intervals, [service]: [Number(km) || 0, Number(months) || 0] };
  setState(s);
}

export function getAllIntervals() {
  const s = getState();
  const result = {};
  for (const [service, defaultVal] of Object.entries(DEFAULT_INTERVALS)) {
    result[service] = s.intervals[service] || defaultVal;
  }
  return result;
}

/* ==========================================================================
   Meta (Consumo)
   ========================================================================== */
export function setMeta(value) {
  const s = getState();
  s.meta = parseDecimalInput(value) || 0;
  setState(s);
}

export function getMeta() {
  return getState().meta || 0;
}

/* ==========================================================================
   Chat/Assistant
   ========================================================================== */
export function addChatMessage(role, text, actions = []) {
  const s = getState();
  s.chat.push({ role, text, actions, timestamp: Date.now() });
  // Keep last 60 messages
  if (s.chat.length > 60) s.chat = s.chat.slice(-60);
  setState(s);
}

export function updateChatAction(msgIndex, actionIndex, updates) {
  const s = getState();
  if (s.chat[msgIndex]?.actions?.[actionIndex]) {
    s.chat[msgIndex].actions[actionIndex] = { ...s.chat[msgIndex].actions[actionIndex], ...updates };
    setState(s);
  }
}

export function clearChat() {
  const s = getState();
  s.chat = [];
  setState(s);
}

export function getChatHistory() {
  return getState().chat;
}

/* ==========================================================================
   Consumption Calculation
   ========================================================================== */
export function getAverageConsumption() {
  return calculateAverageConsumption(getState().data.abast);
}

export function getConsumptionHistory() {
  return getConsumptionSeries(getState().data.abast);
}

export function getMonthlyExpensesData(months = 6) {
  return getMonthlyExpenses(getState().data, months);
}

/* ==========================================================================
   Upcoming Services
   ========================================================================== */
import { addMonths } from './utils/date.js';

export function getUpcomingServices() {
  const s = getState();
  const currentKm = getCurrentKm();
  const upcoming = [];

  for (const [service, [intKm, intMonths]] of Object.entries(getAllIntervals())) {
    if (!intKm && !intMonths) continue;

    // Find last record of this service
    const last = s.data.manut
      .filter(x => x.tipo === service)
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (Number(b.km) || 0) - (Number(a.km) || 0))[0];

    if (!last) continue;

    let nextKm = null;
    let nextDate = null;

    if (intKm && last.km) {
      nextKm = Number(last.km) + intKm;
    }

    if (intMonths && last.date) {
      nextDate = addMonths(last.date, intMonths);
    }

    if (!nextKm && !nextDate) continue;

    // Determine status
    let status = 'ok';
    let statusText = '';

    if (nextKm && currentKm >= nextKm) {
      status = 'late';
      statusText = `Vencido no km (${formatNumber(currentKm - nextKm)} km atrasado)`;
    } else if (nextKm && nextKm - currentKm <= 500) {
      status = 'soon';
      statusText = `Faltam ${formatNumber(nextKm - currentKm)} km`;
    }

    if (nextDate) {
      const days = daysUntil(nextDate);
      if (days < 0) {
        status = 'late';
        statusText = `Venceu há ${Math.abs(days)} dias`;
      } else if (days <= 30 && status !== 'late') {
        status = 'soon';
        statusText = `Em ${days} dias`;
      }
    }

    upcoming.push({
      service,
      lastDate: last.date,
      lastKm: last.km,
      nextKm,
      nextDate,
      status,
      statusText
    });
  }

  // Sort by urgency
  return upcoming.sort((a, b) => {
    const order = { late: 0, soon: 1, ok: 2 };
    return order[a.status] - order[b.status];
  });
}

/* ==========================================================================
   Total Expenses
   ========================================================================== */
export function getTotalExpenses() {
  const s = getState();
  return ['manut', 'abast', 'doc'].reduce((sum, cat) => {
    return sum + s.data[cat].reduce((s, x) => s + (Number(x.cost) || 0), 0);
  }, 0);
}

export function getMonthlyExpensesTotal(monthKey) {
  const s = getState();
  return ['manut', 'abast', 'doc'].reduce((sum, cat) => {
    return sum + s.data[cat]
      .filter(x => (x.date || '').slice(0, 7) === monthKey)
      .reduce((s, x) => s + (Number(x.cost) || 0), 0);
  }, 0);
}

/* ==========================================================================
   Search
   ========================================================================== */
export function searchRecords(query) {
  const s = getState();
  const q = query.toLowerCase();
  const results = [];

  for (const [cat, items] of Object.entries(s.data)) {
    for (const item of items) {
      if (JSON.stringify(item).toLowerCase().includes(q)) {
        results.push({ category: cat, ...item });
      }
    }
  }

  return results.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

/* ==========================================================================
   Reset/Clear
   ========================================================================== */
export function resetAllData() {
  setState(deepClone(DEFAULT_STATE));
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}