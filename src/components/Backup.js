/* ==========================================================================
   Backup Page Component
   ========================================================================== */

import { getIcon } from '../utils/icons.js';
import { escapeHtml, formatNumber } from '../utils/helpers.js';
import { getState } from '../store.js';
import { exportState, importState, clearState, DEFAULT_STATE } from '../utils/storage.js';
import { showToast } from '../utils/helpers.js';

/**
 * Render Backup page
 */
export function renderBackup(state, { navigate }) {
  return `
    <button class="back-btn" onclick="garagemApp.navigate('mais')">${getIcon('chevronRight')} Mais</button>

    <h2 style="font-size: 1.375rem; margin-top: 6px; display: flex; align-items: center; gap: 8px;">
      ${getIcon('save')} Backup e dados
    </h2>

    <div class="card text-muted" style="margin-bottom: 16px;">
      Os dados ficam salvos neste navegador. Limpar os dados do site apaga tudo, então exporte de vez em quando.
    </div>

    <div class="backup-actions">
      <button class="btn btn--primary" onclick="exportBackup()">${getIcon('download')} Exportar backup</button>
      <button class="btn btn--secondary" onclick="document.getElementById('backup-import').click()">${getIcon('upload')} Importar backup</button>
      <input type="file" id="backup-import" accept=".json" hidden onchange="importBackup(this)">
      <button class="btn btn--danger" onclick="confirmWipe()">${getIcon('trash')} Apagar todos os dados</button>
    </div>

    <div class="card" style="margin-top: 24px;">
      <h3 style="font-size: 1rem; margin-bottom: 8px;">Informações do backup</h3>
      <div class="kv-list">
        <dt>Registros de manutenção</dt><dd>${getState().data.manut.length}</dd>
        <dt>Abastecimentos</dt><dd>${getState().data.abast.length}</dd>
        <dt>Lembretes</dt><dd>${getState().data.lemb.length}</dd>
        <dt>Documentos</dt><dd>${getState().data.doc.length}</dd>
        <dt>Anotações</dt><dd>${getState().data.nota.length}</dd>
        <dt>Quilometragem atual</dt><dd>${formatNumber(getState().km)} km</dd>
      </div>
    </div>
  `;
}

/**
 * Export backup
 */
async function exportBackup() {
  const state = getState();
  const json = exportState(state);
  const filename = `garagem-palio-${new Date().toISOString().slice(0, 10)}.json`;

  try {
    // Try File System Access API
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      showToast('Backup salvo');
      return;
    }
  } catch (e) {
    if (e.name === 'AbortError') return;
  }

  try {
    // Try Web Share API
    const file = new File([json], filename, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Backup Garagem do Palio' });
      return;
    }
  } catch (e) {}

  // Fallback: download
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Backup baixado');
  } catch (e) {
    // Last resort: prompt to copy
    prompt('Copie e guarde este texto (backup):', json);
  }
}

/**
 * Import backup
 */
function importBackup(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const newState = importState(reader.result);
      // Save to localStorage
      localStorage.setItem('garagem-palio-v2', JSON.stringify(newState));
      // Reload page to apply
      window.location.reload();
    } catch (e) {
      showToast('Arquivo inválido: ' + e.message, true);
    }
    input.value = '';
  };
  reader.readAsText(file);
}

/**
 * Confirm wipe all data
 */
function confirmWipe() {
  if (confirm('Apagar TODOS os dados? Não dá para desfazer.')) {
    if (confirm('Tem certeza? Isso remove tudo: manutenções, abastecimentos, lembretes, documentos, anotações e ficha do carro.')) {
      clearState();
      showToast('Todos os dados foram apagados');
      setTimeout(() => window.location.reload(), 500);
    }
  }
}

/* ==========================================================================
   Global handlers used by inline template attributes
   ========================================================================== */
window.exportBackup = exportBackup;
window.importBackup = importBackup;
window.confirmWipe = confirmWipe;