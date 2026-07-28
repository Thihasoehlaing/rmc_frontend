const MYR_NUMBER_FORMATTER = new Intl.NumberFormat('en-MY', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrencyAmount(value: unknown, fallback = '-'): string {
  const amount = toCurrencyNumber(value);
  return amount === null ? fallback : MYR_NUMBER_FORMATTER.format(amount);
}

export function formatMyrCurrency(value: unknown, fallback = '-'): string {
  const formattedAmount = formatCurrencyAmount(value, '');
  return formattedAmount ? `RM ${formattedAmount}` : fallback;
}

function toCurrencyNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const amount =
    typeof value === 'string'
      ? Number(
          value
            .replace(/^RM\s*/i, '')
            .replaceAll(',', '')
            .trim(),
        )
      : Number(value);

  return Number.isFinite(amount) ? amount : null;
}
