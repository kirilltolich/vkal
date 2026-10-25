import type { CSSProperties } from 'react';
import type { AlcoholTotals } from '../types';
import { formatEquivalentMl, formatGrams, formatNumber } from '../utils/format';
import type { ResolvedVerdict } from '../utils/verdict';

interface VerdictCardProps {
  verdict: ResolvedVerdict;
  totals: AlcoholTotals;
  equivalentMl: number | null;
  equivalentLabel: string;
  equivalentStrength: number | null;
  onMeme: () => void;
}

export function VerdictCard({
  verdict,
  totals,
  equivalentMl,
  equivalentLabel,
  equivalentStrength,
  onMeme,
}: VerdictCardProps) {
  const levelLabel =
    verdict.displayIndex === null ? 'БЕЗ УРОВНЯ' : `УРОВЕНЬ ${verdict.displayIndex} / 7`;

  return (
    <article
      className="verdict-card"
      style={{ '--accent': verdict.accent } as CSSProperties}
      aria-live="polite"
      aria-labelledby="verdict-name"
    >
      <div className="verdict-glow" aria-hidden="true" />

      <header className="verdict-head">
        <span className="verdict-level">{levelLabel}</span>
        <span className="verdict-tag">условная шкала · не диагноз</span>
      </header>

      <div className="verdict-title-row">
        <span className="verdict-emoji" aria-hidden="true">
          {verdict.emoji}
        </span>
        <div>
          <h3 className="verdict-name" id="verdict-name">
            {verdict.name}
          </h3>
          <p className="verdict-tagline">{verdict.tagline}</p>
        </div>
      </div>

      <blockquote className="verdict-phrase">
        <span className="verdict-quote" aria-hidden="true">
          «
        </span>
        {verdict.phrase}
      </blockquote>

      <p className="verdict-extra">{verdict.extra}</p>

      <div className="verdict-stats">
        <div className="verdict-stat">
          <span>Чистый этанол</span>
          <strong>
            {formatNumber(totals.ethanolMl)} <small>мл</small>
          </strong>
        </div>
        <div className="verdict-stat">
          <span>Масса этанола</span>
          <strong>
            {formatNumber(totals.ethanolMassG)} <small>г</small>
          </strong>
        </div>
        <div className="verdict-stat verdict-stat-wide">
          <span>Эквивалент</span>
          <strong>{equivalentMl === null ? '—' : `≈ ${formatEquivalentMl(equivalentMl)}`}</strong>
          <span className="verdict-stat-sub">
            {equivalentLabel}
            {equivalentStrength === null ? '' : ` · ${formatNumber(equivalentStrength)}%`}
          </span>
        </div>
      </div>

      <div className="verdict-actions">
        <button type="button" className="button button-accent" onClick={onMeme}>
          <span aria-hidden="true">🖼️</span> Сделать мем-карточку
        </button>
        <p className="verdict-refresh">
          Цифры пересчитываются сами, если поменять список или крепость эквивалента.
          Нажми «НУ И ЧЁ ТЫ НАХУЯРИЛ?» ещё раз — получишь другую фразу.
        </p>
      </div>

      <p className="verdict-disclaimer">
        {formatGrams(totals.ethanolMassG)} этанола — это математика, а не диагноз.
        Уровни — авторские условные правила игры. Реакция на алкоголь индивидуальна,
        и этот расчёт не говорит, что тебе безопасно что-либо делать.
      </p>
    </article>
  );
}
