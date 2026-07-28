import '@angular/compiler';

import { describe, expect, it } from 'vitest';

import { CachedFormOption } from '../services/form-cache.service';
import { isConfiguredFormActive } from './form-active.guard';

describe('isConfiguredFormActive', () => {
  const forms: CachedFormOption[] = [
    { id: 1, form_code: 'RDIG', form_name: 'RDIG Application', is_active: true },
    { id: 2, form_code: 'JOURNAL', form_name: 'Journal Publication', is_active: false },
  ];

  it('returns true for an active form regardless of code casing', () => {
    expect(isConfiguredFormActive(forms, 'rdig')).toBe(true);
  });

  it('returns false for an inactive form', () => {
    expect(isConfiguredFormActive(forms, 'JOURNAL')).toBe(false);
  });

  it('returns false when the form is not configured', () => {
    expect(isConfiguredFormActive(forms, 'UNKNOWN')).toBe(false);
  });
});
