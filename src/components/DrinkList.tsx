import type { CSSProperties } from 'react';
import { getCategory } from '../data/drinks';
import type { DrinkEntry } from '../types';
import { entryEthanolMl, entryVolumeMl } from '../utils/alcohol';
import { formatMl, formatNumber, plural } from '../utils/format';

interface DrinkListProps {
  entries: readonly DrinkEntry[];
  editingId: string | null;
  onEdit: (entry: DrinkEntry) => void;
  onDelete: (entry: DrinkEntry) => void;
  onClear: () => void;
}

export function DrinkList({ entries, editingId, onEdit, onDelete, onClear }: DrinkListProps) {
  const positions = entries.length;

  return (
    <section className="panel drink-list" aria-labelledby="drink-list-title">
      <header className="panel-head list-head">
        <div>
          <h3 id="drink-list-title">Твой список</h3>
          <p>
            {positions > 0
              ? `${positions} ${plural(positions, ['позиция', 'позиции', 'позиций'])}, всё честно`
              : 'Пока пусто — но это легко исправить'}
          </p>
        </div>
        {positions > 0 ? (
          <button type="button" className="text-button text-button-danger" onClick={onClear}>
            Очистить всё
          </button>
        ) : null}
      </header>

      {positions === 0 ? (
        <p className="list-empty">
          Здесь появятся напитки, их объём, крепость и чистый этанол. Пока ни капли в расчёте.
        </p>
      ) : (
        <ul className="drink-items">
          {entries.map((entry) => {
            const category = getCategory(entry.categoryId);
            const ethanol = entryEthanolMl(entry);
            const totalVolume = entryVolumeMl(entry);
            const isEditing = entry.id === editingId;

            return (
              <li
                key={entry.id}
                className={`drink-item${isEditing ? ' is-editing' : ''}`}
                style={{ '--item-accent': category.accent } as CSSProperties}
              >
                <span className="drink-emoji" aria-hidden="true">
                  {category.emoji}
                </span>

                <div className="drink-info">
                  <div className="drink-title-row">
                    <strong className="drink-name">{entry.name}</strong>
                    <span className="drink-category">{category.shortLabel}</span>
                  </div>
                  <p className="drink-meta">
                    <span>{formatNumber(entry.volumeMl)} мл</span>
                    <span aria-hidden="true">×</span>
                    <span>{formatNumber(entry.quantity)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatNumber(entry.strength)}%</span>
                    {entry.quantity !== 1 ? (
                      <span className="drink-meta-total">= {formatMl(totalVolume)}</span>
                    ) : null}
                  </p>
                </div>

                <div className="drink-alcohol">
                  <strong>{formatNumber(ethanol)}</strong>
                  <span>мл этанола</span>
                </div>

                <div className="drink-actions">
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => onEdit(entry)}
                    aria-label={`Изменить позицию «${entry.name}»`}
                    title="Изменить"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path
                        d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                      <path d="m13.5 6.5 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="icon-button icon-button-danger"
                    onClick={() => onDelete(entry)}
                    aria-label={`Удалить позицию «${entry.name}»`}
                    title="Удалить"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path
                        d="M5 7h14M9 7V5h6v2m-8 0 1 13h8l1-13M10 11v5m4-5v5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
