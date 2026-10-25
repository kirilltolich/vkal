export function Hero() {
  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow">
          <span className="pulse-dot" aria-hidden="true" />
          считаем этанол, а не твои чувства
        </p>
        <h1 className="hero-title" id="hero-title">
          <span className="hero-title-v">В</span>
          <span className="hero-title-main">ГОВНО</span>
        </h1>
        <p className="hero-lead">
          Сложи всё, что было выпито, — и получи честный объём чистого спирта,
          математический эквивалент и вердикт, который ты не просил.
        </p>
        <div className="hero-actions">
          <a className="button button-primary" href="#calculator">
            Начать расчёт <span aria-hidden="true">↓</span>
          </a>
          <p className="hero-note">
            Без регистрации. Всё считается в браузере и никуда не уходит.
          </p>
        </div>
        <ul className="hero-tags" aria-label="Что умеет приложение">
          <li>честная математика</li>
          <li>жёсткие вердикты</li>
          <li>мем-карточка PNG</li>
        </ul>
      </div>

      <div className="hero-art" aria-hidden="true">
        <div className="art-glow" />
        <div className="art-ring" />
        <div className="art-sticker art-sticker-density">
          <strong>0,789</strong>
          <span>г/мл</span>
          <small>плотность этанола</small>
        </div>
        <div className="art-sticker art-sticker-warning">
          <span>⚠</span> не диагноз
        </div>
        <div className="art-sticker art-sticker-share">PNG · 1080×1350</div>
        <div className="art-glass">
          <div className="art-liquid" />
          <div className="art-bubble art-bubble-1" />
          <div className="art-bubble art-bubble-2" />
          <div className="art-bubble art-bubble-3" />
        </div>
        <span className="art-star art-star-1">✦</span>
        <span className="art-star art-star-2">✦</span>
      </div>
    </section>
  );
}
