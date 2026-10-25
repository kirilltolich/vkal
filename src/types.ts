export type DrinkCategoryId =
  | 'beer'
  | 'vodka'
  | 'wine'
  | 'whiskey'
  | 'cognac'
  | 'rum'
  | 'cocktail'
  | 'cider'
  | 'low-alcohol'
  | 'other';

export type VolumeUnit = 'ml' | 'l';

export interface DrinkCategory {
  id: DrinkCategoryId;
  label: string;
  /** Короткое название для чипов и карточек. */
  shortLabel: string;
  emoji: string;
  /** Редактируемый пример крепости, не «универсальная характеристика». */
  defaultStrength: number;
  defaultVolumeMl: number;
  accent: string;
  hint?: string;
}

export interface DrinkEntry {
  id: string;
  categoryId: DrinkCategoryId;
  name: string;
  volumeMl: number;
  /** Крепость в процентах, 0 < strength <= 100. */
  strength: number;
  /** Количество порций / бутылок. Может быть дробным. */
  quantity: number;
}

export interface DrinkDraft {
  categoryId: DrinkCategoryId;
  name: string;
  volumeMl: number;
  strength: number;
  quantity: number;
}

export interface EquivalentDrink {
  categoryId: DrinkCategoryId;
  strength: number;
}

export interface AlcoholTotals {
  /** Суммарный объём всех напитков в мл (включая количество порций). */
  volumeMl: number;
  /** Суммарный объём чистого этанола в мл. */
  ethanolMl: number;
  /** Приблизительная масса этанола в граммах. */
  ethanolMassG: number;
  /** Количество позиций в списке. */
  positions: number;
}

export interface ToastMessage {
  id: string;
  text: string;
  tone: 'info' | 'success' | 'error';
}
