import type { AlcoholTotals, DrinkEntry } from '../types';

/** Плотность этанола при ~20 °C, г/мл. */
export const ETHANOL_DENSITY_G_PER_ML = 0.789;

/**
 * Объём чистого этанола одной позиции, мл:
 * объём напитка × крепость / 100 × количество порций.
 * Промежуточные значения не округляются.
 */
export function entryEthanolMl(entry: Pick<DrinkEntry, 'volumeMl' | 'strength' | 'quantity'>): number {
  return (entry.volumeMl * entry.strength) / 100 * entry.quantity;
}

/** Суммарный объём напитка одной позиции с учётом количества порций, мл. */
export function entryVolumeMl(entry: Pick<DrinkEntry, 'volumeMl' | 'quantity'>): number {
  return entry.volumeMl * entry.quantity;
}

export function sumEthanolMl(entries: readonly DrinkEntry[]): number {
  return entries.reduce((sum, entry) => sum + entryEthanolMl(entry), 0);
}

/**
 * Масса этанола в граммах: объём этанола (мл) × 0,789 г/мл.
 */
export function ethanolMassG(ethanolMl: number): number {
  return ethanolMl * ETHANOL_DENSITY_G_PER_ML;
}

/** Единое вычислительное состояние приложения: никаких дублирующих расчётов в компонентах. */
export function computeTotals(entries: readonly DrinkEntry[]): AlcoholTotals {
  const volumeMl = entries.reduce((sum, entry) => sum + entryVolumeMl(entry), 0);
  const ethanolMl = sumEthanolMl(entries);

  return {
    volumeMl,
    ethanolMl,
    ethanolMassG: ethanolMassG(ethanolMl),
    positions: entries.length,
  };
}

/**
 * Эквивалентный объём напитка, мл:
 * суммарный этанол / (крепость напитка / 100).
 * Возвращает null, если крепость не положительная.
 */
export function equivalentVolumeMl(ethanolMl: number, strengthPercent: number): number | null {
  if (!Number.isFinite(ethanolMl) || !Number.isFinite(strengthPercent) || strengthPercent <= 0) {
    return null;
  }
  return ethanolMl / (strengthPercent / 100);
}
