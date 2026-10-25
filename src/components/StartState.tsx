export function StartState() {
  return (
    <div className="start-state">
      <div className="start-state-icon" aria-hidden="true">
        <span>🧮</span>
      </div>
      <div className="start-state-copy">
        <h3>Список пока пустой. И это лучшая новость за вечер.</h3>
        <p>
          Добавь первый напиток в форме выше — пиво, водку, коктейль или что там
          у тебя в стакане. Дальше мы посчитаем чистый этанол, пересчитаем его
          в другой напиток и начнём честно над тобой шутить.
        </p>
        <p className="start-state-hint">
          ↓ Начни с «Пиво 500 мл · 5%» — форма уже заполнена. Останется нажать
          «Добавить в список».
        </p>
      </div>
    </div>
  );
}
