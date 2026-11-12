/* ==========================================================================
   Modal Component (Bottom Sheet)
   ========================================================================== */

import { getIcon } from '../utils/icons.js';

/**
 * Modal class for bottom sheets
 */
export class Modal {
  constructor(container) {
    this.container = container;
    this.isOpen = false;
    this.onCloseCallbacks = [];
    // Backdrop inline handler resolves through this reference.
    if (container) container.modalInstance = this;
  }

  /**
   * Open modal with HTML content
   */
  open(content) {
    this.container.innerHTML = `
      <div class="modal-backdrop" onclick="this.parentElement.modalInstance.close()"></div>
      <div class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        ${content}
      </div>
    `;

    // Store reference for backdrop click
    this.container.querySelector('.modal-backdrop').modalInstance = this;
    this.container.querySelector('.modal-sheet').modalInstance = this;

    // Animate in
    requestAnimationFrame(() => {
      this.container.querySelector('.modal-backdrop').classList.add('open');
      this.container.querySelector('.modal-sheet').classList.add('open');
    });

    this.isOpen = true;
    document.body.style.overflow = 'hidden';

    // Focus first focusable element
    const focusable = this.container.querySelector('input, select, textarea, button');
    if (focusable) focusable.focus();
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

    // Call close callbacks
    this.onCloseCallbacks.forEach(cb => cb());
    this.onCloseCallbacks = [];

    // Clean up after animation
    setTimeout(() => {
      if (!this.isOpen) this.container.innerHTML = '';
    }, 300);
  }

  /**
   * Register close callback
   */
  onClose(callback) {
    this.onCloseCallbacks.push(callback);
  }
}

/**
 * Confirmation modal
 */
export function confirmModal(options) {
  return new Promise((resolve) => {
    const modal = new Modal(document.getElementById('modal-root'));
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      modal.close();
      resolve(result);
    };

    modal.open(`
      <div class="modal-handle"></div>
      <h2 id="modal-title">${options.title}</h2>
      <p class="text-muted" style="margin: 8px 0 24px;">${options.message}</p>
      <div class="form-actions">
        <button type="button" class="btn btn--secondary" data-confirm-cancel>Cancelar</button>
        <button type="button" class="btn btn--${options.danger ? 'danger' : 'primary'}" data-confirm-ok>
          ${options.confirmText || 'Confirmar'}
        </button>
      </div>
    `);

    modal.container.querySelector('[data-confirm-cancel]').addEventListener('click', () => finish(false));
    modal.container.querySelector('[data-confirm-ok]').addEventListener('click', () => finish(true));

    // Closing by backdrop/Escape counts as cancelling.
    modal.onClose(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    });
  });
}

/**
 * Alert modal
 */
export function alertModal(message, title = 'Aviso') {
  return new Promise((resolve) => {
    const modal = new Modal(document.getElementById('modal-root'));
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      modal.close();
      resolve(true);
    };

    modal.open(`
      <div class="modal-handle"></div>
      <h2 id="modal-title">${title}</h2>
      <p style="margin: 8px 0 24px;">${message}</p>
      <div class="form-actions">
        <button type="button" class="btn btn--primary" data-alert-ok>OK</button>
      </div>
    `);

    modal.container.querySelector('[data-alert-ok]').addEventListener('click', finish);
    modal.onClose(() => {
      if (!settled) {
        settled = true;
        resolve(true);
      }
    });
  });
}