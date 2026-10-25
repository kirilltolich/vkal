import {
  DRINK_CATEGORIES,
  EQUIVALENT_QUICK_PICKS,
  getCategory,
} from '../data/drinks';
import type { DrinkCategoryId } from '../types';
import { formatEquivalentMl, formatNumber } from '../utils/format';

interface ConverterProps {
  ethanolMl: number;
  categoryId: DrinkCategoryId;
  strengthInput: string;
  strengthValue: number | null;
  strengthError?: string;
  equivalentMl: number | null;
  onCategoryChange: (categoryId: DrinkCategoryId) => void;
  onStrengthChange: (value: string) => void;
}

export function Converter({
  ethanolMl,
  categoryId,
  strengthInput,
  strengthValue,
  strengthError,
  equivalentMl,
  onCategoryChange,
  onStrengthChange,
}: ConverterProps) {
  const category = getCategory(categoryId);
  const quickPicks = EQUIVALENT_QUICK_PICKS.map((id) => getCategory(id));

  return (
    <section className="panel converter" aria-labelledby="converter-title">
      <header className="panel-head">
        <div>
          <h3 id="converter-title">Пересчитай в другой напиток</h3>
          <p>Тот же чистый этанол, только в понятных стаканах.</p>
        </div>
        <span className="converter-badge">конвертер</span>
      </header>

      <div className="converter-controls">
        <div className="field">
          <label htmlFor="converter-category">Напиток-эквивалент</label>
          <div className="select-wrap">
            <select
              id="converter-category"
              value={categoryId}
              onChange={(event) => onCategoryChange(event.target.value as DrinkCategoryId)}
            >
              {DRINK_CATEGORIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.emoji} {item.label}
                </option>
              ))}
            </select>
            <span className="select-arrow" aria-hidden="true">
              ▾
            </span>
          </div>
        </div>

        <div className="field">
          <label htmlFor="converter-strength">Крепость, %</label>
          <div className="input-suffix">
            <input
              id="converter-strength"
              type="text"
              inputMode="decimal"
              value={strengthInput}
              aria-invalid={Boolean(strengthError)}
              aria-describedby={strengthError ? 'converter-strength-error' : undefined}
              onChange={(event) => onStrengthChange(event.target.value)}
            />
            <span aria-hidden="true">%</span>
          </div>
          {strengthError ? (
            <p className="field-error" id="converter-strength-error">
              {strengthError}
            </p>
          ) : null}
        </div>
      </div>

      <div className="converter-quick" aria-label="Быстрый выбор напитка-эквивалента">
        {quickPicks.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`quick-chip${item.id === categoryId ? ' is-active' : ''}`}
            aria-pressed={item.id === categoryId}
            onClick={() => onCategoryChange(item.id)}
          >
            <span aria-hidden="true">{item.emoji}</span>
            {item.shortLabel}
          </button>
        ))}
      </div>

      {categoryId === 'cocktail' ? (
        <p className="form-hint converter-hint">
          <span aria-hidden="true">ⓘ</span> Крепость коктейля сильно зависит от рецепта.
          10% — только стартовый пример, поставь свою реальную цифру.
        </p>
      ) : null}

      <div className="converter-result" aria-live="polite">
        <span className="converter-result-label">Это эквивалент</span>
        <strong className="converter-result-value">
          {equivalentMl === null ? '—' : `≈ ${formatEquivalentMl(equivalentMl)}`}
        </strong>
        <span className="converter-result-note">
          <span aria-hidden="true">{category.emoji}</span> {category.label}
          {strengthValue === null ? '' : ` · ${formatNumber(strengthValue)}%`}
        </span>
      </div>

      <div className="converter-math">
        <p>
          {formatNumber(ethanolMl)} мл этанола × 100 ÷ {strengthInput || '—'} ={' '}
          {equivalentMl === null ? '—' : formatEquivalentMl(equivalentMl)}
        </p>
      </div>

      <p className="panel-note">
        Это математический эквивалент по количеству чистого этанола, а не утверждение,
        что разные напитки действуют на организм одинаково.
      </p>
    </section>
  );
}
