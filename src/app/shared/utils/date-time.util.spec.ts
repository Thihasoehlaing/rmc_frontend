import { describe, expect, it } from 'vitest';

import {
  formatDisplayDate,
  formatDisplayDateTime,
  formatMalaysiaDateTime,
  formatMalaysiaScheduleDateTime,
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

describe('Malaysia batch schedule formatting', () => {
  it('preserves the form time without shifting schedules into the next day', () => {
    expect(formatMalaysiaScheduleDateTime('2026-10-21T17:30')).toBe('21-10-2026 05:30 PM');
    expect(formatMalaysiaScheduleDateTime('2026-10-26T23:59:00')).toBe('26-10-2026 11:59 PM');
    expect(formatMalaysiaScheduleDateTime('2026-10-21 17:30:00')).toBe('21-10-2026 05:30 PM');
  });

  it('honours explicit timezone offsets', () => {
    expect(formatMalaysiaScheduleDateTime('2026-10-21T09:30:00Z')).toBe('21-10-2026 05:30 PM');
    expect(formatMalaysiaScheduleDateTime('2026-10-21T17:30:00+08:00')).toBe('21-10-2026 05:30 PM');
  });

  it('preserves UTC interpretation for audit timestamps', () => {
    expect(formatDisplayDateTime('2026-10-21T17:30:00')).toBe('22-10-2026 01:30 AM');
  });

  it('uses the supplied fallback for missing or invalid schedules', () => {
    expect(formatMalaysiaScheduleDateTime(null, 'Not scheduled')).toBe('Not scheduled');
    expect(formatMalaysiaScheduleDateTime('invalid', '—')).toBe('—');
  });
});
