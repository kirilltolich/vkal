import { DRINK_CATEGORY_MAP, MAX_ENTRIES } from '../data/drinks';
import type { BiologicalSex, BloodDraft, DrinkCategoryId, DrinkEntry, FoodLevel, FoodTiming } from '../types';
import { createDefaultBloodDraft, parseClockTime } from './bac';

const STORAGE_KEY = 'v-govno:state:v1';

export interface PersistedState {
  entries: DrinkEntry[];
  equivalentCategoryId: DrinkCategoryId;
  equivalentStrength: string;
  blood: BloodDraft;
}

/**
 * Значения по умолчанию. Блока крови здесь нет: его поля зависят от текущего
 * времени, поэтому они собираются в `createDefaultPersistedState`.
 */
export function createDefaultPersistedState(now: Date = new Date()): PersistedState {
  return {
    entries: [],
    equivalentCategoryId: 'vodka',
    equivalentStrength: '40',
    blood: createDefaultBloodDraft(now),
  };
}

export function createEntryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isFinitePositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function sanitizeEntry(value: unknown): DrinkEntry | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;

  const categoryId = candidate.categoryId;
  if (typeof categoryId !== 'string' || !(categoryId in DRINK_CATEGORY_MAP)) return null;

  const name = typeof candidate.name === 'string' ? candidate.name.trim().slice(0, 48) : '';
  if (!name) return null;

  const volumeMl = candidate.volumeMl;
  const strength = candidate.strength;
  const quantity = candidate.quantity;

  if (!isFinitePositive(volumeMl) || volumeMl > 100_000) return null;
  if (!isFinitePositive(strength) || strength > 100) return null;
  if (!isFinitePositive(quantity) || quantity > 999) return null;

  return {
    id: typeof candidate.id === 'string' && candidate.id ? candidate.id : createEntryId(),
    categoryId: categoryId as DrinkCategoryId,
    name,
    volumeMl,
    strength,
    quantity,
  };
}

/** Только цифры, пробелы, запятая и точка — то, что понимает parseDecimal. */
const NUMERIC_PATTERN = /^[\d\s\u00a0,.]+$/;
const FOOD_LEVELS_SET: readonly FoodLevel[] = ['none', 'light', 'normal', 'heavy'];
const FOOD_TIMINGS_SET: readonly FoodTiming[] = ['before', 'during', 'after'];

function isFoodLevel(value: unknown): value is FoodLevel {
  return typeof value === 'string' && (FOOD_LEVELS_SET as readonly string[]).includes(value);
}

function isFoodTiming(value: unknown): value is FoodTiming {
  return typeof value === 'string' && (FOOD_TIMINGS_SET as readonly string[]).includes(value);
}

function textField(value: unknown, limit: number): string | null {
  if (typeof value !== 'string') return null;
  return value.slice(0, limit);
}

/** Числовое поле: пустое значение отдаём как есть, мусор заменяем на запасное. */
function numberField(value: unknown, limit: number, fallback: string, allowEmpty: boolean): string {
  const text = textField(value, limit);
  if (text === null) return fallback;
  if (text.trim() === '') return allowEmpty ? '' : fallback;
  return NUMERIC_PATTERN.test(text) ? text : fallback;
}

/** Время: строка должна не только иметь вид ЧЧ:ММ, но и существовать на часах. */
function timeField(value: unknown, fallback: string, allowEmpty: boolean): string {
  const text = textField(value, 5);
  if (text === null) return fallback;
  if (text.trim() === '') return allowEmpty ? '' : fallback;
  return parseClockTime(text) === null ? fallback : text;
}

/**
 * Приводит блок крови к текущему формату. Старые сохранения (без `blood`)
 * и любое испорченное поле молча заменяются значениями по умолчанию.
 */
function sanitizeBlood(value: unknown, now: Date): BloodDraft {
  const fallback = createDefaultBloodDraft(now);
  if (!value || typeof value !== 'object') return fallback;
  const candidate = value as Record<string, unknown>;

  const sex: BiologicalSex =
    candidate.sex === 'male' || candidate.sex === 'female' ? candidate.sex : fallback.sex;
  const foodLevel: FoodLevel = isFoodLevel(candidate.foodLevel)
    ? candidate.foodLevel
    : fallback.foodLevel;
  const foodTiming: FoodTiming = isFoodTiming(candidate.foodTiming)
    ? candidate.foodTiming
    : fallback.foodTiming;

  return {
    sex,
    weight: numberField(candidate.weight, 12, fallback.weight, false),
    height: numberField(candidate.height, 12, fallback.height, true),
    startTime: timeField(candidate.startTime, fallback.startTime, false),
    endTime: timeField(candidate.endTime, fallback.endTime, true),
    foodLevel,
    foodTiming,
    foodOffset: numberField(candidate.foodOffset, 8, fallback.foodOffset, false),
  };
}

export function loadState(now: Date = new Date()): PersistedState {
  const defaults = createDefaultPersistedState(now);
  if (typeof localStorage === 'undefined') return defaults;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return defaults;
    const candidate = parsed as Record<string, unknown>;

    const entries = Array.isArray(candidate.entries)
      ? candidate.entries
          .slice(0, MAX_ENTRIES)
          .map(sanitizeEntry)
          .filter((entry): entry is DrinkEntry => entry !== null)
      : [];

    const categoryId =
      typeof candidate.equivalentCategoryId === 'string' &&
      candidate.equivalentCategoryId in DRINK_CATEGORY_MAP
        ? (candidate.equivalentCategoryId as DrinkCategoryId)
        : defaults.equivalentCategoryId;

    const strength =
      typeof candidate.equivalentStrength === 'string' && candidate.equivalentStrength
        ? candidate.equivalentStrength
        : defaults.equivalentStrength;

    return {
      entries,
      equivalentCategoryId: categoryId,
      equivalentStrength: strength,
      blood: sanitizeBlood(candidate.blood, now),
    };
  } catch {
    return defaults;
  }
}

export function saveState(state: PersistedState): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
