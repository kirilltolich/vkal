export function Header() {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="В ГОВНО — в начало страницы">
        <span className="brand-badge" aria-hidden="true">
          В
        </span>
        <span className="brand-text">
          ГОВНО<span className="brand-dot">.</span>
        </span>
      </a>
      <div className="header-side">
        <span className="header-caption">калькулятор этанола</span>
        <span className="age-badge">18+</span>
      </div>
    </header>
  );
}
