import { describe, expect, it } from 'vitest';
import {
  NEUTRAL_VERDICT,
  SAFETY_WARNING_FROM_ML,
  VERDICT_LEVELS,
  VERDICT_RULES,
} from '../data/verdicts';
import { matchLevel, resolveVerdict } from './verdict';

describe('условные уровни', () => {
  it('сохраняет все авторские названия, включая абсурдное последнее', () => {
    expect(VERDICT_LEVELS.map((level) => level.name)).toEqual([
      'Детское опьянение',
      'Под шафе',
      'Виртуозно пьян',
      'Предсопличное состояние',
      'В сопли',
      'Тебе не стрёмно так ходить, ёбаный рот?',
      'ЬЗСХЦЫФА ИА',
    ]);
  });

  it('в каждом уровне не меньше восьми уникальных фраз в рамках уровня', () => {
    for (const level of VERDICT_LEVELS) {
      expect(level.phrases.length).toBeGreaterThanOrEqual(8);
      expect(new Set(level.phrases).size).toBe(level.phrases.length);
      expect(level.extras.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('фразы не повторяются между уровнями', () => {
    const all = VERDICT_LEVELS.flatMap((level) => [...level.phrases]);
    expect(new Set(all).size).toBe(all.length);
  });

  it('пороги идут по возрастанию и начинаются с нуля', () => {
    const thresholds = VERDICT_RULES.map((rule) => rule.minEthanolMl);
    expect(thresholds[0]).toBe(0);
    expect([...thresholds].sort((a, b) => a - b)).toEqual(thresholds);
  });

  it('порог предупреждения не ниже последнего шуточного уровня', () => {
    expect(SAFETY_WARNING_FROM_ML).toBeGreaterThan(0);
    expect(SAFETY_WARNING_FROM_ML).toBeLessThanOrEqual(260);
  });
});

describe('matchLevel', () => {
  it('Тест 2: 40 мл этанола попадают в «Виртуозно пьян»', () => {
    expect(matchLevel(40)?.name).toBe('Виртуозно пьян');
  });

  it('сопоставляет границы диапазонов', () => {
    expect(matchLevel(0.1)?.id).toBe('children');
    expect(matchLevel(15)?.id).toBe('tipsy');
    expect(matchLevel(39.99)?.id).toBe('tipsy');
    expect(matchLevel(75)?.id).toBe('pre-snot');
    expect(matchLevel(110)?.id).toBe('in-snot');
    expect(matchLevel(170)?.id).toBe('shame');
    expect(matchLevel(260)?.id).toBe('yzshchtsyfa');
    expect(matchLevel(9999)?.id).toBe('yzshchtsyfa');
  });

  it('Тест 8: пустое и некорректное количество не даёт уровень', () => {
    expect(matchLevel(0)).toBeNull();
    expect(matchLevel(-10)).toBeNull();
    expect(matchLevel(Number.NaN)).toBeNull();
  });
});

describe('resolveVerdict', () => {
  it('возвращает нейтральный результат, если уровня нет', () => {
    const verdict = resolveVerdict(0, 0);
    expect(verdict.levelId).toBeNull();
    expect(verdict.name).toBe(NEUTRAL_VERDICT.name);
    expect(NEUTRAL_VERDICT.phrases).toContain(verdict.phrase);
    expect(verdict.displayIndex).toBeNull();
  });

  it('меняет фразу при повторном нажатии и не залипает', () => {
    const first = resolveVerdict(50, 0);
    const level = VERDICT_LEVELS.find((item) => item.id === first.levelId);
    expect(level).toBeDefined();
    if (!level) return;

    const phrases = new Set<string>();
    for (let seed = 0; seed < level.phrases.length; seed += 1) {
      const current = resolveVerdict(50, seed);
      expect(current.phrase).not.toBe('');
      phrases.add(current.phrase);
    }

    expect(phrases.size).toBe(level.phrases.length);
    expect(first.phrase).not.toBe(resolveVerdict(50, 1).phrase);
  });

  it('возвращает номер уровня и акцент', () => {
    const verdict = resolveVerdict(120, 0);
    expect(verdict.displayIndex).toBe(5);
    expect(verdict.levelId).toBe('in-snot');
    expect(verdict.accent).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('держит одинаковую фразу внутри одного уровня при смене цифр', () => {
    const a = resolveVerdict(45, 3);
    const b = resolveVerdict(60, 3);
    expect(a.phrase).toBe(b.phrase);
    expect(a.levelId).toBe(b.levelId);
  });
});
