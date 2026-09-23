export const MALAYSIA_TIME_ZONE = 'Asia/Kuala_Lumpur';
export const MALAYSIA_TIME_ZONE_OFFSET = '+0800';
export const DISPLAY_DATE_FORMAT = 'dd-MM-yyyy';
export const DISPLAY_DATE_TIME_FORMAT = 'dd-MM-yyyy hh:mm a';

const ISO_TIME_ZONE_PATTERN = /(Z|[+-]\d{2}:?\d{2})$/i;

const MALAYSIA_DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: MALAYSIA_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const MALAYSIA_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: MALAYSIA_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

export function formatDisplayDate(
  value: string | Date | null | undefined,
  fallback = '-',
): string {
  const date = parseApiDateTime(value);
  return date ? formatDateParts(MALAYSIA_DATE_FORMATTER, date) : fallback;
}

export function formatDisplayDateTime(
  value: string | Date | null | undefined,
  fallback = '-',
): string {
  const date = parseApiDateTime(value);
  return date ? formatDateTimeParts(MALAYSIA_DATE_TIME_FORMATTER, date) : fallback;
}

export function formatMalaysiaDateTime(
  value: string | Date | null | undefined,
  fallback = '-',
): string {
  return formatDisplayDateTime(value, fallback);
}

export function getApiDateTimeMs(value: string | Date | null | undefined): number | null {
  const date = parseApiDateTime(value);
  return date ? date.getTime() : null;
}

function parseApiDateTime(value: string | Date | null | undefined): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalizedDateTime = trimmed.includes('T')
    ? trimmed
    : trimmed.replace(/^(\d{4}-\d{2}-\d{2})\s+/, '$1T');
  const normalized = ISO_TIME_ZONE_PATTERN.test(normalizedDateTime)
    ? normalizedDateTime
    : `${normalizedDateTime}Z`;
  const date = new Date(normalized);

  return Number.isFinite(date.getTime()) ? date : null;
}

function formatDateParts(formatter: Intl.DateTimeFormat, date: Date): string {
  const parts = dateParts(formatter, date);
  return `${parts['day']}-${parts['month']}-${parts['year']}`;
}

function formatDateTimeParts(formatter: Intl.DateTimeFormat, date: Date): string {
  const parts = dateParts(formatter, date);
  return `${parts['day']}-${parts['month']}-${parts['year']} ${parts['hour']}:${parts['minute']} ${parts['dayPeriod'].toUpperCase()}`;
}

function dateParts(formatter: Intl.DateTimeFormat, date: Date): Record<string, string> {
  return Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
}
