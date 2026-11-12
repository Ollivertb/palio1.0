/* ==========================================================================
   Form Modal Component
   ========================================================================== */

import { getIcon } from '../utils/icons.js';
import { formatNumberInput, parseNumberInput, parseDecimalInput, getToday, generateId } from '../utils/helpers.js';
import { validateForm } from '../utils/validation.js';
import { showToast } from '../utils/helpers.js';
import { getState } from '../store.js';
import {
  addMaintenance, updateMaintenance, deleteMaintenance,
  addFuel, updateFuel, deleteFuel,
  addReminder, updateReminder, deleteReminder,
  addDocument, updateDocument, deleteDocument,
  addNote, updateNote, deleteNote
} from '../store.js';

/**
 * Form Modal class
 */
export class FormModal {
  constructor(container) {
    this.container = container;
    this.isOpen = false;
    this.currentConfig = null;
    // Expose the instance on the root element so inline handlers and
    // openFormModal() can reach it.
    if (container) container.formModalInstance = this;
  }

  /**
   * Open a record form by category (used by the FAB and cards).
   */
  openForm(category, recordId = null, prefill = null) {
    openFormModal(category, recordId, prefill);
  }

  /**
   * Open form modal
   */
  open(config) {
    this.currentConfig = config;
    const { title, fields, onSubmit, onDelete, recordId, category } = config;

    const formHtml = fields.map(field => this.renderField(field)).join('');

    this.container.innerHTML = `
      <div class="modal-backdrop" onclick="this.parentElement.formModalInstance.close()"></div>
      <div class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="form-modal-title">
        <div class="modal-handle"></div>
        <h2 id="form-modal-title">${getIcon(category)} ${title}</h2>
        <form id="form-modal-form" novalidate>
          ${formHtml}
          <div class="form-actions">
            ${onDelete ? `<button type="button" class="btn btn--danger" onclick="this.closest('.modal-sheet').formModalInstance.handleDelete()">${getIcon('delete')} Excluir</button>` : ''}
            <div style="flex:1"></div>
            <button type="submit" class="btn btn--primary">${getIcon('save')} Salvar</button>
          </div>
        </form>
      </div>
    `;

    // Store reference
    this.container.querySelector('.modal-backdrop').formModalInstance = this;
    this.container.querySelector('.modal-sheet').formModalInstance = this;

    // Animate in
    requestAnimationFrame(() => {
      this.container.querySelector('.modal-backdrop').classList.add('open');
      this.container.querySelector('.modal-sheet').classList.add('open');
    });

    // Setup form
    this.setupForm(config);

    this.isOpen = true;
    document.body.style.overflow = 'hidden';

    // Focus first input
    const firstInput = this.container.querySelector('input, select, textarea');
    if (firstInput) firstInput.focus();
  }

  /**
   * Render a form field
   */
  renderField(field) {
    const { name, label, type, value = '', required, placeholder, hint, options } = field;
    const requiredMark = required ? '<span class="text-accent" aria-hidden="true">*</span>' : '';
    const id = `form-${name}`;

    let inputHtml = '';
    switch (type) {
      case 'textarea':
        inputHtml = `<textarea id="${id}" name="${name}" placeholder="${placeholder || ''}" rows="3">${value}</textarea>`;
        break;
      case 'select':
        inputHtml = `
          <select id="${id}" name="${name}">
            ${options.map(opt => `<option value="${opt}"${opt === value ? ' selected' : ''}>${opt}</option>`).join('')}
          </select>
        `;
        break;
      case 'number':
        inputHtml = `<input type="text" id="${id}" name="${name}" inputmode="numeric" placeholder="${placeholder || ''}" value="${value ? formatNumberInput(value) : ''}" autocomplete="off">`;
        break;
      case 'decimal':
        inputHtml = `<input type="text" id="${id}" name="${name}" inputmode="decimal" placeholder="${placeholder || ''}" value="${value || ''}" autocomplete="off">`;
        break;
      case 'date':
        inputHtml = `<input type="date" id="${id}" name="${name}" value="${value || ''}">`;
        break;
      default:
        inputHtml = `<input type="text" id="${id}" name="${name}" placeholder="${placeholder || ''}" value="${value || ''}" autocomplete="off">`;
    }

    return `
      <div class="form-field">
        <label for="${id}">${label}${requiredMark}</label>
        ${inputHtml}
        ${hint ? `<small class="text-muted">${hint}</small>` : ''}
      </div>
    `;
  }

  /**
   * Setup form event listeners
   */
  setupForm(config) {
    const form = this.container.querySelector('#form-modal-form');
    const { fields, onSubmit, onDelete, recordId, category } = config;

    // Number formatting for km fields
    form.querySelectorAll('input[inputmode="numeric"]').forEach(input => {
      input.addEventListener('input', (e) => {
        const cursorPos = e.target.selectionStart;
        const oldLength = e.target.value.length;
        e.target.value = formatNumberInput(e.target.value);
        const newLength = e.target.value.length;
        e.target.setSelectionRange(cursorPos + (newLength - oldLength), cursorPos + (newLength - oldLength));
      });
    });

    // Form submit
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit(config);
    });

    // Store config for delete handler
    this.currentConfig = config;
  }

  /**
   * Handle form submit
   */
  handleSubmit(config) {
    const form = this.container.querySelector('#form-modal-form');
    const formData = new FormData(form);
    const data = {};

    // Parse form data
    for (const [key, value] of formData.entries()) {
      const field = config.fields.find(f => f.name === key);
      if (!field) continue;

      let parsedValue = value;
      if (field.type === 'number') {
        parsedValue = parseNumberInput(value);
      } else if (field.type === 'decimal') {
        parsedValue = parseDecimalInput(value);
      }
      data[key] = parsedValue;
    }

    // Validate
    const { validated, errors, isValid } = validateForm(data, config.fields);

    if (!isValid) {
      // Show errors
      for (const [fieldName, error] of Object.entries(errors)) {
        const input = form.querySelector(`[name="${fieldName}"]`);
        if (input) {
          input.classList.add('invalid');
          input.setAttribute('aria-invalid', 'true');
          input.setAttribute('aria-describedby', `${fieldName}-error`);

          // Add error message
          let errorEl = input.parentNode.querySelector('.field-error');
          if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'field-error text-accent';
            errorEl.style.fontSize = '0.75rem';
            errorEl.style.marginTop = '4px';
            errorEl.id = `${fieldName}-error`;
            input.parentNode.appendChild(errorEl);
          }
          errorEl.textContent = error;
        }
      }

      // Focus first error
      const firstError = form.querySelector('.invalid');
      if (firstError) firstError.focus();

      showToast('Preencha os campos obrigatórios', true);
      return;
    }

    // Call submit callback
    if (config.onSubmit) {
      config.onSubmit(validated, config.recordId);
    }

    this.close();
    showToast('Registro salvo');
  }

  /**
   * Handle delete
   */
  handleDelete() {
    if (this.currentConfig?.onDelete && confirm('Excluir este registro?')) {
      this.currentConfig.onDelete(this.currentConfig.recordId);
      this.close();
      showToast('Registro excluído');
    }
  }

  /**
   * Close modal
   */
  close() {
    const backdrop = this.container.querySelector('.modal-backdrop');
    const sheet = this.container.querySelector('.modal-sheet');

    if (backdrop) backdrop.classList.remove('open');
    if (sheet) sheet.classList.remove('open');

    this.isOpen = false;
    document.body.style.overflow = '';

    setTimeout(() => {
      if (!this.isOpen) this.container.innerHTML = '';
    }, 300);
  }
}

/**
 * Open form for specific category
 */
export function openFormModal(category, recordId = null, prefill = null) {
  const record = recordId ? getRecordByCategory(category, recordId) : null;
  const isEdit = !!record;
  // Values can come from an existing record or a prefill object.
  const source = record || prefill || {};

  const configs = {
    manut: {
      title: isEdit ? 'Editar Manutenção' : 'Nova Manutenção',
      category: 'manut',
      fields: [
        { name: 'date', label: 'Data', type: 'date', value: source.date || getToday(), required: true },
        { name: 'km', label: 'Km', type: 'number', value: source.km || getCurrentKm(), required: true, placeholder: 'Ex.: 85.000' },
        { name: 'tipo', label: 'Serviço', type: 'select', value: source.tipo || 'Óleo e filtro', required: true, options: [
          'Óleo e filtro', 'Correia dentada', 'Freios', 'Suspensão', 'Pneus',
          'Velas', 'Arrefecimento', 'Elétrica', 'Embreagem', 'Filtros',
          'Motor', 'Revisão', 'Funilaria', 'Outro'
        ]},
        { name: 'peca', label: 'Peça / item', type: 'text', value: source.peca || '', placeholder: 'Ex.: kit correia dentada' },
        { name: 'desc', label: 'Detalhes', type: 'textarea', value: source.desc || '', placeholder: 'Ex.: troca da correia e do tensor' },
        { name: 'cost', label: 'Custo (R$)', type: 'decimal', value: source.cost || '', placeholder: 'Ex.: 350,00' },
        { name: 'ofi', label: 'Oficina / loja', type: 'text', value: source.ofi || '', placeholder: 'Ex.: Oficina do João' },
        { name: 'obs', label: 'Observações', type: 'textarea', value: source.obs || '' }
      ],
      onSubmit: (data) => {
        if (isEdit) updateMaintenance(recordId, data);
        else addMaintenance(data);
      },
      onDelete: isEdit ? deleteMaintenance : null,
      recordId
    },

    abast: {
      title: isEdit ? 'Editar Abastecimento' : 'Novo Abastecimento',
      category: 'abast',
      fields: [
        { name: 'date', label: 'Data', type: 'date', value: source.date || getToday(), required: true },
        { name: 'km', label: 'Km', type: 'number', value: source.km || getCurrentKm(), required: true, placeholder: 'Ex.: 86.200' },
        { name: 'comb', label: 'Combustível', type: 'select', value: source.comb || 'Etanol', required: true, options: ['Etanol', 'Gasolina', 'Misto'] },
        { name: 'lit', label: 'Litros', type: 'decimal', value: source.lit || '', required: true, placeholder: 'Ex.: 32,5' },
        { name: 'cost', label: 'Valor total (R$)', type: 'decimal', value: source.cost || '', required: true, placeholder: 'Ex.: 150,00' },
        { name: 'full', label: 'Tanque cheio?', type: 'select', value: source.full || 'Sim', required: true, options: ['Sim', 'Não'] },
        { name: 'posto', label: 'Posto', type: 'text', value: source.posto || '', placeholder: 'Ex.: Posto Ipiranga' }
      ],
      onSubmit: (data) => {
        if (isEdit) updateFuel(recordId, data);
        else addFuel(data);
      },
      onDelete: isEdit ? deleteFuel : null,
      recordId
    },

    lemb: {
      title: isEdit ? 'Editar Lembrete' : 'Novo Lembrete',
      category: 'lemb',
      fields: [
        { name: 'desc', label: 'Lembrete', type: 'text', value: source.desc || '', required: true, placeholder: 'Ex.: Trocar óleo' },
        { name: 'km', label: 'No km', type: 'number', value: source.km || '', placeholder: 'Ex.: 90.000' },
        { name: 'date', label: 'Ou até a data', type: 'date', value: source.date || '', placeholder: 'Opcional' },
        { name: 'obs', label: 'Observações', type: 'textarea', value: source.obs || '' }
      ],
      onSubmit: (data) => {
        if (isEdit) updateReminder(recordId, data);
        else addReminder(data);
      },
      onDelete: isEdit ? deleteReminder : null,
      recordId
    },

    doc: {
      title: isEdit ? 'Editar Documento' : 'Novo Documento',
      category: 'doc',
      fields: [
        { name: 'tipo', label: 'Documento', type: 'select', value: source.tipo || 'IPVA', required: true, options: ['IPVA', 'Seguro', 'Licenciamento', 'Multa', 'Outro'] },
        { name: 'date', label: 'Vencimento', type: 'date', value: source.date || '', required: true },
        { name: 'cost', label: 'Valor (R$)', type: 'decimal', value: source.cost || '', placeholder: 'Ex.: 500,00' },
        { name: 'obs', label: 'Observações', type: 'textarea', value: source.obs || '' }
      ],
      onSubmit: (data) => {
        if (isEdit) updateDocument(recordId, data);
        else addDocument(data);
      },
      onDelete: isEdit ? deleteDocument : null,
      recordId
    },

    nota: {
      title: isEdit ? 'Editar Anotação' : 'Nova Anotação',
      category: 'nota',
      fields: [
        { name: 'titulo', label: 'Título', type: 'text', value: source.titulo || '', required: true, placeholder: 'Ex.: Calibragem dos pneus' },
        { name: 'texto', label: 'Informação', type: 'textarea', value: source.texto || '', required: true, placeholder: 'Ex.: 32 psi na frente, 30 atrás' },
        { name: 'date', label: 'Data', type: 'date', value: source.date || getToday(), required: true }
      ],
      onSubmit: (data) => {
        if (isEdit) updateNote(recordId, data);
        else addNote(data);
      },
      onDelete: isEdit ? deleteNote : null,
      recordId
    }
  };

  const config = configs[category];
  if (!config) return;

  // Get form modal instance
  const formModalEl = document.getElementById('form-modal-root');
  if (formModalEl?.formModalInstance) {
    formModalEl.formModalInstance.open(config);
  }
}

/**
 * Get record by category and ID
 */
function getRecordByCategory(category, id) {
  const state = getState();
  return state.data[category]?.find(r => r.id === id);
}

/**
 * Get current KM from state
 */
function getCurrentKm() {
  const state = getState();
  return Math.max(
    state.km || 0,
    ...state.data.manut.map(x => Number(x.km) || 0),
    ...state.data.abast.map(x => Number(x.km) || 0)
  );
}

// Export for global access (do not overwrite the live formModal instance)
window.garagemApp = window.garagemApp || {};
window.garagemApp.openFormModal = openFormModal;