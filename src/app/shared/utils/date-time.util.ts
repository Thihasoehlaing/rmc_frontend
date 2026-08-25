export const MALAYSIA_TIME_ZONE = 'Asia/Kuala_Lumpur';

const ISO_TIME_ZONE_PATTERN = /(Z|[+-]\d{2}:?\d{2})$/i;

const MALAYSIA_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: MALAYSIA_TIME_ZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function formatMalaysiaDateTime(
  value: string | Date | null | undefined,
  fallback = '-',
): string {
  const date = parseApiDateTime(value);
  return date ? MALAYSIA_DATE_TIME_FORMATTER.format(date) : fallback;
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
