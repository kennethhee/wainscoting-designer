import type { Unit } from './types';

export const MM_PER_INCH = 25.4;
export const MM_PER_FOOT = 304.8;
export const SQFT_PER_SQM = 10.7639104;
export const LITRES_PER_GALLON = 3.785411784;

export function mmToDisplay(mm: number, unit: Unit): number {
  if (unit === 'in') {
    return Math.round((mm / MM_PER_INCH) * 16) / 16;
  }
  return Math.round(mm * 10) / 10;
}

export function displayToMm(val: number, unit: Unit): number {
  if (!Number.isFinite(val)) return 0;
  if (unit === 'in') {
    return Math.round(val * MM_PER_INCH * 10) / 10;
  }
  return Math.round(val * 10) / 10;
}

/**
 * Safe numeric parser that preserves 0 (unlike `parseFloat(v) || fallback`).
 */
export function parseNumericInput(raw: string, fallback: number, min?: number, max?: number): number {
  const trimmed = raw.trim();
  if (trimmed === '') return fallback;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return fallback;
  let result = parsed;
  if (min !== undefined && result < min) result = min;
  if (max !== undefined && result > max) result = max;
  return result;
}

export function formatLength(mm: number, unit: Unit, showUnit = true): string {
  if (!Number.isFinite(mm)) return showUnit ? (unit === 'in' ? '0"' : '0 mm') : '0';
  if (unit === 'in') {
    const inches = mm / MM_PER_INCH;
    const neg = inches < 0;
    const absIn = Math.abs(inches);
    const whole = Math.floor(absIn);
    const sixteenths = Math.round((absIn - whole) * 16);
    let s = '';
    if (sixteenths === 0) {
      s = `${whole}`;
    } else if (sixteenths === 16) {
      s = `${whole + 1}`;
    } else {
      let num = sixteenths;
      let den = 16;
      while (num % 2 === 0 && den % 2 === 0) {
        num /= 2;
        den /= 2;
      }
      s = whole > 0 ? `${whole} ${num}/${den}` : `${num}/${den}`;
    }
    const prefix = neg ? '-' : '';
    return showUnit ? `${prefix}${s}"` : `${prefix}${s}`;
  }
  const rounded = Math.round(mm);
  return showUnit ? `${rounded} mm` : `${rounded}`;
}

export function formatLinear(mm: number, unit: Unit): string {
  if (unit === 'in') {
    return `${(mm / MM_PER_FOOT).toFixed(1)} ft`;
  }
  return `${(mm / 1000).toFixed(2)} m`;
}

export function formatArea(sqM: number, unit: Unit): string {
  if (unit === 'in') {
    return `${(sqM * SQFT_PER_SQM).toFixed(1)} sq ft`;
  }
  return `${sqM.toFixed(2)} m²`;
}

export function escHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
