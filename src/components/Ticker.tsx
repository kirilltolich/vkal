const TICKER_ITEMS = [
  'считаем чистый этанол',
  'не ставим диагнозы',
  'жёстко шутим',
  'генерируем PNG',
  'не садимся за руль',
  '0,789 г/мл',
];

export function Ticker() {
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, index) => (
          <span className="ticker-item" key={`${item}-${index}`}>
            {item}
            <span className="ticker-star">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
