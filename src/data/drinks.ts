import type { DrinkCategory, DrinkCategoryId, VolumeUnit } from '../types';

/**
 * Каталог категорий. Крепости — это только удобные стартовые значения,
 * которые пользователь всегда может изменить под свой напиток.
 */
export const DRINK_CATEGORIES: DrinkCategory[] = [
  {
    id: 'beer',
    label: 'Пиво',
    shortLabel: 'Пиво',
    emoji: '🍺',
    defaultStrength: 5,
    defaultVolumeMl: 500,
    accent: '#ffb020',
    hint: 'Светлое, тёмное, крафт — крепость смотри на этикетке.',
  },
  {
    id: 'vodka',
    label: 'Водка',
    shortLabel: 'Водка',
    emoji: '🍶',
    defaultStrength: 40,
    defaultVolumeMl: 50,
    accent: '#d6e4ff',
    hint: 'Обычно 40%, но бывает и другая. Проверь бутылку.',
  },
  {
    id: 'wine',
    label: 'Вино',
    shortLabel: 'Вино',
    emoji: '🍷',
    defaultStrength: 12,
    defaultVolumeMl: 150,
    accent: '#ff3d8b',
    hint: 'Сухое, полусладкое, креплёное — разброс большой.',
  },
  {
    id: 'whiskey',
    label: 'Виски',
    shortLabel: 'Виски',
    emoji: '🥃',
    defaultStrength: 40,
    defaultVolumeMl: 50,
    accent: '#ff9f1c',
    hint: 'Обычно 40–46%. Введи реальную крепость.',
  },
  {
    id: 'cognac',
    label: 'Коньяк',
    shortLabel: 'Коньяк',
    emoji: '🍇',
    defaultStrength: 40,
    defaultVolumeMl: 50,
    accent: '#ffd166',
    hint: 'Стандарт около 40%, но цифры бывают разными.',
  },
  {
    id: 'rum',
    label: 'Ром',
    shortLabel: 'Ром',
    emoji: '🏴‍☠️',
    defaultStrength: 40,
    defaultVolumeMl: 50,
    accent: '#ff6a1f',
    hint: 'Белый, тёмный, оверпруф — крепость решает.',
  },
  {
    id: 'cocktail',
    label: 'Коктейли',
    shortLabel: 'Коктейль',
    emoji: '🍹',
    defaultStrength: 10,
    defaultVolumeMl: 250,
    accent: '#c6ff2e',
    hint: '10% — просто пример. Крепость коктейля сильно зависит от рецепта и пропорций: считай по фактическому составу.',
  },
  {
    id: 'cider',
    label: 'Сидр',
    shortLabel: 'Сидр',
    emoji: '🍏',
    defaultStrength: 5,
    defaultVolumeMl: 500,
    accent: '#9ae66e',
    hint: 'Сладкий сидр бывает коварным: смотри этикетку.',
  },
  {
    id: 'low-alcohol',
    label: 'Слабоалкогольные',
    shortLabel: 'Слабоалкогольное',
    emoji: '🧃',
    defaultStrength: 5,
    defaultVolumeMl: 330,
    accent: '#7ad7ff',
    hint: 'Коктейли в банках, алкопопы и прочая химия.',
  },
  {
    id: 'other',
    label: 'Другой напиток',
    shortLabel: 'Другое',
    emoji: '🧪',
    defaultStrength: 20,
    defaultVolumeMl: 250,
    accent: '#b388ff',
    hint: 'Название и крепость задаёшь сам. Без гаданий.',
  },
];

export const DRINK_CATEGORY_MAP: Record<DrinkCategoryId, DrinkCategory> = Object.fromEntries(
  DRINK_CATEGORIES.map((category) => [category.id, category]),
) as Record<DrinkCategoryId, DrinkCategory>;

export function getCategory(id: DrinkCategoryId): DrinkCategory {
  return DRINK_CATEGORY_MAP[id];
}

/** Удобные пресеты объёма в миллилитрах. */
export const VOLUME_PRESETS_ML = [30, 50, 100, 150, 250, 330, 440, 500, 700, 1000] as const;

export const VOLUME_UNITS: { id: VolumeUnit; label: string }[] = [
  { id: 'ml', label: 'мл' },
  { id: 'l', label: 'л' },
];

/** Быстрые варианты крепости для переключателя эквивалента. */
export const EQUIVALENT_QUICK_PICKS: DrinkCategoryId[] = [
  'vodka',
  'beer',
  'wine',
  'whiskey',
  'cocktail',
  'other',
];

export const MAX_ENTRIES = 200;
export const MAX_NAME_LENGTH = 48;
export const MAX_VOLUME_ML = 100_000;
export const MAX_QUANTITY = 999;
