/* ==========================================================================
   Validation Utilities
   ========================================================================== */

import { parseNumberInput, parseDecimalInput, getToday } from './helpers.js';
import { parseRelativeDate } from './date.js';

/**
 * Validation result
 */
export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Validate required field
 */
export function validateRequired(value, fieldName) {
  if (value == null || String(value).trim() === '') {
    throw new ValidationError(`${fieldName} é obrigatório`, fieldName);
  }
  return String(value).trim();
}

/**
 * Validate number field
 */
export function validateNumber(value, fieldName, { min, max, integer = false } = {}) {
  const num = typeof value === 'number'
    ? value
    : (integer ? parseNumberInput(value) : parseDecimalInput(value));
  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} deve ser um número válido`, fieldName);
  }
  if (min !== undefined && num < min) {
    throw new ValidationError(`${fieldName} deve ser maior ou igual a ${min}`, fieldName);
  }
  if (max !== undefined && num > max) {
    throw new ValidationError(`${fieldName} deve ser menor ou igual a ${max}`, fieldName);
  }
  return num;
}

/**
 * Validate date field
 */
export function validateDate(value, fieldName) {
  const parsed = parseRelativeDate(value);
  if (!parsed) {
    throw new ValidationError(`${fieldName}: data inválida. Use DD/MM, DD/MM/AAAA ou "hoje"/"ontem"`, fieldName);
  }
  // Validate it's a real date
  const [y, m, d] = parsed.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    throw new ValidationError(`${fieldName}: data inválida`, fieldName);
  }
  return parsed;
}

/**
 * Validate select field
 */
export function validateSelect(value, fieldName, options) {
  if (!options.includes(value)) {
    // Try case-insensitive match
    const match = options.find(o => o.toLowerCase() === String(value).toLowerCase());
    if (match) return match;
    throw new ValidationError(`${fieldName}: valor inválido. Opções: ${options.join(', ')}`, fieldName);
  }
  return value;
}

/**
 * Validate maintenance type
 */
const MAINTENANCE_TYPES = [
  'Óleo e filtro', 'Correia dentada', 'Freios', 'Suspensão', 'Pneus',
  'Velas', 'Arrefecimento', 'Elétrica', 'Embreagem', 'Filtros',
  'Motor', 'Revisão', 'Funilaria', 'Outro'
];

export function validateMaintenanceType(value) {
  return validateSelect(value, 'Tipo de serviço', MAINTENANCE_TYPES);
}

/**
 * Validate fuel type
 */
const FUEL_TYPES = ['Etanol', 'Gasolina', 'Misto'];

export function validateFuelType(value) {
  return validateSelect(value, 'Combustível', FUEL_TYPES);
}

/**
 * Validate full tank field
 */
const FULL_TANK_OPTIONS = ['Sim', 'Não'];

export function validateFullTank(value) {
  return validateSelect(value, 'Tanque cheio', FULL_TANK_OPTIONS);
}

/**
 * Validate document type
 */
const DOC_TYPES = ['IPVA', 'Seguro', 'Licenciamento', 'Multa', 'Outro'];

export function validateDocType(value) {
  return validateSelect(value, 'Tipo de documento', DOC_TYPES);
}

/**
 * Validate form data against schema
 */
export function validateForm(data, schema) {
  const errors = {};
  const validated = {};

  for (const field of schema) {
    const { name, type, required, options, min, max, integer } = field;
    const value = data[name];

    try {
      if (required) {
        validateRequired(value, name);
      } else if (value == null || String(value).trim() === '') {
        validated[name] = '';
        continue;
      }

      let validatedValue;
      switch (type) {
        case 'number':
          validatedValue = validateNumber(value, name, { min, max, integer });
          break;
        case 'decimal':
          validatedValue = validateNumber(value, name, { min, max });
          break;
        case 'date':
          validatedValue = validateDate(value, name);
          break;
        case 'select':
          validatedValue = validateSelect(value, name, options);
          break;
        case 'maintenanceType':
          validatedValue = validateMaintenanceType(value);
          break;
        case 'fuelType':
          validatedValue = validateFuelType(value);
          break;
        case 'fullTank':
          validatedValue = validateFullTank(value);
          break;
        case 'docType':
          validatedValue = validateDocType(value);
          break;
        default:
          validatedValue = validateRequired(value, name);
      }

      validated[name] = validatedValue;
    } catch (error) {
      if (error instanceof ValidationError) {
        errors[name] = error.message;
      } else {
        errors[name] = `Erro de validação em ${name}`;
      }
    }
  }

  return { validated, errors, isValid: Object.keys(errors).length === 0 };
}