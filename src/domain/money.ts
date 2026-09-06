/**
 * PRODX POS Domain - Monetary Invariant Module
 * 
 * CRITICAL ARCHITECTURE RULE:
 * Never use binary floating point for monetary business calculations.
 * All amounts are strictly modeled as integer cents (or minor currency units).
 * Rounding is deterministic and explicitly managed.
 */

export interface Money {
  readonly amountInCents: number;
  readonly currency: string;
}

export const ZERO_USD: Money = Object.freeze({
  amountInCents: 0,
  currency: 'THB',
});

/**
 * Creates a validated Money value object.
 * Enforces integer cents to prevent floating point leakages.
 */
export function createMoney(amountInCents: number, currency = 'THB'): Money {
  if (!Number.isFinite(amountInCents)) {
    throw new TypeError(`[Money] Invalid amount: ${amountInCents}`);
  }
  // Enforce integer cents
  const sanitized = Math.round(amountInCents);
  return Object.freeze({
    amountInCents: sanitized,
    currency: currency.toUpperCase(),
  });
}

/**
 * Creates Money from a major currency decimal string or number (e.g. "19.99" -> 1999 cents).
 */
export function fromDecimal(amount: number | string, currency = 'THB'): Money {
  const str = typeof amount === 'number' ? amount.toFixed(4) : String(amount).trim();
  const clean = str.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(clean);
  if (isNaN(parsed)) {
    return createMoney(0, currency);
  }
  // Multiply by 100 with rounding to eliminate IEEE 754 precision drift
  const cents = Math.round(parsed * 100);
  return createMoney(cents, currency);
}

/**
 * Adds two Money objects. Enforces currency matching.
 */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`[Money] Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
  return createMoney(a.amountInCents + b.amountInCents, a.currency);
}

/**
 * Subtracts Money b from Money a.
 */
export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`[Money] Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
  return createMoney(a.amountInCents - b.amountInCents, a.currency);
}

/**
 * Multiplies Money by an integer or decimal factor (e.g. quantity or discount ratio).
 * Uses half-up deterministic rounding on minor units.
 */
export function multiplyMoney(m: Money, factor: number): Money {
  if (!Number.isFinite(factor)) {
    throw new TypeError(`[Money] Invalid multiplication factor: ${factor}`);
  }
  const resultCents = Math.round(m.amountInCents * factor);
  return createMoney(resultCents, m.currency);
}

/**
 * Calculates percentage discount or tax in basis points (1% = 100 basis points).
 * Example: 8.25% = 825 basis points.
 */
export function calculateBasisPoints(m: Money, basisPoints: number): Money {
  const cents = Math.round((m.amountInCents * basisPoints) / 10000);
  return createMoney(cents, m.currency);
}

/**
 * Formats Money for human presentation according to locale rules.
 */
export function formatMoney(m: Money, locale = 'en-US'): string {
  const major = m.amountInCents / 100;
  
  // Custom mapping for popular currency locales to get beautiful symbols
  let resolvedLocale = locale;
  const upper = (m.currency || 'THB').toUpperCase();
  if (upper === 'THB') {
    resolvedLocale = 'th-TH';
  } else if (upper === 'JPY') {
    resolvedLocale = 'ja-JP';
  } else if (upper === 'EUR') {
    resolvedLocale = 'de-DE';
  } else if (upper === 'GBP') {
    resolvedLocale = 'en-GB';
  } else if (upper === 'AUD') {
    resolvedLocale = 'en-AU';
  } else if (upper === 'USD') {
    resolvedLocale = 'en-US';
  }

  return new Intl.NumberFormat(resolvedLocale, {
    style: 'currency',
    currency: upper,
    minimumFractionDigits: upper === 'JPY' ? 0 : 2,
    maximumFractionDigits: upper === 'JPY' ? 0 : 2,
  }).format(major);
}

/**
 * Returns raw decimal representation as string (e.g. "19.99") for form inputs.
 */
export function toDecimalString(m: Money): string {
  return (m.amountInCents / 100).toFixed(2);
}
