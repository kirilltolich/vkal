import { describe, expect, it } from 'vitest';
import type { BloodDraft, DrinkEntry, FoodLevel, FoodTiming } from '../types';
import {
  applyCurrentTime,
  computeBloodAlcohol,
  createDefaultBloodDraft,
  distributionFactor,
  formatClockMinutes,
  parseClockTime,
  scheduleDrinks,
  validateBloodDraft,
  type BacResult,
} from './bac';

const NOW = new Date('2026-10-26T23:00:00');
const ALL_FOOD_LEVELS: FoodLevel[] = ['none', 'light', 'normal', 'heavy'];
const ALL_FOOD_TIMINGS: FoodTiming[] = ['before', 'during', 'after'];

function draft(patch: Partial<BloodDraft> = {}): BloodDraft {
  return { ...createDefaultBloodDraft(NOW), ...patch };
}

function drink(patch: Partial<DrinkEntry> = {}): DrinkEntry {
  return {
    id: 'drink',
    categoryId: 'vodka',
    name: 'Водка',
    volumeMl: 100,
    strength: 40,
    quantity: 1,
    ...patch,
  };
}

/** Полный путь: валидация полей → расчёт. Падает, если модель не дала результат. */
function run(entries: DrinkEntry[], input: BloodDraft, now: Date = NOW): BacResult {
  const validation = validateBloodDraft(input, now);
  if (!validation.ok) {
    throw new Error(`Неожиданные ошибки валидации: ${JSON.stringify(validation.errors)}`);
  }
  const result = computeBloodAlcohol({
    entries,
    profile: validation.profile,
    window: validation.window,
    now,
  });
  if (!result) throw new Error('Модель не вернула результат');
  return result;
}

function errorsOf(input: BloodDraft, now: Date = NOW) {
  const validation = validateBloodDraft(input, now);
  expect(validation.ok).toBe(false);
  if (validation.ok) throw new Error('Ожидались ошибки');
  return validation.errors;
}

function expectAllFinite(result: BacResult) {
  expect(Number.isFinite(result.currentPerMille)).toBe(true);
  expect(Number.isFinite(result.peakPerMille)).toBe(true);
  expect(Number.isFinite(result.ethanolMassG)).toBe(true);
  expect(Number.isFinite(result.volumeOfDistributionL)).toBe(true);
  expect(Number.isFinite(result.uncertainty.currentPerMilleMin)).toBe(true);
  expect(Number.isFinite(result.uncertainty.currentPerMilleMax)).toBe(true);
  result.curve.forEach((point) => {
    expect(Number.isFinite(point.perMille)).toBe(true);
    expect(point.perMille).toBeGreaterThanOrEqual(0);
  });
}

describe('parseClockTime и formatClockMinutes', () => {
  it('разбирает время с ведущим нулём и без', () => {
    expect(parseClockTime('9:05')).toBe(545);
    expect(parseClockTime('20:30')).toBe(1230);
    expect(parseClockTime('00:00')).toBe(0);
    expect(parseClockTime(' 23:59 ')).toBe(1439);
  });

  it('отклоняет невозможное время и мусор', () => {
    expect(parseClockTime('24:00')).toBeNull();
    expect(parseClockTime('20:60')).toBeNull();
    expect(parseClockTime('20')).toBeNull();
    expect(parseClockTime('')).toBeNull();
    expect(parseClockTime('вечером')).toBeNull();
  });

  it('форматирует минуты по кругу суток', () => {
    expect(formatClockMinutes(0)).toBe('00:00');
    expect(formatClockMinutes(1439)).toBe('23:59');
    expect(formatClockMinutes(1470)).toBe('00:30');
    expect(formatClockMinutes(-30)).toBe('23:30');
  });

  it('applyCurrentTime ставит текущее время концом и не ломает начало', () => {
    const updated = applyCurrentTime(draft({ startTime: '20:00', endTime: '21:00' }), NOW);
    expect(updated.endTime).toBe('23:00');
    expect(updated.startTime).toBe('20:00');

    const overnight = applyCurrentTime(draft({ startTime: '23:30', endTime: '23:40' }), NOW);
    expect(overnight.endTime).toBe('23:00');
    expect(overnight.startTime).toBe('21:00');
  });
});

describe('валидация полей блока крови', () => {
  it('принимает значения по умолчанию', () => {
    const validation = validateBloodDraft(draft(), NOW);
    expect(validation.ok).toBe(true);
    if (!validation.ok) return;
    expect(validation.profile.weightKg).toBe(70);
    expect(validation.profile.heightCm).toBeNull();
    expect(validation.window.durationMinutes).toBe(60);
    expect(validation.window.nowOffsetMinutes).toBe(120);
  });

  it('требует вес и отклоняет невозможные значения', () => {
    expect(errorsOf(draft({ weight: '' })).weight).toBeDefined();
    expect(errorsOf(draft({ weight: '0' })).weight).toContain('минимум');
    expect(errorsOf(draft({ weight: '-5' })).weight).toBeDefined();
    expect(errorsOf(draft({ weight: '10' })).weight).toContain('минимум 30');
    expect(errorsOf(draft({ weight: '400' })).weight).toContain('Максимум');
    expect(errorsOf(draft({ weight: 'семьдесят' })).weight).toBeDefined();
  });

  it('вес с запятой превращается в число', () => {
    const validation = validateBloodDraft(draft({ weight: '82,5' }), NOW);
    expect(validation.ok).toBe(true);
    if (validation.ok) expect(validation.profile.weightKg).toBe(82.5);
  });

  it('рост необязателен, но проверяется по диапазону', () => {
    expect(validateBloodDraft(draft({ height: '' }), NOW).ok).toBe(true);
    expect(errorsOf(draft({ height: '250' })).height).toContain('120–230');
    expect(errorsOf(draft({ height: '90' })).height).toContain('120–230');
    expect(errorsOf(draft({ height: 'высокий' })).height).toBeDefined();
  });

  it('проверяет время начала и конца', () => {
    expect(errorsOf(draft({ startTime: '' })).startTime).toBeDefined();
    expect(errorsOf(draft({ startTime: '25:00' })).startTime).toBeDefined();
    expect(errorsOf(draft({ endTime: '26:00' })).endTime).toBeDefined();
    expect(errorsOf(draft({ endTime: '07:00' })).endTime).toContain('будущем');
  });

  it('терпит пять минут расхождения системных часов', () => {
    const validation = validateBloodDraft(draft({ endTime: '23:03' }), NOW);
    expect(validation.ok).toBe(true);
  });

  it('не пропускает интервал длиннее суток', () => {
    // 22:30 → 23:00 следующего дня: конец уходит в будущее, ловим на конце.
    const errors = errorsOf(draft({ startTime: '22:30', endTime: '23:30' }));
    expect(errors.endTime).toBeDefined();
  });

  it('считает смещение еды для всех вариантов', () => {
    const before = validateBloodDraft(
      draft({ foodLevel: 'normal', foodTiming: 'before', foodOffset: '90' }),
      NOW,
    );
    expect(before.ok).toBe(true);
    if (before.ok) expect(before.window.mealOffsetMinutes).toBe(-90);

    const during = validateBloodDraft(
      draft({ foodLevel: 'normal', foodTiming: 'during', foodOffset: '45' }),
      NOW,
    );
    expect(during.ok).toBe(true);
    if (during.ok) expect(during.window.mealOffsetMinutes).toBe(45);

    const after = validateBloodDraft(
      draft({ foodLevel: 'light', foodTiming: 'after', foodOffset: '30' }),
      NOW,
    );
    expect(after.ok).toBe(true);
    if (after.ok) expect(after.window.mealOffsetMinutes).toBe(60 + 30);
  });

  it('без еды смещение не применяется', () => {
    const validation = validateBloodDraft(
      draft({ foodLevel: 'none', foodTiming: 'after', foodOffset: '30' }),
      NOW,
    );
    expect(validation.ok).toBe(true);
    if (validation.ok) expect(validation.window.mealOffsetMinutes).toBeNull();
  });

  it('подставляет минуты еды по умолчанию и ловит мусор', () => {
    const fallback = validateBloodDraft(
      draft({ foodLevel: 'heavy', foodTiming: 'during', foodOffset: '' }),
      NOW,
    );
    expect(fallback.ok).toBe(true);
    if (fallback.ok) expect(fallback.window.mealOffsetMinutes).toBe(45);

    expect(errorsOf(draft({ foodLevel: 'heavy', foodOffset: 'полтора часа' })).foodOffset)
      .toBeDefined();
    expect(errorsOf(draft({ foodLevel: 'heavy', foodOffset: '2000' })).foodOffset)
      .toBeDefined();
  });

  it('работает через полночь', () => {
    const midnight = new Date('2026-10-27T01:00:00');
    const validation = validateBloodDraft(
      draft({ startTime: '22:00', endTime: '00:30' }),
      midnight,
    );
    expect(validation.ok).toBe(true);
    if (!validation.ok) return;
    expect(validation.window.durationMinutes).toBe(150);
    expect(validation.window.nowOffsetMinutes).toBe(180);
  });
});

describe('объём распределения', () => {
  it('без роста берёт классические коэффициенты Видмарка', () => {
    const male = distributionFactor('male', 80, null);
    expect(male.heightUsed).toBe(false);
    expect(male.factor).toBe(0.68);
    expect(male.volumeL).toBeCloseTo(54.4, 10);

    const female = distributionFactor('female', 60, null);
    expect(female.factor).toBe(0.55);
    expect(female.volumeL).toBeCloseTo(33, 10);
  });

  it('по росту считает общую воду тела и остаётся в разумных рамках', () => {
    const male = distributionFactor('male', 80, 180);
    expect(male.heightUsed).toBe(true);
    expect(male.factor).toBeGreaterThan(0.6);
    expect(male.factor).toBeLessThan(0.8);
    expect(male.volumeL).toBeCloseTo(male.factor * 80, 10);

    const female = distributionFactor('female', 60, 165);
    expect(female.heightUsed).toBe(true);
    expect(female.factor).toBeGreaterThan(0.5);
    expect(female.factor).toBeLessThan(0.68);
  });

  it('не выдаёт абсурдный коэффициент для крайних значений', () => {
    const extreme = distributionFactor('male', 250, 230);
    expect(extreme.factor).toBeLessThanOrEqual(0.85);
    expect(extreme.factor).toBeGreaterThanOrEqual(0.45);
    expect(Number.isFinite(extreme.volumeL)).toBe(true);
  });
});

describe('расписание напитков', () => {
  it('без интервала всё выпито в начале', () => {
    expect(scheduleDrinks([drink()], 0)[0]?.minutes).toBe(0);
  });

  it('один напиток с интервалом считается последним', () => {
    expect(scheduleDrinks([drink()], 180)[0]?.minutes).toBe(180);
  });

  it('несколько напитков раскладываются равномерно от начала до конца', () => {
    const entries = [drink({ id: 'a' }), drink({ id: 'b' }), drink({ id: 'c' })];
    const scheduled = scheduleDrinks(entries, 240);
    expect(scheduled.map((item) => item.minutes)).toEqual([0, 120, 240]);
    expect(scheduled.every((item) => item.ethanolMl === 40)).toBe(true);
  });
});

describe('модель концентрации', () => {
  it('Тест A: 100 мл водки 40% у мужчины 80 кг не появляется в крови мгновенно', () => {
    const input = draft({ sex: 'male', weight: '80', startTime: '22:00', endTime: '' });
    const instant = 31.56 / 54.4; // что было бы, если бы доза всосалась целиком
    const atStart = run([drink()], input, new Date('2026-10-26T22:00:00'));
    expect(atStart.currentPerMille).toBe(0);

    const afterTwoMinutes = run([drink()], input, new Date('2026-10-26T22:02:00'));
    expect(afterTwoMinutes.currentPerMille).toBeGreaterThan(0);
    expect(afterTwoMinutes.currentPerMille).toBeLessThan(instant * 0.2);
  });

  it('Тест B: пик приходит примерно через час и включает всасывание и выведение', () => {
    const input = draft({ sex: 'male', weight: '80', startTime: '22:00', endTime: '' });
    const result = run([drink()], input, new Date('2026-10-26T23:00:00'));

    expect(result.ethanolMassG).toBeCloseTo(31.56, 2);
    expect(result.volumeOfDistributionL).toBeCloseTo(54.4, 6);
    expect(result.peakPerMille).toBeGreaterThan(0.35);
    expect(result.peakPerMille).toBeLessThan(0.55);
    expect(result.peakMinutes).toBeGreaterThan(30);
    expect(result.peakMinutes).toBeLessThan(75);
    expect(result.currentPerMille).toBeGreaterThan(0.3);
    expect(result.currentPerMille).toBeLessThanOrEqual(result.peakPerMille);
  });

  it('Тест C: та же доза у женщины 60 кг даёт заметно больше', () => {
    const base = { startTime: '22:00', endTime: '' } as const;
    const male = run([drink()], draft({ sex: 'male', weight: '80', ...base }), NOW);
    const female = run([drink()], draft({ sex: 'female', weight: '60', ...base }), NOW);
    expect(female.currentPerMille).toBeGreaterThan(male.currentPerMille * 1.5);
  });

  it('Тест D: кривая не уходит в минус и возвращается к нулю', () => {
    const input = draft({ startTime: '18:00', endTime: '' });
    const drinkingAt18 = new Date('2026-10-26T18:00:00');
    const result = run([drink()], input, new Date('2026-10-27T02:00:00'));

    expect(result.zeroMinutes).not.toBeNull();
    expect(result.zeroMinutes as number).toBeGreaterThan(200);
    expect(result.zeroMinutes as number).toBeLessThan(600);
    expect(result.zeroAt?.getTime()).toBe(drinkingAt18.getTime() + (result.zeroMinutes as number) * 60_000);
    expect(result.phase).toBe('sober');
    expect(result.alreadySober).toBe(true);
    expect(result.currentPerMille).toBeLessThan(0.01);
    result.curve.forEach((point) => expect(point.perMille).toBeGreaterThanOrEqual(0));
  });

  it('Тест E: растущая стадия определяется до пика', () => {
    const input = draft({ startTime: '22:00', endTime: '' });
    const result = run([drink()], input, new Date('2026-10-26T22:10:00'));
    expect(result.phase).toBe('rising');
    expect(result.peakInFuture).toBe(true);
    expect(result.currentPerMille).toBeGreaterThan(0);
    expect(result.currentPerMille).toBeLessThan(result.peakPerMille);
  });

  it('Тест F: диапазон накрывает центральную оценку и остаётся вменяемым', () => {
    const result = run([drink()], draft({ startTime: '21:00', endTime: '22:00' }), NOW);
    const { uncertainty } = result;
    expect(uncertainty.currentPerMilleMin).toBeLessThanOrEqual(result.currentPerMille);
    expect(uncertainty.currentPerMilleMax).toBeGreaterThanOrEqual(result.currentPerMille);
    expect(uncertainty.peakPerMilleMin).toBeLessThanOrEqual(result.peakPerMille);
    expect(uncertainty.peakPerMilleMax).toBeGreaterThanOrEqual(result.peakPerMille);
    expect(uncertainty.currentPerMilleMax - uncertainty.currentPerMilleMin).toBeLessThan(1.5);
    expect(uncertainty.zeroMinutesMin).not.toBeNull();
    expect(uncertainty.zeroMinutesMax).not.toBeNull();
    expect(uncertainty.zeroMinutesMin as number).toBeLessThanOrEqual(uncertainty.zeroMinutesMax as number);
  });

  it('Тест G: вечер на шесть кружек остаётся конечным и правдоподобным', () => {
    const entries = Array.from({ length: 6 }, (_, index) =>
      drink({ id: `beer-${index}`, categoryId: 'beer', name: 'Пиво', volumeMl: 500, strength: 5 }),
    );
    const result = run(
      entries,
      draft({ sex: 'male', weight: '85', startTime: '18:00', endTime: '22:00' }),
      new Date('2026-10-26T23:30:00'),
    );

    expect(result.ethanolMassG).toBeCloseTo(6 * 25 * 0.789, 6);
    expectAllFinite(result);
    expect(result.peakPerMille).toBeGreaterThan(0.6);
    expect(result.peakPerMille).toBeLessThan(2.2);
    expect(result.phase).toBe('falling');
    expect(result.drinks.map((item) => item.minutes)).toEqual([0, 48, 96, 144, 192, 240]);
  });

  it('Тест H: две позиции подряд в конце вечера дают рост после последнего напитка', () => {
    const entries = [
      drink({ id: 'wine', categoryId: 'wine', name: 'Вино', volumeMl: 200, strength: 12 }),
      drink({ id: 'wine2', categoryId: 'wine', name: 'Вино', volumeMl: 200, strength: 12 }),
    ];
    const input = draft({ sex: 'female', weight: '58', startTime: '21:00', endTime: '22:30' });
    const atEnd = run(entries, input, new Date('2026-10-26T22:30:00'));
    const later = run(entries, input, new Date('2026-10-26T23:00:00'));

    expect(later.currentPerMille).toBeGreaterThan(atEnd.currentPerMille);
    expectAllFinite(atEnd);
    expectAllFinite(later);
  });

  it('Тест I: очень маленькая доза не превращается в NaN и не уходит в минус', () => {
    const tiny = drink({ categoryId: 'beer', name: 'Пиво', volumeMl: 30, strength: 5 });
    const result = run([tiny], draft({ startTime: '22:00', endTime: '' }), NOW);
    expectAllFinite(result);
    expect(result.currentPerMille).toBeGreaterThanOrEqual(0);
    expect(result.currentPerMille).toBeLessThan(0.1);
  });

  it('Тест J: сразу после первого глотка стадия — рост, а не «уже трезв»', () => {
    const input = draft({ sex: 'male', weight: '80', startTime: '22:00', endTime: '22:00' });
    const result = run([drink()], input, new Date('2026-10-26T22:00:00'));
    expect(result.currentPerMille).toBeLessThan(0.01);
    expect(result.phase).toBe('rising');
    expect(result.peakInFuture).toBe(true);
    expect(result.peakPerMille).toBeGreaterThan(0.3);
  });

  it('Тест K: если даже пик ниже условного порога, стадия — «ниже порога»', () => {
    const tiny = drink({ categoryId: 'beer', volumeMl: 20, strength: 2 });
    const input = draft({ sex: 'male', weight: '80', startTime: '22:00', endTime: '22:00' });
    const result = run([tiny], input, new Date('2026-10-26T22:30:00'));
    expect(result.peakPerMille).toBeLessThan(0.01);
    expect(result.phase).toBe('sober');
    expect(result.alreadySober).toBe(true);
  });

  it('возвращает null без напитков', () => {
    const validation = validateBloodDraft(draft(), NOW);
    if (!validation.ok) throw new Error('ожидались валидные поля');
    const result = computeBloodAlcohol({
      entries: [],
      profile: validation.profile,
      window: validation.window,
      now: NOW,
    });
    expect(result).toBeNull();
  });

  it('график получает несколько точек и обрезается по времени', () => {
    const result = run([drink()], draft({ startTime: '21:00', endTime: '22:00' }), NOW);
    expect(result.curve.length).toBeGreaterThan(10);
    expect(result.curve[0]?.minutes).toBe(0);
    const last = result.curve[result.curve.length - 1];
    expect(last?.minutes).toBeLessThanOrEqual(result.chartEndMinutes);
    expect(last?.minutes).toBeGreaterThan(result.nowMinutes);
    // Точки идут по возрастанию и с шагом не больше пяти минут.
    result.curve.forEach((point, index) => {
      if (index === 0) return;
      const previous = result.curve[index - 1];
      expect(point.minutes).toBeGreaterThan(previous?.minutes ?? -1);
      expect(point.minutes - (previous?.minutes ?? 0)).toBeLessThanOrEqual(5);
    });
  });
});

describe('еда в модели', () => {
  const base = { sex: 'male', weight: '80', startTime: '20:00', endTime: '22:00' } as const;
  const entries = [
    drink({ id: 'a', categoryId: 'beer', name: 'Пиво', volumeMl: 500, strength: 5 }),
    drink({ id: 'b', categoryId: 'beer', name: 'Пиво', volumeMl: 500, strength: 5 }),
    drink({ id: 'c', categoryId: 'beer', name: 'Пиво', volumeMl: 500, strength: 5 }),
  ];
  const afterDrinking = new Date('2026-10-26T23:30:00');

  it('еда до алкоголя снижает и отодвигает пик', () => {
    const hungry = run(entries, draft({ ...base, foodLevel: 'none' }), afterDrinking);
    const fed = run(
      entries,
      draft({ ...base, foodLevel: 'heavy', foodTiming: 'before', foodOffset: '60' }),
      afterDrinking,
    );

    expect(fed.peakPerMille).toBeLessThan(hungry.peakPerMille);
    expect(fed.peakMinutes).toBeGreaterThan(hungry.peakMinutes);
    expect(fed.absorptionFactor).toBeLessThan(1);
  });

  it('закуска не отменяет алкоголь: та же масса этанола', () => {
    const hungry = run(entries, draft({ ...base, foodLevel: 'none' }), afterDrinking);
    const fed = run(entries, draft({ ...base, foodLevel: 'normal' }), afterDrinking);
    expect(fed.ethanolMassG).toBeCloseTo(hungry.ethanolMassG, 10);
  });

  it('еда после алкоголя не вычитает уже всосавшееся', () => {
    const mealAt = new Date('2026-10-26T20:30:00');
    const hungry = run([drink()], draft({ startTime: '20:00', endTime: '', foodLevel: 'none' }), mealAt);
    const withFood = run(
      [drink()],
      draft({
        startTime: '20:00',
        endTime: '',
        foodLevel: 'heavy',
        foodTiming: 'after',
        foodOffset: '30',
      }),
      mealAt,
    );

    // К моменту еды алкоголь уже всосался: модель обязана совпасть.
    expect(withFood.currentPerMille).toBeCloseTo(hungry.currentPerMille, 9);

    const later = new Date('2026-10-26T21:00:00');
    const hungryLater = run([drink()], draft({ startTime: '20:00', endTime: '', foodLevel: 'none' }), later);
    const foodLater = run(
      [drink()],
      draft({
        startTime: '20:00',
        endTime: '',
        foodLevel: 'heavy',
        foodTiming: 'after',
        foodOffset: '30',
      }),
      later,
    );
    // А после еды всасывание замедляется: остаток ещё в желудке.
    expect(foodLater.currentPerMille).toBeLessThan(hungryLater.currentPerMille);
    expect(foodLater.currentPerMille).toBeGreaterThan(0);
  });

  it('все уровни еды и все варианты времени дают конечные числа', () => {
    for (const foodLevel of ALL_FOOD_LEVELS) {
      for (const foodTiming of ALL_FOOD_TIMINGS) {
        const result = run(
          entries,
          draft({ ...base, foodLevel, foodTiming, foodOffset: '60' }),
          afterDrinking,
        );
        expectAllFinite(result);
        expect(result.currentPerMille).toBeGreaterThanOrEqual(0);
        expect(result.peakPerMille).toBeGreaterThan(0);
      }
    }
  });
});

describe('рост в модели', () => {
  it('уточняет объём распределения, но не ломает результат', () => {
    const withoutHeight = run(
      [drink()],
      draft({ sex: 'male', weight: '80', height: '', startTime: '21:00', endTime: '' }),
      NOW,
    );
    const withHeight = run(
      [drink()],
      draft({ sex: 'male', weight: '80', height: '185', startTime: '21:00', endTime: '' }),
      NOW,
    );

    expect(withoutHeight.heightUsed).toBe(false);
    expect(withHeight.heightUsed).toBe(true);
    expect(withHeight.distributionFactor).not.toBe(withoutHeight.distributionFactor);
    expectAllFinite(withHeight);
    // Обе оценки обязаны быть одного порядка: это одна модель с уточнением.
    expect(withHeight.currentPerMille).toBeGreaterThan(withoutHeight.currentPerMille * 0.5);
    expect(withHeight.currentPerMille).toBeLessThan(withoutHeight.currentPerMille * 1.5);
  });
});
