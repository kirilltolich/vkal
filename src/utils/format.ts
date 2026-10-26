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

/** Промилле с двумя знаками: «0,73 ‰». */
export function formatPerMille(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${twoDigitFormatter.format(value)} ‰`;
}

/** Длительность: 200 → «3 ч 20 мин», 45 → «45 мин». */
export function formatMinutesSpan(minutes: number): string {
  if (!Number.isFinite(minutes)) return '—';
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest} мин`;
  if (rest === 0) return `${hours} ч`;
  return `${hours} ч ${rest} мин`;
}

/** Время по часам устройства: смещение в минутах от опорного момента. */
export function formatClockAt(base: Date, offsetMinutes: number): string {
  if (!Number.isFinite(offsetMinutes)) return '—';
  const date = new Date(base.getTime() + Math.round(offsetMinutes) * 60_000);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Текущее время по системным часам устройства: «20:41». */
export function formatClockNow(date: Date): string {
  return formatClockAt(date, 0);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
