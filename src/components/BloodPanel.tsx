import type { CSSProperties, FormEvent } from 'react';
import { FOOD_LEVELS, FOOD_LEVEL_MAP, FOOD_TIMINGS, FOOD_TIMING_MAP, SEX_OPTIONS } from '../data/blood';
import type { BloodDraft } from '../types';
import type { BloodErrors } from '../utils/bac';
import { formatClockNow, formatMinutesSpan } from '../utils/format';

interface BloodPanelProps {
  draft: BloodDraft;
  errors: BloodErrors;
  now: Date;
  /** Длительность интервала из проверенных данных; null — время ещё не сходится. */
  durationMinutes: number | null;
  entriesCount: number;
  calculated: boolean;
  onPatch: (patch: Partial<BloodDraft>) => void;
  onUseNow: () => void;
  onCalculate: () => void;
}

export function BloodPanel({
  draft,
  errors,
  now,
  durationMinutes,
  entriesCount,
  calculated,
  onPatch,
  onUseNow,
  onCalculate,
}: BloodPanelProps) {
  const sexOption = SEX_OPTIONS.find((option) => option.id === draft.sex) ?? SEX_OPTIONS[0];
  const foodLevel = FOOD_LEVEL_MAP[draft.foodLevel];
  const timingOption = FOOD_TIMING_MAP[draft.foodTiming];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onCalculate();
  };

  return (
    <form className="panel blood-form" onSubmit={handleSubmit} noValidate aria-labelledby="blood-form-title">
      <header className="panel-head">
        <div>
          <h3 id="blood-form-title">Кто, сколько и когда</h3>
          <p>Вес и время обязательны. Рост и еда — по желанию: модель работает и без них.</p>
        </div>
        <span className="blood-badge">оценка, не измерение</span>
      </header>

      <fieldset className="blood-fieldset">
        <legend>Пол</legend>
        <div className="chip-row" role="group" aria-label="Пол человека">
          {SEX_OPTIONS.map((option) => {
            const active = option.id === draft.sex;
            return (
              <button
                key={option.id}
                type="button"
                className={`chip${active ? ' is-active' : ''}`}
                aria-pressed={active}
                onClick={() => onPatch({ sex: option.id })}
              >
                <span aria-hidden="true">{option.emoji}</span> {option.label}
              </button>
            );
          })}
        </div>
        <p className="form-hint">
          <span aria-hidden="true">ⓘ</span> {sexOption.hint} Это параметр модели, а не оценка человека.
        </p>
      </fieldset>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="blood-weight">Вес, кг</label>
          <div className="input-suffix">
            <input
              id="blood-weight"
              type="text"
              inputMode="decimal"
              value={draft.weight}
              placeholder="70"
              aria-invalid={Boolean(errors.weight)}
              aria-describedby={errors.weight ? 'blood-weight-error' : undefined}
              onChange={(event) => onPatch({ weight: event.target.value })}
            />
            <span aria-hidden="true">кг</span>
          </div>
          {errors.weight ? (
            <p className="field-error" id="blood-weight-error">
              {errors.weight}
            </p>
          ) : null}
        </div>

        <div className="field">
          <div className="field-label-row">
            <label htmlFor="blood-height">Рост, см</label>
            <span className="field-optional">не обязательно</span>
          </div>
          <div className="input-suffix">
            <input
              id="blood-height"
              type="text"
              inputMode="decimal"
              value={draft.height}
              placeholder="175"
              aria-invalid={Boolean(errors.height)}
              aria-describedby={errors.height ? 'blood-height-error' : undefined}
              onChange={(event) => onPatch({ height: event.target.value })}
            />
            <span aria-hidden="true">см</span>
          </div>
          {errors.height ? (
            <p className="field-error" id="blood-height-error">
              {errors.height}
            </p>
          ) : null}
        </div>
      </div>

      <p className="form-hint">
        <span aria-hidden="true">ⓘ</span> С ростом модель уточняет объём распределения по общей воде тела
        (Hume–Weyers). Без роста берутся средние коэффициенты Видмарка: 0,68 для мужчин и 0,55 для женщин.
      </p>

      <div className="blood-time-grid">
        <div className="field">
          <label htmlFor="blood-start">Первый напиток</label>
          <input
            id="blood-start"
            type="time"
            value={draft.startTime}
            aria-invalid={Boolean(errors.startTime)}
            aria-describedby={errors.startTime ? 'blood-start-error' : undefined}
            onChange={(event) => onPatch({ startTime: event.target.value })}
          />
          {errors.startTime ? (
            <p className="field-error" id="blood-start-error">
              {errors.startTime}
            </p>
          ) : null}
        </div>

        <div className="field">
          <div className="field-label-row">
            <label htmlFor="blood-end">Последний напиток</label>
            <span className="field-optional">можно не указывать</span>
          </div>
          <input
            id="blood-end"
            type="time"
            value={draft.endTime}
            aria-invalid={Boolean(errors.endTime)}
            aria-describedby={errors.endTime ? 'blood-end-error' : undefined}
            onChange={(event) => onPatch({ endTime: event.target.value })}
          />
          {errors.endTime ? (
            <p className="field-error" id="blood-end-error">
              {errors.endTime}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="blood-now">Сейчас на устройстве</label>
          <div className="now-display" id="blood-now">
            <strong>{formatClockNow(now)}</strong>
            <button type="button" className="text-button" onClick={onUseNow}>
              подставить
            </button>
          </div>
        </div>
      </div>

      <p className="form-hint">
        <span aria-hidden="true">ⓘ</span>{' '}
        {durationMinutes === null
          ? 'Интервал пока не сходится — проверь время первого и последнего напитка.'
          : draft.endTime.trim() === ''
            ? `Последний напиток не указан — считаем, что всё выпито в ${draft.startTime}.`
            : `Интервал ${formatMinutesSpan(durationMinutes)}. Напитки из списка распределяем равномерно: первый — в начало, последний — в указанное время.`}
      </p>

      <fieldset className="blood-fieldset">
        <legend>Еда</legend>
        <div className="food-grid">
          {FOOD_LEVELS.map((level) => {
            const active = level.id === draft.foodLevel;
            return (
              <button
                key={level.id}
                type="button"
                className={`food-card${active ? ' is-active' : ''}`}
                aria-pressed={active}
                style={{ '--food-accent': level.accent } as CSSProperties}
                onClick={() => onPatch({ foodLevel: level.id })}
              >
                <span className="food-card-emoji" aria-hidden="true">
                  {level.emoji}
                </span>
                <span className="food-card-label">{level.label}</span>
                <span className="food-card-hint">{level.hint}</span>
              </button>
            );
          })}
        </div>
        <p className="blood-joke">«{foodLevel.joke}»</p>
      </fieldset>

      {draft.foodLevel !== 'none' ? (
        <>
          <div className="blood-food-timing">
            <div className="field">
              <label htmlFor="blood-food-timing">Когда была еда</label>
              <div className="chip-row chip-row-small" id="blood-food-timing" role="group" aria-label="Когда была еда">
                {FOOD_TIMINGS.map((timing) => {
                  const active = timing.id === draft.foodTiming;
                  return (
                    <button
                      key={timing.id}
                      type="button"
                      className={`chip chip-small${active ? ' is-active' : ''}`}
                      aria-pressed={active}
                      onClick={() => onPatch({ foodTiming: timing.id })}
                    >
                      {timing.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="field">
              <label htmlFor="blood-food-offset">{timingOption.offsetLabel}, мин</label>
              <div className="input-suffix">
                <input
                  id="blood-food-offset"
                  type="text"
                  inputMode="numeric"
                  value={draft.foodOffset}
                  placeholder={String(timingOption.defaultOffsetMin)}
                  aria-invalid={Boolean(errors.foodOffset)}
                  aria-describedby={errors.foodOffset ? 'blood-food-offset-error' : undefined}
                  onChange={(event) => onPatch({ foodOffset: event.target.value })}
                />
                <span aria-hidden="true">мин</span>
              </div>
              {errors.foodOffset ? (
                <p className="field-error" id="blood-food-offset-error">
                  {errors.foodOffset}
                </p>
              ) : null}
            </div>
          </div>

          <p className="form-hint">
            <span aria-hidden="true">ⓘ</span> {timingOption.offsetHint} Еда меняет только скорость всасывания:
            мы не обещаем, что она снизит итоговую концентрацию на конкретный процент.
          </p>
        </>
      ) : null}

      <div className="calculate-bar blood-bar">
        <div className="calculate-copy">
          <span className="calculate-eyebrow">
            {calculated ? 'расчёт уже есть' : 'что покажет модель'}
          </span>
          <p>
            {calculated
              ? 'Цифры обновляются сами, пока страница открыта: время идёт, кривая тоже.'
              : 'Концентрацию, диапазон, пик, график и ориентировочное время до нуля.'}
          </p>
        </div>
        <div className="calculate-actions">
          <button
            type="submit"
            className="button button-blood"
            disabled={entriesCount === 0}
          >
            РАССЧИТАТЬ, НАСКОЛЬКО Я ПОПАЛ <span aria-hidden="true">→</span>
          </button>
          <p>
            {entriesCount === 0
              ? 'Сначала добавь хотя бы один напиток в разделе 01.'
              : 'Это не измерение и не разрешение садиться за руль.'}
          </p>
        </div>
      </div>
    </form>
  );
}
