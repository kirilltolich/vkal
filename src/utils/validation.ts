import { MAX_NAME_LENGTH, MAX_QUANTITY, MAX_VOLUME_ML } from '../data/drinks';
import type { VolumeUnit } from '../types';

export interface DraftInput {
  name: string;
  volume: string;
  unit: VolumeUnit;
  strength: string;
  quantity: string;
}

export interface DraftErrors {
  name?: string;
  volume?: string;
  strength?: string;
  quantity?: string;
}

export interface ValidatedDraft {
  name: string;
  volumeMl: number;
  strength: number;
  quantity: number;
}

export type DraftValidation =
  | { ok: true; value: ValidatedDraft }
  | { ok: false; errors: DraftErrors };

/**
 * Разбирает десятичное число, введённое с точкой или запятой.
 * Пробелы (в том числе неразрывные) игнорируются: «1 000,5» → 1000.5.
 * Возвращает null для пустой строки и мусора.
 */
export function parseDecimal(raw: string): number | null {
  const normalized = raw.replace(/\s|\u00a0|\u202f/g, '').replace(',', '.');
  if (!normalized) return null;
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function isEmpty(raw: string): boolean {
  return raw.trim() === '';
}

function roundVolume(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Валидация формы напитка. Все сообщения — для показа рядом с полем. */
export function validateDraft(input: DraftInput): DraftValidation {
  const errors: DraftErrors = {};
  const name = input.name.trim();

  if (!name) {
    errors.name = 'Назови напиток — хотя бы «Пиво».';
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.name = `Слишком длинно. Максимум ${MAX_NAME_LENGTH} символов.`;
  }

  const volumeRaw = parseDecimal(input.volume);
  if (isEmpty(input.volume)) {
    errors.volume = 'Укажи объём.';
  } else if (volumeRaw === null) {
    errors.volume = 'Только число больше нуля. Например 0,5 или 500.';
  } else if (volumeRaw <= 0) {
    errors.volume = 'Объём должен быть больше нуля.';
  } else {
    const volumeMl = roundVolume(input.unit === 'l' ? volumeRaw * 1000 : volumeRaw);
    if (volumeMl > MAX_VOLUME_ML) {
      errors.volume = `Слишком большой объём. Максимум ${MAX_VOLUME_ML} мл.`;
    }
  }

  const strength = parseDecimal(input.strength);
  if (isEmpty(input.strength)) {
    errors.strength = 'Укажи крепость в процентах.';
  } else if (strength === null) {
    errors.strength = 'Только число от 0 до 100. Например 5 или 12,5.';
  } else if (strength <= 0) {
    errors.strength = 'Крепость должна быть больше нуля.';
  } else if (strength > 100) {
    errors.strength = 'Крепость не может быть выше 100%.';
  }

  const quantity = parseDecimal(input.quantity);
  if (isEmpty(input.quantity)) {
    errors.quantity = 'Укажи количество порций.';
  } else if (quantity === null) {
    errors.quantity = 'Только число больше нуля. Например 1 или 2,5.';
  } else if (quantity <= 0) {
    errors.quantity = 'Количество должно быть больше нуля.';
  } else if (quantity > MAX_QUANTITY) {
    errors.quantity = `Максимум ${MAX_QUANTITY} порций за раз.`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const baseVolumeMl = input.unit === 'l' ? (volumeRaw as number) * 1000 : (volumeRaw as number);

  return {
    ok: true,
    value: {
      name,
      volumeMl: roundVolume(baseVolumeMl),
      strength: strength as number,
      quantity: quantity as number,
    },
  };
}

/** Валидация крепости напитка-эквивалента. */
export function validateStrength(raw: string): { value?: number; error?: string } {
  if (isEmpty(raw)) return { error: 'Введи крепость для пересчёта.' };
  const value = parseDecimal(raw);
  if (value === null) return { error: 'Только число от 0 до 100.' };
  if (value <= 0) return { error: 'Крепость должна быть больше нуля.' };
  if (value > 100) return { error: 'Крепость не может быть выше 100%.' };
  return { value };
}
