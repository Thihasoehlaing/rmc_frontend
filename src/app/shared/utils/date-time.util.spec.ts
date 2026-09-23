import { describe, expect, it } from 'vitest';

import {
  formatDisplayDate,
  formatDisplayDateTime,
  formatMalaysiaDateTime,
} from './date-time.util';

describe('date-time display formatting', () => {
  it('formats a date as dd-MM-yyyy', () => {
    expect(formatDisplayDate('2026-09-23')).toBe('23-09-2026');
  });

  it('formats a datetime in Malaysia time with a 12-hour clock', () => {
    expect(formatDisplayDateTime('2026-09-23T01:00:00Z')).toBe('23-09-2026 09:00 AM');
    expect(formatDisplayDateTime('2026-09-23T13:00:00Z')).toBe('23-09-2026 09:00 PM');
  });

  it('keeps the existing Malaysia formatter aligned with the system format', () => {
    expect(formatMalaysiaDateTime('2026-09-23T01:00:00Z')).toBe('23-09-2026 09:00 AM');
  });

  it('returns the requested fallback for missing or invalid values', () => {
    expect(formatDisplayDate(null, '—')).toBe('—');
    expect(formatDisplayDateTime('not-a-date', 'Not set')).toBe('Not set');
  });
});
