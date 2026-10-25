const numberFormatter = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

const twoDigitFormatter = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

/** Число в русской записи: 19,7 без лишних нулей. */
export function formatNumber(value: number, fractionDigits: 0 | 1 | 2 = 1): string {
  if (!Number.isFinite(value)) return '—';
  if (fractionDigits === 2) return twoDigitFormatter.format(value);
  return numberFormatter.format(value);
}

export function formatMl(value: number): string {
  return `${formatNumber(value)} мл`;
}

/** Граммы этанола с одним знаком после запятой. */
export function formatGrams(value: number): string {
  return `${formatNumber(value)} г`;
}

/**
 * Объём эквивалента: до литра — в мл, от литра — в литрах с двумя знаками.
 */
export function formatEquivalentMl(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1000) {
    return `${twoDigitFormatter.format(value / 1000)} л`;
  }
  return `${formatNumber(value)} мл`;
}

/** Склонение: plural(3, ['позиция', 'позиции', 'позиций']) → «позиции». */
export function plural(count: number, forms: readonly [string, string, string]): string {
  const n = Math.abs(Math.round(count)) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
