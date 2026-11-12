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
    modal.open(`
      <div class="modal-handle"></div>
      <h2 id="modal-title">${options.title}</h2>
      <p class="text-muted" style="margin: 8px 0 24px;">${options.message}</p>
      <div class="form-actions">
        <button class="btn btn--secondary" onclick="this.closest('.modal-sheet').modalInstance.close(); resolve(false)">Cancelar</button>
        <button class="btn btn--${options.danger ? 'danger' : 'primary'}" onclick="this.closest('.modal-sheet').modalInstance.close(); resolve(true)">
          ${options.confirmText || 'Confirmar'}
        </button>
      </div>
    `);

    // Override close to resolve promise
    const originalClose = modal.close.bind(modal);
    modal.close = () => {
      originalClose();
      resolve(false);
    };
  });
}

/**
 * Alert modal
 */
export function alertModal(message, title = 'Aviso') {
  return new Promise((resolve) => {
    const modal = new Modal(document.getElementById('modal-root'));
    modal.open(`
      <div class="modal-handle"></div>
      <h2 id="modal-title">${title}</h2>
      <p style="margin: 8px 0 24px;">${message}</p>
      <div class="form-actions">
        <button class="btn btn--primary" onclick="this.closest('.modal-sheet').modalInstance.close(); resolve(true)">OK</button>
      </div>
    `);

    modal.onClose(() => resolve(true));
  });
}