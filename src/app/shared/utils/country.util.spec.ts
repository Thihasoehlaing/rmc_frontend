import { describe, expect, it } from 'vitest';

import { formatCountryForDisplay, normalizeCountryForStorage } from './country.util';

describe('country utilities', () => {
  it('normalizes country values before storage', () => {
    expect(normalizeCountryForStorage('  United   KINGDOM  ')).toBe('united kingdom');
    expect(normalizeCountryForStorage('')).toBeNull();
    expect(normalizeCountryForStorage(null)).toBeNull();
  });

  it('formats stored country values for display', () => {
    expect(formatCountryForDisplay('united kingdom')).toBe('United Kingdom');
    expect(formatCountryForDisplay("côte d'ivoire")).toBe("Côte D'Ivoire");
    expect(formatCountryForDisplay('timor-leste')).toBe('Timor-Leste');
    expect(formatCountryForDisplay(null)).toBe('');
  });
});
