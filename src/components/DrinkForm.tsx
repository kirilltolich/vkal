import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, RefObject } from 'react';
import {
  DRINK_CATEGORIES,
  MAX_NAME_LENGTH,
  MAX_QUANTITY,
  VOLUME_PRESETS_ML,
  VOLUME_UNITS,
  getCategory,
} from '../data/drinks';
import type { DrinkCategoryId, DrinkDraft, DrinkEntry, VolumeUnit } from '../types';
import { entryEthanolMl } from '../utils/alcohol';
import { formatMl, formatNumber } from '../utils/format';
import { parseDecimal, validateDraft, type DraftErrors } from '../utils/validation';

interface FormState {
  categoryId: DrinkCategoryId;
  name: string;
  volume: string;
  unit: VolumeUnit;
  strength: string;
  quantity: string;
}

interface DrinkFormProps {
  editingEntry: DrinkEntry | null;
  limitReached: boolean;
  onAdd: (draft: DrinkDraft) => void;
  onUpdate: (id: string, draft: DrinkDraft) => void;
  onCancelEdit: () => void;
}

function toInputNumber(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return String(rounded).replace('.', ',');
}

function createInitialForm(categoryId: DrinkCategoryId): FormState {
  const category = getCategory(categoryId);
  return {
    categoryId,
    name: category.label,
    volume: toInputNumber(category.defaultVolumeMl),
    unit: 'ml',
    // Для «другого напитка» крепость не выдумываем — её вводит пользователь.
    strength: categoryId === 'other' ? '' : toInputNumber(category.defaultStrength),
    quantity: '1',
  };
}

function formFromEntry(entry: DrinkEntry): FormState {
  return {
    categoryId: entry.categoryId,
    name: entry.name,
    volume: toInputNumber(entry.volumeMl),
    unit: 'ml',
    strength: toInputNumber(entry.strength),
    quantity: toInputNumber(entry.quantity),
  };
}

function presetLabel(presetMl: number): string {
  return presetMl >= 1000 ? `${formatNumber(presetMl / 1000, 1)} л` : `${presetMl} мл`;
}

export function DrinkForm({
  editingEntry,
  limitReached,
  onAdd,
  onUpdate,
  onCancelEdit,
}: DrinkFormProps) {
  const [form, setForm] = useState<FormState>(() => createInitialForm('beer'));
  const [errors, setErrors] = useState<DraftErrors>({});

  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const volumeRef = useRef<HTMLInputElement>(null);
  const strengthRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);

  const category = getCategory(form.categoryId);

  useEffect(() => {
    if (!editingEntry) return;
    setForm(formFromEntry(editingEntry));
    setErrors({});
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = window.setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 380);
    return () => window.clearTimeout(timer);
  }, [editingEntry]);

  const previewEthanol = useMemo<number | null>(() => {
    const volume = parseDecimal(form.volume);
    const strength = parseDecimal(form.strength);
    const quantity = parseDecimal(form.quantity);
    if (volume === null || strength === null || quantity === null) return null;

    const volumeMl = form.unit === 'l' ? volume * 1000 : volume;
    if (volumeMl <= 0 || strength <= 0 || strength > 100 || quantity <= 0) return null;
    return entryEthanolMl({ volumeMl, strength, quantity });
  }, [form.volume, form.unit, form.strength, form.quantity]);

  const currentVolumeMl = useMemo<number | null>(() => {
    const volume = parseDecimal(form.volume);
    if (volume === null) return null;
    return form.unit === 'l' ? volume * 1000 : volume;
  }, [form.volume, form.unit]);

  const clearError = (field: keyof DraftErrors) => {
    setErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const resetForm = (categoryId: DrinkCategoryId = form.categoryId) => {
    setForm(createInitialForm(categoryId));
    setErrors({});
  };

  const applyCategory = (categoryId: DrinkCategoryId) => {
    const nextCategory = getCategory(categoryId);
    setForm((previous) => {
      const previousCategory = getCategory(previous.categoryId);
      const shouldReplaceName =
        previous.name.trim() === '' || previous.name === previousCategory.label;

      return {
        ...previous,
        categoryId,
        name: shouldReplaceName ? nextCategory.label : previous.name,
        volume: toInputNumber(nextCategory.defaultVolumeMl),
        unit: 'ml',
        strength:
          categoryId === 'other' ? '' : toInputNumber(nextCategory.defaultStrength),
      };
    });
    setErrors({});
  };

  const switchUnit = (unit: VolumeUnit) => {
    if (unit === form.unit) return;
    setForm((previous) => {
      const value = parseDecimal(previous.volume);
      if (value === null) return { ...previous, unit };
      const converted = unit === 'l' ? value / 1000 : value * 1000;
      return { ...previous, unit, volume: toInputNumber(converted) };
    });
    clearError('volume');
  };

  const applyVolumePreset = (presetMl: number) => {
    const useLitres = presetMl >= 1000;
    setForm((previous) => ({
      ...previous,
      unit: useLitres ? 'l' : 'ml',
      volume: toInputNumber(useLitres ? presetMl / 1000 : presetMl),
    }));
    clearError('volume');
  };

  const stepQuantity = (delta: number) => {
    setForm((previous) => {
      const current = parseDecimal(previous.quantity) ?? 1;
      const next = Math.min(MAX_QUANTITY, Math.max(0.5, Math.round((current + delta) * 10) / 10));
      return { ...previous, quantity: toInputNumber(next) };
    });
    clearError('quantity');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = validateDraft({
      name: form.name,
      volume: form.volume,
      unit: form.unit,
      strength: form.strength,
      quantity: form.quantity,
    });

    if (!result.ok) {
      setErrors(result.errors);
      const order: (keyof DraftErrors)[] = ['name', 'volume', 'strength', 'quantity'];
      const first = order.find((field) => result.errors[field]);
      const refs: Record<keyof DraftErrors, RefObject<HTMLInputElement | null>> = {
        name: nameRef,
        volume: volumeRef,
        strength: strengthRef,
        quantity: quantityRef,
      };
      if (first) refs[first].current?.focus();
      return;
    }

    const draft: DrinkDraft = {
      categoryId: form.categoryId,
      ...result.value,
    };

    if (editingEntry) {
      onUpdate(editingEntry.id, draft);
    } else {
      onAdd(draft);
    }

    resetForm(form.categoryId);
  };

  const handleCancelEdit = () => {
    resetForm(form.categoryId);
    onCancelEdit();
  };

  return (
    <form
      className="panel drink-form"
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby="drink-form-title"
    >
      <header className="panel-head">
        <div>
          <h3 id="drink-form-title">
            {editingEntry ? 'Редактируем позицию' : 'Добавить напиток'}
          </h3>
          <p>Один напиток — одна позиция. Пять банок? Поставь количество 5.</p>
        </div>
        {editingEntry ? <span className="editing-flag">редактирование</span> : null}
      </header>

      <fieldset className="category-fieldset">
        <legend>Категория</legend>
        <div className="category-grid">
          {DRINK_CATEGORIES.map((item) => {
            const active = item.id === form.categoryId;
            return (
              <button
                key={item.id}
                type="button"
                className={`category-chip${active ? ' is-active' : ''}`}
                aria-pressed={active}
                style={active ? { borderColor: item.accent, color: item.accent } : undefined}
                onClick={() => applyCategory(item.id)}
              >
                <span className="category-chip-emoji" aria-hidden="true">
                  {item.emoji}
                </span>
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {category.hint ? (
        <p className="form-hint">
          <span aria-hidden="true">ⓘ</span> {category.hint}
        </p>
      ) : null}

      <div className="form-grid">
        <div className="field field-wide">
          <label htmlFor="drink-name">Название</label>
          <input
            id="drink-name"
            ref={nameRef}
            type="text"
            value={form.name}
            maxLength={MAX_NAME_LENGTH}
            placeholder="Например, «Балтика 7»"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'drink-name-error' : undefined}
            onChange={(event) => {
              setForm((previous) => ({ ...previous, name: event.target.value }));
              clearError('name');
            }}
          />
          {errors.name ? (
            <p className="field-error" id="drink-name-error">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className="field field-wide">
          <div className="field-label-row">
            <label htmlFor="drink-volume">Объём одной порции</label>
            <div className="unit-toggle" role="group" aria-label="Единица измерения объёма">
              {VOLUME_UNITS.map((unit) => (
                <button
                  key={unit.id}
                  type="button"
                  className={form.unit === unit.id ? 'is-active' : ''}
                  aria-pressed={form.unit === unit.id}
                  onClick={() => switchUnit(unit.id)}
                >
                  {unit.label}
                </button>
              ))}
            </div>
          </div>
          <input
            id="drink-volume"
            ref={volumeRef}
            type="text"
            inputMode="decimal"
            value={form.volume}
            placeholder="500"
            aria-invalid={Boolean(errors.volume)}
            aria-describedby={errors.volume ? 'drink-volume-error' : undefined}
            onChange={(event) => {
              setForm((previous) => ({ ...previous, volume: event.target.value }));
              clearError('volume');
            }}
          />
          <div className="preset-row" aria-label="Быстрый выбор объёма">
            {VOLUME_PRESETS_ML.map((preset) => {
              const active =
                currentVolumeMl !== null && Math.abs(currentVolumeMl - preset) < 0.001;
              return (
                <button
                  key={preset}
                  type="button"
                  className={`preset-chip${active ? ' is-active' : ''}`}
                  onClick={() => applyVolumePreset(preset)}
                >
                  {presetLabel(preset)}
                </button>
              );
            })}
          </div>
          {errors.volume ? (
            <p className="field-error" id="drink-volume-error">
              {errors.volume}
            </p>
          ) : null}
        </div>

        <div className="field">
          <div className="field-label-row">
            <label htmlFor="drink-strength">Крепость</label>
            <button
              type="button"
              className="inline-hint-button"
              onClick={() => {
                setForm((previous) => ({
                  ...previous,
                  strength: toInputNumber(category.defaultStrength),
                }));
                clearError('strength');
              }}
            >
              пример: {formatNumber(category.defaultStrength)}%
            </button>
          </div>
          <div className="input-suffix">
            <input
              id="drink-strength"
              ref={strengthRef}
              type="text"
              inputMode="decimal"
              value={form.strength}
              placeholder="5"
              aria-invalid={Boolean(errors.strength)}
              aria-describedby={errors.strength ? 'drink-strength-error' : undefined}
              onChange={(event) => {
                setForm((previous) => ({ ...previous, strength: event.target.value }));
                clearError('strength');
              }}
            />
            <span aria-hidden="true">%</span>
          </div>
          {errors.strength ? (
            <p className="field-error" id="drink-strength-error">
              {errors.strength}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="drink-quantity">Порций / бутылок</label>
          <div className="stepper">
            <button
              type="button"
              className="stepper-button"
              onClick={() => stepQuantity(-1)}
              aria-label="Уменьшить количество"
            >
              −
            </button>
            <input
              id="drink-quantity"
              ref={quantityRef}
              type="text"
              inputMode="decimal"
              value={form.quantity}
              placeholder="1"
              aria-invalid={Boolean(errors.quantity)}
              aria-describedby={errors.quantity ? 'drink-quantity-error' : undefined}
              onChange={(event) => {
                setForm((previous) => ({ ...previous, quantity: event.target.value }));
                clearError('quantity');
              }}
            />
            <button
              type="button"
              className="stepper-button"
              onClick={() => stepQuantity(1)}
              aria-label="Увеличить количество"
            >
              +
            </button>
          </div>
          {errors.quantity ? (
            <p className="field-error" id="drink-quantity-error">
              {errors.quantity}
            </p>
          ) : null}
        </div>
      </div>

      <div className="form-foot">
        <div className="form-preview" aria-live="polite">
          {previewEthanol !== null ? (
            <>
              В этой позиции:{' '}
              <strong>{formatMl(previewEthanol)}</strong> чистого этанола
            </>
          ) : (
            'Заполни объём, крепость и количество — покажу чистый этанол.'
          )}
        </div>
        <div className="form-actions">
          {editingEntry ? (
            <button type="button" className="button button-ghost" onClick={handleCancelEdit}>
              Отмена
            </button>
          ) : null}
          <button
            type="submit"
            className="button button-primary"
            disabled={limitReached && !editingEntry}
          >
            {editingEntry ? 'Сохранить изменения' : 'Добавить в список'}
          </button>
        </div>
      </div>

      {limitReached && !editingEntry ? (
        <p className="form-limit">
          Достигнут разумный лимит списка. Удали что-нибудь или отредактируй позицию.
        </p>
      ) : null}
    </form>
  );
}
