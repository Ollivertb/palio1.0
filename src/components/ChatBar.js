/* ==========================================================================
   Chat Bar Component
   ========================================================================== */

import { getIcon } from '../utils/icons.js';

let dictation = null;

/**
 * Initialize dictation (Web Speech API)
 */
async function initDictation() {
  if (!dictation && 'webkitSpeechRecognition' in window) {
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    dictation = new SpeechRecognition();
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
        <button class="chat-bar__btn chat-bar__btn--mute" id="dictate-btn" onclick="toggleDictation()" aria-label="Ditar" title="Ditar">
          ${getIcon('mic')}
        </button>
        <textarea
          class="chat-bar__input"
          id="chat-input"
          rows="1"
          placeholder="Ex.: troquei a correia dentada com 85.000 km"
          aria-label="Mensagem"
        ></textarea>
        <button class="chat-bar__btn" onclick="sendChatMessage()" aria-label="Enviar">
          ${getIcon('send')}
        </button>
      </div>
    </div>
  `;
}

/**
 * Setup chat bar event listeners
 */
export function setupChatBar(onSend, onDictation) {
  const input = document.getElementById('chat-input');
  const dictateBtn = document.getElementById('dictate-btn');

  if (input) {
    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 110) + 'px';
    });

    // Send on Enter (not Shift+Enter)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage(onSend);
      }
    });

    // Focus on mount
    setTimeout(() => input.focus(), 100);
  }

  if (dictateBtn) {
    dictateBtn.onclick = () => toggleDictation(onDictation);
  }
}

/**
 * Send chat message
 */
function sendChatMessage(onSend) {
  const input = document.getElementById('chat-input');
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  input.style.height = 'auto';

  if (onSend) onSend(text);
}

/**
 * Toggle voice dictation
 */
let isDictating = false;
let finalTranscript = '';

async function toggleDictation(onResult) {
  const dictateBtn = document.getElementById('dictate-btn');
  const input = document.getElementById('chat-input');

  if (isDictating) {
    // Stop dictation
    if (dictation) dictation.stop();
    isDictating = false;
    dictateBtn.classList.remove('dictating');
    dictateBtn.innerHTML = getIcon('mic');
    return;
  }

  // Start dictation
  dictation = await initDictation();
  if (!dictation) {
    alert('Ditado por voz não suportado neste navegador.');
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

  dictation.onend = () => {
    isDictating = false;
    dictateBtn.classList.remove('dictating');
    dictateBtn.innerHTML = getIcon('mic');
  };

  dictation.onerror = (event) => {
    console.error('Dictation error:', event.error);
    isDictating = false;
    dictateBtn.classList.remove('dictating');
    dictateBtn.innerHTML = getIcon('mic');
  };

  try {
    dictation.start();
  } catch (e) {
    console.error('Failed to start dictation:', e);
    isDictating = false;
    dictateBtn.classList.remove('dictating');
    dictateBtn.innerHTML = getIcon('mic');
  }
}