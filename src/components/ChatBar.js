/* ==========================================================================
   Chat Bar Component
   ========================================================================== */

import { getIcon } from '../utils/icons.js';

let dictation = null;
let isDictating = false;
let finalTranscript = '';
let sendHandler = null;

/**
 * Initialize dictation (Web Speech API)
 */
async function initDictation() {
  if (!dictation) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    dictation = new SR();
    dictation.lang = 'pt-BR';
    dictation.continuous = true;
    dictation.interimResults = true;
  }
  return dictation;
}

/**
 * Render chat input bar
 */
export function renderChatBar() {
  return `
    <div class="chat-bar" id="chat-bar">
      <div class="chat-bar__inner">
        <button class="chat-bar__btn chat-bar__btn--mute" id="dictate-btn" type="button" aria-label="Ditar" title="Ditar">
          ${getIcon('mic')}
        </button>
        <textarea
          class="chat-bar__input"
          id="chat-input"
          rows="1"
          placeholder="Ex.: troquei a correia dentada com 85.000 km"
          aria-label="Mensagem"
        ></textarea>
        <button class="chat-bar__btn" id="send-btn" type="button" aria-label="Enviar">
          ${getIcon('send')}
        </button>
      </div>
    </div>
  `;
}

/**
 * Read the bar input and hand the text to the send handler.
 */
export function sendChatFromBar() {
  const input = document.getElementById('chat-input');
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  input.style.height = 'auto';

  if (sendHandler) sendHandler(text);
}

/**
 * Setup chat bar event listeners
 */
export function setupChatBar(onSend) {
  sendHandler = onSend;

  const input = document.getElementById('chat-input');
  const dictateBtn = document.getElementById('dictate-btn');
  const sendBtn = document.getElementById('send-btn');

  if (input) {
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 110) + 'px';
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatFromBar();
      }
    });

    setTimeout(() => input.focus(), 100);
  }

  if (sendBtn) sendBtn.addEventListener('click', sendChatFromBar);
  if (dictateBtn) dictateBtn.addEventListener('click', toggleDictation);
}

/**
 * Toggle voice dictation
 */
export async function toggleDictation() {
  const dictateBtn = document.getElementById('dictate-btn');
  const input = document.getElementById('chat-input');
  if (!dictateBtn) return;

  if (isDictating) {
    if (dictation) dictation.stop();
    isDictating = false;
    dictateBtn.classList.remove('dictating');
    dictateBtn.innerHTML = getIcon('mic');
    return;
  }

  dictation = await initDictation();
  if (!dictation) {
    window.garagemApp?.showToast?.('Ditado por voz não suportado neste navegador.', true);
    return;
  }

  finalTranscript = input?.value || '';
  isDictating = true;
  dictateBtn.classList.add('dictating');
  dictateBtn.innerHTML = getIcon('stop');

  dictation.onresult = (event) => {
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += (finalTranscript ? ' ' : '') + transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    if (input) {
      input.value = finalTranscript + interimTranscript;
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 110) + 'px';
    }
  };

  const stopUI = () => {
    isDictating = false;
    dictateBtn.classList.remove('dictating');
    dictateBtn.innerHTML = getIcon('mic');
  };

  dictation.onend = stopUI;
  dictation.onerror = (event) => {
    console.error('Dictation error:', event.error);
    stopUI();
  };

  try {
    dictation.start();
  } catch (e) {
    console.error('Failed to start dictation:', e);
    stopUI();
  }
}

/* ==========================================================================
   Global handlers used by inline template attributes
   ========================================================================== */
window.garagemApp = window.garagemApp || {};
window.garagemApp.toggleDictation = toggleDictation;
window.garagemApp.sendChatFromBar = sendChatFromBar;
