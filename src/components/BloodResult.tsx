import type { CSSProperties } from 'react';
import {
  BLOOD_DRIVING_WARNING,
  BLOOD_METHOD_NOTES,
  BLOOD_PHASES,
  BLOOD_WARN_PER_MILLE,
  FOOD_LEVEL_MAP,
} from '../data/blood';
import type { BacResult } from '../utils/bac';
import {
  formatClockAt,
  formatClockNow,
  formatMinutesSpan,
  formatNumber,
  formatPerMille,
  plural,
} from '../utils/format';
import { BloodChart } from './BloodChart';

interface BloodResultProps {
  result: BacResult;
  seed: number;
}

function rotate(phrases: readonly string[], index: number): string {
  if (phrases.length === 0) return '';
  return phrases[((index % phrases.length) + phrases.length) % phrases.length] as string;
}

export function BloodResult({ result, seed }: BloodResultProps) {
  const phase = BLOOD_PHASES[result.phase];
  const phrase = rotate(phase.phrases, seed);
  const food = FOOD_LEVEL_MAP[result.foodLevel];
  const highPerMille = result.currentPerMille >= BLOOD_WARN_PER_MILLE;

  const zeroRange =
    result.uncertainty.zeroMinutesMin !== null && result.uncertainty.zeroMinutesMax !== null
      ? `${formatClockAt(result.startAt, result.uncertainty.zeroMinutesMin)}–${formatClockAt(result.startAt, result.uncertainty.zeroMinutesMax)}`
      : null;

  const drinkCount = result.drinks.length;
  const firstDrink = result.drinks[0];
  const lastDrink = result.drinks[drinkCount - 1];

  return (
    <section className="panel blood-result" aria-live="polite" aria-labelledby="blood-result-title">
      <header className="panel-head">
        <div>
          <h3 id="blood-result-title">Расчётная кровь на {formatClockNow(result.nowAt)}</h3>
          <p>
            Модель Видмарка с задержкой всасывания · интервал{' '}
            {formatMinutesSpan(result.durationMinutes)} ({formatClockAt(result.startAt, 0)}–
            {formatClockNow(result.endAt)})
          </p>
        </div>
        <span className={`blood-phase blood-phase-${result.phase}`}>{phase.label}</span>
      </header>

      <div className="blood-headline" style={{ '--phase-accent': phase.accent } as CSSProperties}>
        <div className="blood-value">
          <span className="blood-value-number">{formatNumber(result.currentPerMille, 2)}</span>
          <span className="blood-value-unit">‰</span>
        </div>
        <div className="blood-value-side">
          <p className="blood-value-label">расчётная концентрация алкоголя в крови</p>
          <p className="blood-range">
            диапазон модели:{' '}
            {formatNumber(result.uncertainty.currentPerMilleMin, 2)}–
            {formatNumber(result.uncertainty.currentPerMilleMax, 2)} ‰
          </p>
          <p className="blood-range-note">
            разброс параметров модели, а не точность измерения
          </p>
        </div>
      </div>

      <p className="blood-phrase">«{phrase}»</p>

      <div className="blood-stats">
        <div className="blood-stat">
          <span className="blood-stat-label">Масса этанола</span>
          <strong className="blood-stat-value">
            {formatNumber(result.ethanolMassG)} <small>г</small>
          </strong>
          <span className="blood-stat-sub">{formatNumber(result.ethanolMl)} мл чистого спирта</span>
        </div>

        <div className="blood-stat">
          <span className="blood-stat-label">Объём распределения</span>
          <strong className="blood-stat-value">
            {formatNumber(result.volumeOfDistributionL, 1)} <small>л</small>
          </strong>
          <span className="blood-stat-sub">
            коэффициент {formatNumber(result.distributionFactor, 2)} ·{' '}
            {result.heightUsed ? 'уточнён по росту' : 'средний по полу'}
          </span>
        </div>

        <div className="blood-stat">
          <span className="blood-stat-label">Пик по модели</span>
          <strong className="blood-stat-value">
            {formatNumber(result.peakPerMille, 2)} <small>‰</small>
          </strong>
          <span className="blood-stat-sub">
            ≈ {formatClockAt(result.startAt, result.peakMinutes)} ·{' '}
            {result.peakInFuture ? 'ещё впереди' : 'уже был'}
          </span>
        </div>

        <div className="blood-stat">
          <span className="blood-stat-label">Условный ноль</span>
          <strong className="blood-stat-value">
            {result.zeroAt === null ? '—' : formatClockAt(result.startAt, result.zeroMinutes ?? 0)}
          </strong>
          <span className="blood-stat-sub">
            {result.alreadySober
              ? 'уже ниже порога 0,01 ‰'
              : zeroRange
                ? `при разбросе параметров ${zeroRange}`
                : 'за пределами расчёта'}
          </span>
        </div>

        <div className="blood-stat blood-stat-wide">
          <span className="blood-stat-label">Еда в модели</span>
          <strong className="blood-stat-value">
            <span aria-hidden="true">{food.emoji}</span> {food.label}
          </strong>
          <span className="blood-stat-sub">
            {result.foodLevel === 'none'
              ? 'всасывание не замедляем — это самый консервативный сценарий'
              : `${result.mealMinutes === null ? 'время не задано' : `еда около ${formatClockAt(result.startAt, result.mealMinutes)}`} · всасывание ×${formatNumber(result.absorptionFactor, 2)} на ${result.foodWindowHours} ч`}
          </span>
        </div>

        <div className="blood-stat blood-stat-wide">
          <span className="blood-stat-label">Напитки по времени</span>
          <strong className="blood-stat-value">
            {drinkCount} {plural(drinkCount, ['позиция', 'позиции', 'позиций'])}
          </strong>
          <span className="blood-stat-sub">
            {firstDrink && lastDrink
              ? drinkCount === 1
                ? `расчётное время — ${formatClockAt(result.startAt, firstDrink.minutes)}`
                : `с ${formatClockAt(result.startAt, firstDrink.minutes)} до ${formatClockAt(result.startAt, lastDrink.minutes)}, равномерно`
              : 'нет данных'}
          </span>
        </div>
      </div>

      <BloodChart result={result} />

      <div className="blood-phase-card" style={{ '--phase-accent': phase.accent } as CSSProperties}>
        <strong>{phase.label}</strong>
        <p>{phase.hint}</p>
        {result.peakInFuture ? (
          <p className="blood-phase-note">
            По модели максимум ≈ {formatPerMille(result.peakPerMille)} около{' '}
            {formatClockAt(result.startAt, result.peakMinutes)}. Диапазон пика:{' '}
            {formatNumber(result.uncertainty.peakPerMilleMin, 2)}–
            {formatNumber(result.uncertainty.peakPerMilleMax, 2)} ‰.
          </p>
        ) : null}
      </div>

      {highPerMille ? (
        <aside className="safety-notice blood-alert" role="alert" aria-labelledby="blood-alert-title">
          <span className="safety-icon" aria-hidden="true">
            ⚠️
          </span>
          <div className="safety-copy">
            <h3 id="blood-alert-title">Расчётная концентрация высокая</h3>
            <p>
              Модель показывает {formatPerMille(result.currentPerMille)}. Это серьёзно, даже если
              тебе кажется, что всё нормально: расчёт не измеряет твоё реальное состояние.
            </p>
            <p className="safety-emergency">
              Не садись за руль, не продолжай пить и не оставайся один. При потере сознания,
              нарушении дыхания или судорогах — <strong>немедленно звони 112 или 103</strong>.
            </p>
          </div>
        </aside>
      ) : null}

      <div className="blood-assumptions">
        <p className="formula-title">Как считает модель</p>
        <p className="formula">
          C<sub>кровь</sub> = масса этанола в теле ÷ (коэффициент Видмарка × масса тела)
        </p>
        <ul className="blood-assumption-list">
          {BLOOD_METHOD_NOTES.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>

      <p className="blood-disclaimer">{BLOOD_DRIVING_WARNING}</p>
    </section>
  );
}
