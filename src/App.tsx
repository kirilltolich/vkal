import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BloodPanel } from './components/BloodPanel';
import { BloodResult } from './components/BloodResult';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Converter } from './components/Converter';
import { DrinkForm } from './components/DrinkForm';
import { DrinkList } from './components/DrinkList';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { MemeCardModal } from './components/MemeCardModal';
import { SafetyNotice } from './components/SafetyNotice';
import { SectionHeading } from './components/SectionHeading';
import { StartState } from './components/StartState';
import { Summary } from './components/Summary';
import { Ticker } from './components/Ticker';
import { ToastStack } from './components/ToastStack';
import { VerdictCard } from './components/VerdictCard';
import { MAX_ENTRIES, getCategory } from './data/drinks';
import { SAFETY_WARNING_FROM_ML } from './data/verdicts';
import type {
  BloodDraft,
  DrinkCategoryId,
  DrinkDraft,
  DrinkEntry,
  ToastMessage,
} from './types';
import { computeTotals, equivalentVolumeMl } from './utils/alcohol';
import { applyCurrentTime, computeBloodAlcohol, validateBloodDraft } from './utils/bac';
import type { MemeCardData } from './utils/memeImage';
import { createEntryId, loadState, saveState } from './utils/storage';
import { validateStrength } from './utils/validation';
import { matchLevel, resolveVerdict } from './utils/verdict';

export default function App() {
  const [initialState] = useState(loadState);
  const [entries, setEntries] = useState<DrinkEntry[]>(initialState.entries);
  const [bloodDraft, setBloodDraft] = useState<BloodDraft>(initialState.blood);
  const [bloodRevealed, setBloodRevealed] = useState(false);
  const [bloodSeed, setBloodSeed] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [equivalentCategoryId, setEquivalentCategoryId] = useState<DrinkCategoryId>(
    initialState.equivalentCategoryId,
  );
  const [equivalentStrength, setEquivalentStrength] = useState(initialState.equivalentStrength);
  const [revealed, setRevealed] = useState(false);
  const [seed, setSeed] = useState(0);
  const [memeOpen, setMemeOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [scrollTick, setScrollTick] = useState(0);

  const resultRef = useRef<HTMLElement>(null);

  const notify = useCallback((text: string, tone: ToastMessage['tone'] = 'info') => {
    const id = createEntryId();
    setToasts((previous) => [...previous.slice(-3), { id, text, tone }]);
    window.setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== id));
    }, 4600);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    saveState({ entries, equivalentCategoryId, equivalentStrength, blood: bloodDraft });
  }, [entries, equivalentCategoryId, equivalentStrength, bloodDraft]);

  useEffect(() => {
    if (entries.length === 0) {
      setRevealed(false);
      setMemeOpen(false);
      setBloodRevealed(false);
    }
  }, [entries.length]);

  // Расчёт живёт вместе с системными часами: время идёт, кривая тоже.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (scrollTick === 0 || !revealed) return;
    resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [scrollTick, revealed]);

  const totals = useMemo(() => computeTotals(entries), [entries]);
  const editingEntry = editingId
    ? entries.find((entry) => entry.id === editingId) ?? null
    : null;
  const equivalentCategory = getCategory(equivalentCategoryId);
  const equivalentValidation = useMemo(
    () => validateStrength(equivalentStrength),
    [equivalentStrength],
  );
  const equivalentValue = equivalentValidation.value ?? null;
  const equivalentMl =
    equivalentValue === null ? null : equivalentVolumeMl(totals.ethanolMl, equivalentValue);

  const matchedLevel = matchLevel(totals.ethanolMl);
  const verdict = useMemo(
    () => resolveVerdict(totals.ethanolMl, seed),
    [totals.ethanolMl, seed],
  );
  const highIntake = totals.ethanolMl >= SAFETY_WARNING_FROM_ML;

  const bloodValidation = useMemo(() => validateBloodDraft(bloodDraft, now), [bloodDraft, now]);
  const bloodErrors = bloodValidation.ok ? {} : bloodValidation.errors;
  const bloodDuration = bloodValidation.ok ? bloodValidation.window.durationMinutes : null;
  const bloodResult = useMemo(() => {
    if (!bloodRevealed || !bloodValidation.ok || entries.length === 0) return null;
    return computeBloodAlcohol({
      entries,
      profile: bloodValidation.profile,
      window: bloodValidation.window,
      now,
    });
  }, [bloodRevealed, bloodValidation, entries, now]);

  const memeData = useMemo<MemeCardData | null>(() => {
    if (!revealed || entries.length === 0) return null;
    return {
      levelName: verdict.name,
      levelIndex: verdict.displayIndex,
      tagline: verdict.tagline,
      phrase: verdict.phrase,
      accent: verdict.accent,
      ethanolMl: totals.ethanolMl,
      ethanolMassG: totals.ethanolMassG,
      totalVolumeMl: totals.volumeMl,
      equivalentVolumeMl: equivalentMl,
      equivalentLabel: equivalentCategory.label,
      equivalentStrength: equivalentValue ?? 0,
      date: new Date(),
    };
  }, [
    revealed,
    entries.length,
    verdict,
    totals,
    equivalentMl,
    equivalentCategory.label,
    equivalentValue,
  ]);

  const handleAdd = (draft: DrinkDraft) => {
    if (entries.length >= MAX_ENTRIES) {
      notify('Список уже под завязку. Удали что-нибудь, чтобы добавить новое.', 'error');
      return;
    }
    setEntries((previous) => [...previous, { id: createEntryId(), ...draft }]);
    notify(`Добавлено: ${draft.name}`, 'success');
  };

  const handleUpdate = (id: string, draft: DrinkDraft) => {
    setEntries((previous) =>
      previous.map((entry) => (entry.id === id ? { ...entry, ...draft } : entry)),
    );
    setEditingId(null);
    notify(`Обновлено: ${draft.name}`, 'success');
  };

  const handleDelete = (entry: DrinkEntry) => {
    setEntries((previous) => previous.filter((item) => item.id !== entry.id));
    if (editingId === entry.id) setEditingId(null);
    notify(`Удалено: ${entry.name}`);
  };

  const handleClear = () => {
    setEntries([]);
    setEditingId(null);
    setRevealed(false);
    setClearOpen(false);
    notify('Список очищен. Математика снова не в курсе твоих планов.');
  };

  const handleCalculate = () => {
    if (entries.length === 0) {
      notify('Сначала добавь хотя бы один напиток.', 'error');
      return;
    }
    setSeed((previous) => previous + 1);
    setRevealed(true);
    setScrollTick((previous) => previous + 1);
  };

  const handleEquivalentCategory = (categoryId: DrinkCategoryId) => {
    setEquivalentCategoryId(categoryId);
    setEquivalentStrength(String(getCategory(categoryId).defaultStrength).replace('.', ','));
  };

  const handleBloodPatch = (patch: Partial<BloodDraft>) => {
    setBloodDraft((previous) => ({ ...previous, ...patch }));
  };

  const handleBloodUseNow = () => {
    const currentTime = new Date();
    setNow(currentTime);
    setBloodDraft((previous) => applyCurrentTime(previous, currentTime));
    notify('Время взято с системных часов устройства.', 'success');
  };

  const handleBloodCalculate = () => {
    if (entries.length === 0) {
      notify('Сначала добавь хотя бы один напиток в разделе 01.', 'error');
      return;
    }
    if (!bloodValidation.ok) {
      notify('Проверь поля блока крови: там есть ошибки.', 'error');
      return;
    }
    setNow(new Date());
    setBloodSeed((previous) => previous + 1);
    setBloodRevealed(true);
  };

  const closeMeme = useCallback(() => setMemeOpen(false), []);
  const cancelClear = useCallback(() => setClearOpen(false), []);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#calculator">
        Перейти к калькулятору
      </a>
      <div className="page-glow" aria-hidden="true" />

      <Header />

      <main>
        <Hero />
        <Ticker />

        <section className="section" id="calculator" aria-labelledby="calculator-title">
          <SectionHeading
            index="01"
            title="Что пьём"
            hint="Один напиток — одна позиция. Объём, крепость и количество можно менять в любой момент."
            id="calculator-title"
          />

          <div className="workspace">
            <DrinkForm
              editingEntry={editingEntry}
              limitReached={entries.length >= MAX_ENTRIES}
              onAdd={handleAdd}
              onUpdate={handleUpdate}
              onCancelEdit={() => setEditingId(null)}
            />
            <DrinkList
              entries={entries}
              editingId={editingId}
              onEdit={(entry) => setEditingId(entry.id)}
              onDelete={handleDelete}
              onClear={() => setClearOpen(true)}
            />
          </div>
        </section>

        <section className="section" aria-labelledby="totals-title">
          <SectionHeading
            index="02"
            title="Считаем чистый спирт"
            hint="Никаких «примерно» и таблиц из интернета: только объём, крепость и плотность этанола."
            id="totals-title"
          />

          {entries.length === 0 ? (
            <StartState />
          ) : (
            <>
              <div className="results-grid">
                <Summary totals={totals} />
                <Converter
                  ethanolMl={totals.ethanolMl}
                  categoryId={equivalentCategoryId}
                  strengthInput={equivalentStrength}
                  strengthValue={equivalentValue}
                  strengthError={equivalentValidation.error}
                  equivalentMl={equivalentMl}
                  onCategoryChange={handleEquivalentCategory}
                  onStrengthChange={setEquivalentStrength}
                />
              </div>

              {highIntake ? <SafetyNotice /> : null}

              <div className="calculate-bar">
                <div className="calculate-copy">
                  <span className="calculate-eyebrow">
                    {revealed ? 'вердикт уже есть' : 'математика готова'}
                  </span>
                  <p>
                    {revealed
                      ? 'Нажми ещё раз — фраза сменится, цифры останутся честными.'
                      : 'Цифры уже посчитаны. Осталось узнать, что они о тебе думают.'}
                  </p>
                </div>
                <div className="calculate-actions">
                  <button type="button" className="button button-calc" onClick={handleCalculate}>
                    НУ И ЧЁ ТЫ НАХУЯРИЛ? <span aria-hidden="true">→</span>
                  </button>
                  <p>Не оценка опьянения и не разрешение садиться за руль.</p>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="section blood-section" id="blood" aria-labelledby="blood-title">
          <SectionHeading
            index="03"
            title="А ЧЁ У МЕНЯ ТАМ ПО КРОВИ?"
            hint="Приблизительная оценка по модели Видмарка с задержкой всасывания: сколько этанола в крови прямо сейчас, куда идёт расчётная кривая и когда модель покажет ноль."
            id="blood-title"
          />

          <div className="blood-workspace">
            <BloodPanel
              draft={bloodDraft}
              errors={bloodErrors}
              now={now}
              durationMinutes={bloodDuration}
              entriesCount={entries.length}
              calculated={bloodResult !== null}
              onPatch={handleBloodPatch}
              onUseNow={handleBloodUseNow}
              onCalculate={handleBloodCalculate}
            />

            {bloodResult ? (
              <BloodResult result={bloodResult} seed={bloodSeed} />
            ) : (
              <div className="panel blood-placeholder">
                <span className="blood-placeholder-emoji" aria-hidden="true">
                  🩸
                </span>
                <div>
                  <h3>
                    {entries.length === 0 ? 'Сначала напитки' : 'Нажми кнопку — покажу сценарий'}
                  </h3>
                  <p>
                    {entries.length === 0
                      ? 'В списке пока пусто. Добавь напитки в разделе 01 — и модель посчитает, что там у тебя по крови.'
                      : 'Здесь появится расчётная концентрация в ‰, диапазон модели, стадия кривой, график на ближайшие часы и ориентировочное время до нуля. Это сценарий по модели, а не измерение.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {revealed && entries.length > 0 ? (
          <section
            className="section result-section"
            ref={resultRef}
            aria-labelledby="result-title"
          >
            <SectionHeading
              index="04"
              title="Твой вердикт"
              hint={
                matchedLevel
                  ? 'Условный уровень по количеству этанола. Не медицинская категория и не оценка состояния.'
                  : 'Для этого количества правило не задано — вот нейтральный результат.'
              }
              id="result-title"
            />

            <VerdictCard
              verdict={verdict}
              totals={totals}
              equivalentMl={equivalentMl}
              equivalentLabel={equivalentCategory.label}
              equivalentStrength={equivalentValue}
              onMeme={() => setMemeOpen(true)}
            />
          </section>
        ) : null}
      </main>

      <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-brand" aria-hidden="true">
            В ГОВНО<span>.</span>
          </div>
          <div>
            <p className="footer-disclaimer">
              Это развлекательный калькулятор количества этанола, а не измеритель
              опьянения. Расчёт не определяет концентрацию алкоголя в крови,
              способность управлять транспортом или безопасность состояния.
            </p>
            <p className="footer-emergency">
              При потере сознания, нарушении дыхания или судорогах — звони 112 или 103
              и не оставляй человека одного.
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>18+ · только для взрослых</span>
          <span>Локальный расчёт · без регистрации · без сервера</span>
        </div>
      </footer>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <ConfirmDialog
        open={clearOpen}
        title="Очистить весь список?"
        description="Все добавленные напитки исчезнут, результат и вердикт тоже. Отменить это будет нельзя."
        confirmLabel="Да, очистить"
        cancelLabel="Оставить"
        onConfirm={handleClear}
        onCancel={cancelClear}
      />

      <MemeCardModal
        open={memeOpen}
        data={memeData}
        onClose={closeMeme}
        notify={notify}
      />
    </div>
  );
}
