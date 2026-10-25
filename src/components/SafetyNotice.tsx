export function SafetyNotice() {
  return (
    <aside className="safety-notice" role="alert" aria-labelledby="safety-title">
      <span className="safety-icon" aria-hidden="true">
        ⚠️
      </span>
      <div className="safety-copy">
        <h3 id="safety-title">Стоп. Это уже серьёзное количество.</h3>
        <p>
          Не продолжай пить и не садись за руль. Не оставляй человека одного:
          если ему плохо, нужна помощь трезвого взрослого, а не «ещё одна».
        </p>
        <p className="safety-emergency">
          При потере сознания, нарушении дыхания, судорогах или если человек не
          просыпается — <strong>немедленно звони 112 или 103</strong> и оставайся
          рядом до приезда скорой.
        </p>
      </div>
    </aside>
  );
}
