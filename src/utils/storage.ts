import { DRINK_CATEGORY_MAP, MAX_ENTRIES } from '../data/drinks';
import type { DrinkCategoryId, DrinkEntry } from '../types';

const STORAGE_KEY = 'v-govno:state:v1';

export interface PersistedState {
  entries: DrinkEntry[];
  equivalentCategoryId: DrinkCategoryId;
  equivalentStrength: string;
}

export const DEFAULT_PERSISTED_STATE: PersistedState = {
  entries: [],
  equivalentCategoryId: 'vodka',
  equivalentStrength: '40',
};

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

export function loadState(): PersistedState {
  if (typeof localStorage === 'undefined') return DEFAULT_PERSISTED_STATE;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PERSISTED_STATE;

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_PERSISTED_STATE;
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
        : DEFAULT_PERSISTED_STATE.equivalentCategoryId;

    const strength =
      typeof candidate.equivalentStrength === 'string' && candidate.equivalentStrength
        ? candidate.equivalentStrength
        : DEFAULT_PERSISTED_STATE.equivalentStrength;

    return { entries, equivalentCategoryId: categoryId, equivalentStrength: strength };
  } catch {
    return DEFAULT_PERSISTED_STATE;
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
