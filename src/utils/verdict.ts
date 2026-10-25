import {
  NEUTRAL_VERDICT,
  VERDICT_LEVELS,
  VERDICT_LEVEL_MAP,
  VERDICT_RULES,
  type VerdictLevel,
  type VerdictLevelId,
} from '../data/verdicts';

export interface ResolvedVerdict {
  levelId: VerdictLevelId | null;
  name: string;
  tagline: string;
  emoji: string;
  accent: string;
  phrase: string;
  extra: string;
  /** Номер условного уровня 1–7 или null для нейтрального результата. */
  displayIndex: number | null;
}

/**
 * Находит условный уровень по количеству этанола.
 * Возвращает null для пустого/некорректного количества и для диапазонов,
 * которым правило не задано, — тогда показывается нейтральный результат.
 */
export function matchLevel(ethanolMl: number): VerdictLevel | null {
  if (!Number.isFinite(ethanolMl) || ethanolMl <= 0) return null;

  const matchedRule = [...VERDICT_RULES]
    .sort((a, b) => b.minEthanolMl - a.minEthanolMl)
    .find((rule) => ethanolMl >= rule.minEthanolMl);

  if (!matchedRule) return null;
  return VERDICT_LEVEL_MAP[matchedRule.levelId] ?? null;
}

function rotate<T>(items: readonly T[], index: number): T {
  return items[((index % items.length) + items.length) % items.length] as T;
}

/**
 * Выбирает фразу и комментарий. seed — счётчик нажатий «НУ И ЧЁ ТЫ НАХУЯРИЛ?»:
 * каждая новая попытка сдвигает фразу, поэтому одна и та же не залипает.
 */
export function resolveVerdict(ethanolMl: number, seed = 0): ResolvedVerdict {
  const level = matchLevel(ethanolMl);

  if (!level) {
    return {
      levelId: null,
      name: NEUTRAL_VERDICT.name,
      tagline: NEUTRAL_VERDICT.tagline,
      emoji: NEUTRAL_VERDICT.emoji,
      accent: NEUTRAL_VERDICT.accent,
      phrase: rotate(NEUTRAL_VERDICT.phrases, seed),
      extra: rotate(NEUTRAL_VERDICT.extras, seed),
      displayIndex: null,
    };
  }

  const levelPosition = VERDICT_LEVELS.findIndex((item) => item.id === level.id);

  return {
    levelId: level.id,
    name: level.name,
    tagline: level.tagline,
    emoji: level.emoji,
    accent: level.accent,
    phrase: rotate(level.phrases, seed + Math.max(levelPosition, 0)),
    extra: rotate(level.extras, seed + levelPosition),
    displayIndex: levelPosition >= 0 ? levelPosition + 1 : null,
  };
}
