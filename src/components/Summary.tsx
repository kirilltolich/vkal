import type { AlcoholTotals } from '../types';
import { formatNumber, plural } from '../utils/format';

interface SummaryProps {
  totals: AlcoholTotals;
}

export function Summary({ totals }: SummaryProps) {
  return (
    <section className="panel summary" aria-labelledby="summary-title" aria-live="polite">
      <header className="panel-head">
        <div>
          <h3 id="summary-title">Что уже намешано</h3>
          <p>
            {totals.positions}{' '}
            {plural(totals.positions, ['позиция', 'позиции', 'позиций'])} в списке
          </p>
        </div>
        <span className="live-badge">
          <span className="live-dot" aria-hidden="true" /> live
        </span>
      </header>

      <div className="stat-grid">
        <div className="stat stat-primary">
          <span className="stat-label">Чистый этанол</span>
          <span className="stat-value">
            {formatNumber(totals.ethanolMl)}
            <small>мл</small>
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Масса этанола</span>
          <span className="stat-value">
            {formatNumber(totals.ethanolMassG)}
            <small>г</small>
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Всего выпито</span>
          <span className="stat-value">
            {formatNumber(totals.volumeMl)}
            <small>мл</small>
          </span>
        </div>
      </div>

      <div className="formula-card">
        <p className="formula-title">Как считаем</p>
        <p className="formula">
          V<sub>этанола</sub> = Σ (объём × крепость ÷ 100 × порции)
        </p>
        <p className="formula-note">
          Масса = объём этанола × 0,789 г/мл (плотность при ~20 °C). Промежуточные
          значения не округляем, красиво округляем только показ.
        </p>
      </div>

      <p className="summary-note">
        Это количество этанола, а не оценка твоего состояния. Как ты себя чувствуешь —
        знаешь только ты и, возможно, твой трезвый друг.
      </p>
    </section>
  );
}
