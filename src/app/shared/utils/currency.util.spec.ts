import { describe, expect, it } from 'vitest';

import { formatCurrencyAmount, formatMyrCurrency } from './currency.util';

describe('currency display utilities', () => {
  it('formats MYR with a prefix, grouping, and two decimal places', () => {
    expect(formatMyrCurrency('55200')).toBe('RM 55,200.00');
    expect(formatMyrCurrency(5600.5)).toBe('RM 5,600.50');
  });

  it('normalizes already-formatted currency strings', () => {
    expect(formatMyrCurrency('RM 19,400.00')).toBe('RM 19,400.00');
  });

  it('formats non-MYR amounts without adding a currency prefix', () => {
    expect(formatCurrencyAmount('12345.6')).toBe('12,345.60');
  });

  it('uses the requested fallback for missing or invalid values', () => {
    expect(formatMyrCurrency(null)).toBe('-');
    expect(formatMyrCurrency('not-a-number', 'N/A')).toBe('N/A');
  });
});
