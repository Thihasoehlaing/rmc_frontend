export function normalizeCountryForStorage(value: unknown): string | null {
  const normalized = String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en');

  return normalized || null;
}

export function formatCountryForDisplay(value: unknown): string {
  const normalized = normalizeCountryForStorage(value);
  if (!normalized) return '';

  return normalized.replace(/(^|[\s'’-])\p{L}/gu, (match) => match.toLocaleUpperCase('en'));
}
