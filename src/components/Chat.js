/* ==========================================================================
   Chat/Assistant Component
   ========================================================================== */

import { getIcon } from '../utils/icons.js';
import { escapeHtml, formatCurrency, formatNumber, dt, nf, mo, getToday, parseNumberInput, parseDecimalInput } from '../utils/helpers.js';
import { getState, addChatMessage, updateChatAction, clearChat, getAllMaintenance, getAllFuel, getAllReminders, getAllDocuments, getCurrentKm, getUpcomingServices as getStoreUpcomingServices } from '../store.js';
import { formatMaintenanceType, formatFuelType, formatDocType, calculateAverageConsumption } from '../utils/format.js';
import { parseRelativeDate } from '../utils/date.js';

const EXAMPLES = [
  { text: 'Troquei a correia dentada dia 10/11 com 85.000 km', icon: 'manut' },
  { text: 'Abasteci 30 litros de etanol, R$ 150, km 86.200', icon: 'abast' },
  { text: 'Me lembra de trocar o óleo com 90.000 km', icon: 'lemb' },
  { text: 'Quando troquei o óleo pela última vez?', icon: 'chat' }
];

const MAINTENANCE_TYPES = [
  'Óleo e filtro', 'Correia dentada', 'Freios', 'Suspensão', 'Pneus',
  'Velas', 'Arrefecimento', 'Elétrica', 'Embreagem', 'Filtros',
  'Motor', 'Revisão', 'Funilaria', 'Outro'
];

const FUEL_TYPES = ['Etanol', 'Gasolina', 'Misto'];
const DOC_TYPES = ['IPVA', 'Seguro', 'Licenciamento', 'Multa', 'Outro'];

let aiModel = null;
let isProcessing = false;
let dictation = null;

/**
 * Initialize AI model (Claude/WebLLM)
 */
async function initAI() {
  // Try to use window.claude if available (from the original app)
  if (window.claude?.use) {
    try {
      aiModel = await window.claude.use('sample');
      return true;
    } catch (e) {
      console.log('Claude not available:', e);
    }
  }
  return false;
}

/**
 * Initialize dictation
 */
async function initDictation() {
  if (!dictation && 'webkitSpeechRecognition' in window) {
    const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
    dictation = new SR();
    dictation.lang = 'pt-BR';
    dictation.continuous = true;
    dictation.interimResults = true;
  }
  return dictation;
}

/**
 * Render chat page
 */
export function renderChat(state, ctx = {}) {
  const chat = state.chat || [];
  const hasAI = !!aiModel;

  return `
    <div class="chat-header">
      <div class="section-header">
        <h2 style="font-size: 1.375rem;">${getIcon('chat')} Assistente</h2>
        ${chat.length ? `<button class="btn btn--ghost" onclick="garagemApp.clearChat()" style="padding: 6px 12px; font-size: 0.8125rem;">${getIcon('trash')} Limpar conversa</button>` : ''}
      </div>
      <div class="mode-indicator ${hasAI ? '' : 'mode-indicator--off'}">
        ${hasAI ? 'IA ativa' : 'Modo básico: registra serviços e consulta o histórico'}
      </div>
    </div>

    <div class="chat-messages" id="chat-messages" role="log" aria-live="polite">
      ${chat.length === 0 ? renderWelcome() : chat.map((msg, i) => renderMessage(msg, i)).join('')}
      ${isProcessing ? renderTypingIndicator() : ''}
    </div>

    <div style="height: 100px"></div>
  `;
}

/**
 * Render welcome message with examples
 */
function renderWelcome() {
  return `
    <div class="bubble bubble--bot">
      Oi! Conte o que aconteceu com o carro e eu registro e organizo para você: serviço, peça, km, data e valor. Também respondo perguntas sobre o histórico.
    </div>
    <div class="text-muted" style="margin: 14px 2px 8px;">Toque num exemplo para começar:</div>
    ${EXAMPLES.map((ex, i) => `
      <button class="example-btn" onclick="garagemApp.setChatInput('${escapeHtml(ex.text).replace(/'/g, "\\'")}')" aria-label="${ex.text}">
        <span class="example-btn__icon">${getIcon(ex.icon)}</span>
        <span>${escapeHtml(ex.text)}</span>
      </button>
    `).join('')}
  `;
}

/**
 * Render a chat message
 */
function renderMessage(msg, index) {
  const isUser = msg.role === 'user';
  let html = `<div class="bubble ${isUser ? 'bubble--user' : 'bubble--bot'}">${escapeHtml(msg.text)}</div>`;

  if (msg.actions && msg.actions.length > 0) {
    for (const [actionIndex, action] of msg.actions.entries()) {
      if (action.no) continue;

      if (action.done) {
        html += renderActionCard(action, true);
      } else {
        html += renderActionCard(action, false, index, actionIndex);
      }
    }
  }

  return html;
}

/**
 * Render action confirmation card
 */
function renderActionCard(action, done, msgIndex = null, actionIndex = null) {
  const categoryLabels = {
    manut: 'Manutenção',
    abast: 'Abastecimento',
    lemb: 'Lembrete',
    doc: 'Documento',
    nota: 'Anotação'
  };

  const categoryIcons = {
    manut: 'manut',
    abast: 'abast',
    lemb: 'lemb',
    doc: 'doc',
    nota: 'nota'
  };

  if (done) {
    return `
      <div class="action-card action-card--done">
        <div class="action-card__header">
          ${getIcon('ok')} ${categoryLabels[action.k] || action.k} registrado
        </div>
        <div class="action-card__details">
          ${renderActionDetails(action)}
        </div>
      </div>
    `;
  }

  return `
    <div class="action-card">
      <div class="action-card__header">
        ${getIcon(categoryIcons[action.k])} ${categoryLabels[action.k] || action.k}
      </div>
      <dl class="action-card__details">
        ${renderActionDetails(action)}
      </dl>
      <div class="action-card__actions">
        <button class="btn btn--primary btn--confirm" onclick="garagemApp.acceptChatAction(${msgIndex}, ${actionIndex})">${getIcon('check')} Salvar</button>
        <button class="btn btn--secondary" onclick="garagemApp.editChatAction(${msgIndex}, ${actionIndex})">${getIcon('edit')} Editar</button>
        <button class="btn btn--danger" onclick="garagemApp.discardChatAction(${msgIndex}, ${actionIndex})">${getIcon('x')} Descartar</button>
      </div>
    </div>
  `;
}

/**
 * Render action details
 */
function renderActionDetails(action) {
  const { k, ...fields } = action;
  const details = [];

  for (const [key, value] of Object.entries(fields)) {
    if (value == null || value === '') continue;

    let label = key;
    let display = value;

    switch (key) {
      case 'date': label = 'Data'; display = dt(value); break;
      case 'km': label = 'Km'; display = nf(value); break;
      case 'cost': label = 'Custo'; display = mo(value); break;
      case 'tipo': label = 'Tipo'; display = formatMaintenanceType(value); break;
      case 'comb': label = 'Combustível'; display = formatFuelType(value); break;
      case 'full': label = 'Tanque cheio'; display = value; break;
      case 'peca': label = 'Peça'; break;
      case 'desc': label = 'Detalhes'; break;
      case 'ofi': label = 'Oficina'; break;
      case 'posto': label = 'Posto'; break;
      case 'lit': label = 'Litros'; display = value + ' L'; break;
      case 'obs': label = 'Obs'; break;
      case 'titulo': label = 'Título'; break;
      case 'texto': label = 'Texto'; break;
    }

    details.push(`<dt>${label}</dt><dd>${escapeHtml(display)}</dd>`);
  }

  return details.join('');
}

/**
 * Render typing indicator
 */
function renderTypingIndicator() {
  return `
    <div class="bubble bubble--bot loading-dots" aria-label="Pensando">
      <i></i><i></i><i></i>
    </div>
  `;
}

/**
 * Setup chat event listeners
 */
export function setupChat(onSend, onDictation) {
  // Initialize AI
  initAI().then(hasAI => {
    if (hasAI) renderChat(getState());
  });

  // Initialize dictation
  initDictation();
}

/**
 * Send chat message
 */
export async function sendChatMessage(text) {
  if (isProcessing || !text.trim()) return;

  const chat = getState().chat || [];
  isProcessing = true;

  // Add user message
  addChatMessage('user', text);
  renderChat(getState());

  try {
    let response = null;

    if (aiModel) {
      response = await processWithAI(text);
    }

    if (!response) {
      response = processLocally(text);
    }

    // Add bot response with actions
    const actions = (response.actions || []).map(normalizeAction).filter(Boolean);
    addChatMessage('assistant', response.text || (actions.length ? 'Entendi. Confira e salve:' : 'Não entendi bem. Tente algo como: "Troquei a correia dentada dia 10/11 com 85.000 km".'), actions);

  } catch (error) {
    console.error('Chat error:', error);
    addChatMessage('assistant', 'Desculpe, ocorreu um erro. Tente novamente.');
  } finally {
    isProcessing = false;
    renderChat(getState());
  }
}

/**
 * Process with AI
 */
async function processWithAI(text) {
  const state = getState();
  const currentKm = getCurrentKm();

  const context = {
    km: currentKm,
    manut: getAllMaintenance().slice(-40).map(({ id, ...r }) => r),
    abast: getAllFuel().slice(-12).map(({ id, ...r }) => r),
    lemb: getAllReminders().map(({ id, ...r }) => r),
    doc: getAllDocuments().map(({ id, ...r }) => r),
    ficha: state.ficha,
    proximas: getStoreUpcomingServices().map(p => ({ servico: p.service, km: p.nextKm, data: p.nextDate, situacao: p.statusText }))
  };

  const prompt = `Você é o assistente pessoal de um app de garagem do Fiat Palio 2010 ELX Flex. Hoje é ${getToday()}. Km atual: ${currentKm || 'desconhecido'}.
Interprete a mensagem do dono e responda SOMENTE com JSON válido, sem markdown: {"resposta":"frase curta em português","acoes":[...]}.
Cada ação tem "k": "manut" (serviço, troca, reparo, peça instalada: tipo, peca, desc, date, km, cost, ofi), "abast" (abastecimento: date, km, comb, lit, cost, full, posto), "lemb" (lembrete futuro: desc, km, date), "doc" (IPVA, seguro, licenciamento: tipo, date de vencimento, cost) ou "nota" (informação sobre o carro: titulo, texto).
Em manut, "tipo" deve ser um de: ${MAINTENANCE_TYPES.join(', ')}; "peca" é a peça trocada; "desc" é um resumo curto. Em abast, comb é Etanol, Gasolina ou Misto e full é Sim ou Não. date sempre AAAA-MM-DD; resolva datas relativas a partir de hoje. km e cost são números. Omita campos não informados, nunca invente.
Se a mensagem for uma pergunta, responda em "resposta" com base nos dados abaixo e use "acoes":[].
Mensagem: ${text}
Dados: ${JSON.stringify(context)}`;

  try {
    const result = await aiModel.json(prompt, { cache: false });
    return Array.isArray(result) ? { acoes: result } : (result && typeof result === 'object' ? result : null);
  } catch (e) {
    if (e?.code === 'not_granted') aiModel = null;
    return null;
  }
}

/**
 * Process locally (fallback)
 */
function processLocally(text) {
  const s = text.toLowerCase();
  const actions = [];

  // Parse km
  const kmMatch = text.match(/(\d{1,3}(?:[.\s]\d{3})+|\d+)\s*km/) || text.match(/km\s*(\d{1,3}(?:[.\s]\d{3})+|\d{3,6})/);
  const km = kmMatch ? parseNumberInput(kmMatch[1]) : null;

  // Parse cost
  const costMatch = text.match(/r\$\s*([\d.]+(?:,\d{1,2})?)/i) || text.match(/([\d.]+(?:,\d{1,2})?)\s*(?:reais|pila)/i);
  const cost = costMatch ? parseDecimalInput(costMatch[1]) : null;

  // Parse date
  let date = parseRelativeDate(text) || getToday();

  // Check for fuel
  if (/abasteci|litros|posto/.test(s)) {
    const litMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:l\b|litros?)/i);
    actions.push({
      k: 'abast',
      date,
      km,
      lit: litMatch ? parseDecimalInput(litMatch[1]) : null,
      cost,
      comb: /etanol|álcool|alcool/.test(s) ? 'Etanol' : /gasolina/.test(s) ? 'Gasolina' : 'Misto',
      full: 'Sim'
    });
  }
  // Check for reminder
  else if (/lembr|avis[ae]/.test(s)) {
    actions.push({ k: 'lemb', desc: text.trim(), km, date });
  }
  // Check for document
  else if (/ipva|seguro|licenciamento/.test(s)) {
    actions.push({
      k: 'doc',
      tipo: /ipva/.test(s) ? 'IPVA' : /seguro/.test(s) ? 'Seguro' : 'Licenciamento',
      date,
      cost
    });
  }
  // Check for maintenance
  else if (/troq|troca|conserto|consert|revis|manuten|instal|coloqu|regul|fiz /.test(s)) {
    const typeMatch = MAINTENANCE_TYPES.find(t => new RegExp(t.toLowerCase().replace(/\s+/g, '\\s+')).test(s));
    actions.push({
      k: 'manut',
      tipo: typeMatch || 'Outro',
      peca: null,
      desc: text.trim(),
      date,
      km,
      cost
    });
  }
  // Check for note
  else if (/^(anota|nota|dica|informa)/.test(s)) {
    actions.push({ k: 'nota', titulo: text.trim().slice(0, 40), texto: text.trim(), date });
  }
  // Questions
  else if (s.includes('?') || /^(quando|qual|quanto)/.test(s)) {
    return answerQuestion(text);
  }

  return { resposta: actions.length ? 'Entendi. Confira e salve:' : null, acoes: actions };
}

/**
 * Answer questions based on local data
 */
function answerQuestion(text) {
  const s = text.toLowerCase();

  // Total spent
  if (/quanto (gastei|gasto)|total gasto/.test(s)) {
    const currentMonth = getToday().slice(0, 7);
    const monthly = ['manut', 'abast', 'doc'].reduce((sum, cat) => {
      return sum + getState().data[cat]
        .filter(x => (x.date || '').slice(0, 7) === currentMonth)
        .reduce((s, x) => s + (Number(x.cost) || 0), 0);
    }, 0);
    const total = ['manut', 'abast', 'doc'].reduce((sum, cat) => sum + getState().data[cat].reduce((s, x) => s + (Number(x.cost) || 0), 0), 0);

    return { resposta: `Neste mês: ${formatCurrency(monthly)}. No total: ${formatCurrency(total)}.`, acoes: [] };
  }

  // Last service of type
  const typeMatch = MAINTENANCE_TYPES.find(t => new RegExp(t.toLowerCase()).test(s));
  if (typeMatch) {
    const last = getAllMaintenance().find(x => x.tipo === typeMatch);
    return {
      resposta: last ? `Último registro de ${typeMatch}: ${dt(last.date)}${last.km ? ' com ' + nf(last.km) + ' km' : ''}${last.peca ? ' (' + last.peca + ')' : ''}.` : `Não encontrei registros de ${typeMatch}.`,
      acoes: []
    };
  }

  return { resposta: 'Isso eu só consigo responder com a IA ativa. Aqui posso registrar serviços, abastecimentos, lembretes e documentos.', acoes: [] };
}

/**
 * Normalize action from AI
 */
function normalizeAction(action) {
  if (!action?.k) return null;

  const normalized = { k: action.k };
  const fields = getActionFields(action.k);

  for (const field of fields) {
    let value = action[field];
    if (value == null || value === '') continue;

    if (field === 'cost' || field === 'lit') {
      value = parseDecimalInput(value);
      if (!isFinite(value)) continue;
    } else if (field === 'km') {
      value = parseNumberInput(value);
    } else if (field === 'date') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) continue;
    } else if (field === 'comb' && !FUEL_TYPES.includes(value)) {
      const match = FUEL_TYPES.find(f => f.toLowerCase() === String(value).toLowerCase());
      if (!match) continue;
      value = match;
    } else if (field === 'tipo' && !MAINTENANCE_TYPES.includes(value)) {
      const match = MAINTENANCE_TYPES.find(t => t.toLowerCase() === String(value).toLowerCase());
      if (!match) continue;
      value = match;
    } else if (field === 'full' && !['Sim', 'Não'].includes(value)) {
      value = 'Sim';
    }

    normalized[field] = value;
  }

  // Defaults
  if ((action.k === 'manut' || action.k === 'abast' || action.k === 'nota') && !normalized.date) {
    normalized.date = getToday();
  }
  if (action.k === 'abast' && !normalized.full) normalized.full = 'Sim';

  return normalized;
}

/**
 * Get action fields by type
 */
function getActionFields(type) {
  const fields = {
    manut: ['tipo', 'peca', 'desc', 'date', 'km', 'cost', 'ofi'],
    abast: ['date', 'km', 'comb', 'lit', 'cost', 'full', 'posto'],
    lemb: ['desc', 'km', 'date'],
    doc: ['tipo', 'date', 'cost'],
    nota: ['titulo', 'texto', 'date']
  };
  return fields[type] || [];
}

/**
 * Accept chat action
 */
export function acceptChatAction(msgIndex, actionIndex) {
  const state = getState();
  const action = state.chat[msgIndex]?.actions?.[actionIndex];
  if (!action) return;

  const { k, ...data } = action;
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  switch (k) {
    case 'manut': import('../store.js').then(m => m.addMaintenance({ ...data, id })); break;
    case 'abast': import('../store.js').then(m => m.addFuel({ ...data, id })); break;
    case 'lemb': import('../store.js').then(m => m.addReminder({ ...data, id })); break;
    case 'doc': import('../store.js').then(m => m.addDocument({ ...data, id })); break;
    case 'nota': import('../store.js').then(m => m.addNote({ ...data, id })); break;
  }

  updateChatAction(msgIndex, actionIndex, { done: true });
  import('../utils/helpers.js').then(m => m.showToast('Registrado ✓'));
}

/**
 * Edit chat action
 */
export function editChatAction(msgIndex, actionIndex) {
  const state = getState();
  const action = state.chat[msgIndex]?.actions?.[actionIndex];
  if (!action) return;

  import('../components/FormModal.js').then(m => m.openFormModal(action.k, null, action));
}

/**
 * Discard chat action
 */
export function discardChatAction(msgIndex, actionIndex) {
  updateChatAction(msgIndex, actionIndex, { no: true });
}

/**
 * Set chat input value (for example buttons)
 */
export function setChatInput(text) {
  const input = document.getElementById('chat-input');
  if (input) {
    input.value = text;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 110) + 'px';
    input.focus();
  }
}

/**
 * Add months to date
 */
function addMonths(dateStr, months) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/**
 * Days until date
 */
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(getToday() + 'T12:00:00');
  const target = new Date(dateStr + 'T12:00:00');
  return Math.ceil((target - today) / 864e5);
}

/**
 * Clear chat (with confirmation)
 */
function clearChatWithConfirm() {
  if (confirm('Limpar a conversa? Os registros salvos continuam.')) {
    clearChat();
  }
}

// Export for global access
window.garagemApp = window.garagemApp || {};
window.garagemApp.sendChatMessage = sendChatMessage;
window.garagemApp.acceptChatAction = acceptChatAction;
window.garagemApp.editChatAction = editChatAction;
window.garagemApp.discardChatAction = discardChatAction;
window.garagemApp.clearChat = clearChatWithConfirm;
window.garagemApp.setChatInput = setChatInput;