import {
  BLOOD_LIMITS,
  BLOOD_MODEL,
  DEFAULT_END_MINUTES_AGO,
  DEFAULT_START_MINUTES_AGO,
  DEFAULT_WEIGHT_KG,
  FOOD_LEVEL_MAP,
  FOOD_TIMING_MAP,
} from '../data/blood';
import type {
  BacPhase,
  BiologicalSex,
  BloodDraft,
  DrinkEntry,
  FoodLevel,
  FoodTiming,
} from '../types';
import { ETHANOL_DENSITY_G_PER_ML, entryEthanolMl } from './alcohol';
import { parseDecimal } from './validation';

/**
 * Модель ориентировочной концентрации алкоголя в крови.
 *
 * Модуль чистый: ни компонентов, ни DOM. Все допущения лежат рядом в
 * `data/blood.ts` и продублированы в интерфейсе под результатом.
 *
 * 1. Масса этанола: объём × крепость / 100 × порции × 0,789 г/мл.
 * 2. Всасывание: кинетика первого порядка из «желудка» (полувыведение ~12 мин,
 *    при еде медленнее). Алкоголь не появляется в крови мгновенно.
 * 3. Распределение: концентрация = масса в теле / объём распределения,
 *    объём = коэффициент Видмарка × масса тела (при известном росте коэффициент
 *    считается из общей воды тела по Hume–Weyers с поправкой на воду в крови).
 * 4. Выведение: примерно постоянная скорость 0,15 ‰/ч (в диапазоне 0,10–0,20),
 *    концентрация не уходит ниже нуля.
 * 5. Диапазон — разброс параметров модели, а не доверительный интервал.
 */

/* ============================================================
   Публичные типы
   ============================================================ */

/** Проверенные и приведённые к числам параметры человека. */
export interface BloodProfile {
  sex: BiologicalSex;
  weightKg: number;
  heightCm: number | null;
  startTime: string;
  endTime: string;
  foodLevel: FoodLevel;
  foodTiming: FoodTiming;
  foodOffsetMin: number;
}

export interface BloodErrors {
  weight?: string;
  height?: string;
  startTime?: string;
  endTime?: string;
  foodOffset?: string;
}

/** Окно употребления в абсолютном времени плюс смещения в минутах от старта. */
export interface ResolvedWindow {
  startAt: Date;
  endAt: Date;
  durationMinutes: number;
  /** Минуты от первого напитка до «сейчас» (всегда >= 0). */
  nowOffsetMinutes: number;
  /** Минуты от первого напитка до еды; null — еду не учитываем. */
  mealOffsetMinutes: number | null;
}

export type BloodValidation =
  | { ok: true; profile: BloodProfile; window: ResolvedWindow }
  | { ok: false; errors: BloodErrors };

export interface ScheduledDrink {
  id: string;
  name: string;
  ethanolMl: number;
  ethanolMassG: number;
  /** Минуты от первого напитка. */
  minutes: number;
}

export interface BacCurvePoint {
  minutes: number;
  perMille: number;
}

export interface BacUncertainty {
  currentPerMilleMin: number;
  currentPerMilleMax: number;
  peakPerMilleMin: number;
  peakPerMilleMax: number;
  zeroMinutesMin: number | null;
  zeroMinutesMax: number | null;
}

export interface BacResult {
  ethanolMl: number;
  ethanolMassG: number;
  /** Коэффициент Видмарка, использованный в центральной оценке. */
  distributionFactor: number;
  volumeOfDistributionL: number;
  heightUsed: boolean;
  bloodWaterFraction: number;
  currentPerMille: number;
  uncertainty: BacUncertainty;
  phase: BacPhase;
  peakPerMille: number;
  peakMinutes: number;
  peakAt: Date;
  peakInFuture: boolean;
  zeroMinutes: number | null;
  zeroAt: Date | null;
  zeroEarliestAt: Date | null;
  zeroLatestAt: Date | null;
  alreadySober: boolean;
  curve: BacCurvePoint[];
  /** Последняя минута, которую показывает график (уже обрезан для читаемости). */
  chartEndMinutes: number;
  nowMinutes: number;
  nowAt: Date;
  durationMinutes: number;
  startAt: Date;
  endAt: Date;
  mealMinutes: number | null;
  foodLevel: FoodLevel;
  absorptionFactor: number;
  foodWindowHours: number;
  drinks: ScheduledDrink[];
}

/* ============================================================
   Разбор времени
   ============================================================ */

/** «20:30» → 1230 минут от полуночи. null — если формат неверный. */
export function parseClockTime(raw: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Минуты от полуночи → «ЧЧ:ММ» (значения вне суток переносятся по кругу). */
export function formatClockMinutes(totalMinutes: number): string {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function clockOf(date: Date): string {
  return formatClockMinutes(date.getHours() * 60 + date.getMinutes());
}

function dateAt(now: Date, minutesOfDay: number): Date {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  return new Date(date.getTime() + minutesOfDay * 60_000);
}

/** Значения по умолчанию для блока крови: последний час — уже история. */
export function createDefaultBloodDraft(now: Date): BloodDraft {
  return {
    sex: 'male',
    weight: String(DEFAULT_WEIGHT_KG),
    height: '',
    startTime: clockOf(new Date(now.getTime() - DEFAULT_START_MINUTES_AGO * 60_000)),
    endTime: clockOf(new Date(now.getTime() - DEFAULT_END_MINUTES_AGO * 60_000)),
    foodLevel: 'none',
    foodTiming: 'before',
    foodOffset: String(FOOD_TIMING_MAP.before.defaultOffsetMin),
  };
}

/** Подставляет текущее время в поля начала и конца. */
export function applyCurrentTime(draft: BloodDraft, now: Date): BloodDraft {
  const endTime = clockOf(now);
  const endMinutes = parseClockTime(endTime) ?? 0;
  const startMinutes = parseClockTime(draft.startTime);
  const startTime =
    startMinutes !== null && startMinutes <= endMinutes
      ? draft.startTime
      : formatClockMinutes(endMinutes - DEFAULT_START_MINUTES_AGO);
  return { ...draft, startTime, endTime };
}

/* ============================================================
   Валидация
   ============================================================ */

const GRACE_MINUTES = 5;

function buildWindow(
  startMinutes: number,
  endMinutes: number | null,
  foodLevel: FoodLevel,
  foodTiming: FoodTiming,
  foodOffsetMinutes: number | null,
  now: Date,
) {
  let startAt = dateAt(now, startMinutes);
  // Если указанное время ещё не наступило, значит напиток был вчера.
  if (startAt.getTime() > now.getTime()) {
    startAt = new Date(startAt.getTime() - 86_400_000);
  }

  let endAt = endMinutes === null ? startAt : dateAt(now, endMinutes);
  if (endAt.getTime() < startAt.getTime()) {
    endAt = new Date(endAt.getTime() + 86_400_000);
  }

  if (endAt.getTime() > now.getTime()) {
    const aheadMinutes = (endAt.getTime() - now.getTime()) / 60_000;
    if (aheadMinutes <= GRACE_MINUTES) {
      endAt = new Date(now.getTime());
    } else {
      return { error: 'endTime' as const };
    }
  }

  const durationMinutes = Math.round((endAt.getTime() - startAt.getTime()) / 60_000);
  if (durationMinutes > BLOOD_LIMITS.maxWindowMinutes) {
    return { error: 'duration' as const };
  }

  const nowOffsetMinutes = (now.getTime() - startAt.getTime()) / 60_000;

  let mealOffsetMinutes: number | null = null;
  if (foodLevel !== 'none' && foodOffsetMinutes !== null) {
    if (foodTiming === 'before') mealOffsetMinutes = -foodOffsetMinutes;
    else if (foodTiming === 'during') mealOffsetMinutes = foodOffsetMinutes;
    else mealOffsetMinutes = durationMinutes + foodOffsetMinutes;
  }

  return {
    window: {
      startAt,
      endAt,
      durationMinutes,
      nowOffsetMinutes,
      mealOffsetMinutes,
    } satisfies ResolvedWindow,
  };
}

/** Полная проверка полей блока: возвращает либо ошибки, либо готовые параметры. */
export function validateBloodDraft(draft: BloodDraft, now: Date): BloodValidation {
  const errors: BloodErrors = {};

  const weight = parseDecimal(draft.weight);
  if (draft.weight.trim() === '') {
    errors.weight = 'Укажи вес — без него модель не работает.';
  } else if (weight === null) {
    errors.weight = 'Только число. Например 70 или 82,5.';
  } else if (weight < BLOOD_LIMITS.minWeightKg) {
    errors.weight = `Для этой модели минимум ${BLOOD_LIMITS.minWeightKg} кг.`;
  } else if (weight > BLOOD_LIMITS.maxWeightKg) {
    errors.weight = `Максимум ${BLOOD_LIMITS.maxWeightKg} кг.`;
  }

  let heightCm: number | null = null;
  if (draft.height.trim() !== '') {
    const height = parseDecimal(draft.height);
    if (height === null) {
      errors.height = 'Только число в сантиметрах. Например 175.';
    } else if (height < BLOOD_LIMITS.minHeightCm || height > BLOOD_LIMITS.maxHeightCm) {
      errors.height = `Рост в сантиметрах: ${BLOOD_LIMITS.minHeightCm}–${BLOOD_LIMITS.maxHeightCm}.`;
    } else {
      heightCm = height;
    }
  }

  const startMinutes = draft.startTime.trim() === '' ? null : parseClockTime(draft.startTime);
  if (startMinutes === null) {
    errors.startTime =
      draft.startTime.trim() === ''
        ? 'Укажи время первого напитка.'
        : 'Формат — ЧЧ:ММ, например 20:30.';
  }

  let endMinutes: number | null = null;
  if (draft.endTime.trim() !== '') {
    endMinutes = parseClockTime(draft.endTime);
    if (endMinutes === null) {
      errors.endTime = 'Формат — ЧЧ:ММ, например 23:10. Можно оставить пустым.';
    }
  }

  let foodOffsetMinutes: number | null = null;
  if (draft.foodLevel !== 'none') {
    if (draft.foodOffset.trim() === '') {
      foodOffsetMinutes = FOOD_TIMING_MAP[draft.foodTiming].defaultOffsetMin;
    } else {
      const offset = parseDecimal(draft.foodOffset);
      if (offset === null) {
        errors.foodOffset = 'Только число минут. Например 60.';
      } else if (offset > BLOOD_LIMITS.maxFoodOffsetMin) {
        errors.foodOffset = `Не больше ${BLOOD_LIMITS.maxFoodOffsetMin} минут (сутки).`;
      } else {
        foodOffsetMinutes = Math.round(offset);
      }
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const built = buildWindow(
    startMinutes as number,
    endMinutes,
    draft.foodLevel,
    draft.foodTiming,
    foodOffsetMinutes,
    now,
  );

  if ('error' in built) {
    if (built.error === 'endTime') {
      return { ok: false, errors: { endTime: 'Последний напиток не может быть в будущем.' } };
    }
    return {
      ok: false,
      errors: { endTime: 'Интервал длиннее суток. Проверь время первого и последнего напитка.' },
    };
  }

  return {
    ok: true,
    profile: {
      sex: draft.sex,
      weightKg: weight as number,
      heightCm,
      startTime: formatClockMinutes(startMinutes as number),
      endTime: endMinutes === null ? '' : formatClockMinutes(endMinutes),
      foodLevel: draft.foodLevel,
      foodTiming: draft.foodTiming,
      foodOffsetMin: foodOffsetMinutes ?? FOOD_TIMING_MAP[draft.foodTiming].defaultOffsetMin,
    },
    window: built.window,
  };
}

/* ============================================================
   Распределение и расписание напитков
   ============================================================ */

/** Общая вода тела, литры (Hume–Weyers, 1971). */
function totalBodyWaterL(sex: BiologicalSex, weightKg: number, heightCm: number): number {
  return sex === 'male'
    ? 0.296785 * weightKg + 0.194786 * heightCm - 14.012934
    : 0.183809 * weightKg + 0.344547 * heightCm - 35.270121;
}

/**
 * Коэффициент Видмарка: доля массы тела, в которой распределён алкоголь.
 * Без роста — средние значения 0,68 / 0,55. С ростом — считаем общую воду тела
 * и переводим её в объём распределения через долю воды в крови.
 */
export function distributionFactor(
  sex: BiologicalSex,
  weightKg: number,
  heightCm: number | null,
): { factor: number; volumeL: number; heightUsed: boolean } {
  const fallback = sex === 'male' ? BLOOD_MODEL.widmarkMen : BLOOD_MODEL.widmarkWomen;
  const bounds = BLOOD_MODEL.distributionFactorBounds;

  if (heightCm !== null && weightKg > 0) {
    const water = totalBodyWaterL(sex, weightKg, heightCm);
    if (Number.isFinite(water) && water > 0) {
      const candidate = water / BLOOD_MODEL.bloodWaterFraction / weightKg;
      if (Number.isFinite(candidate)) {
        const factor = Math.min(bounds.max, Math.max(bounds.min, candidate));
        return { factor, volumeL: factor * weightKg, heightUsed: true };
      }
    }
  }

  return { factor: fallback, volumeL: fallback * weightKg, heightUsed: false };
}

/**
 * Раскладывает напитки по интервалу: первый — в момент начала, последний — в
 * указанное время последнего напитка, остальные — равномерно между ними.
 * Если интервал не задан, всё выпито в начале.
 */
export function scheduleDrinks(
  entries: readonly DrinkEntry[],
  durationMinutes: number,
): ScheduledDrink[] {
  const count = entries.length;
  const span = Math.max(0, durationMinutes);

  return entries.map((entry, index) => {
    const ethanolMl = entryEthanolMl(entry);
    const position = count <= 1 ? 1 : index / (count - 1);
    return {
      id: entry.id,
      name: entry.name,
      ethanolMl,
      ethanolMassG: ethanolMl * ETHANOL_DENSITY_G_PER_ML,
      minutes: span * position,
    };
  });
}

/* ============================================================
   Симуляция кривой
   ============================================================ */

interface SimulationParams {
  volumeL: number;
  eliminationPerMillePerHour: number;
  absorptionHalfLifeMin: number;
  food: { factor: number; startMinutes: number; endMinutes: number } | null;
}

interface SimulationOutput {
  /** Концентрация по минутам от первого напитка. */
  curve: number[];
  peakMinutes: number;
  peakPerMille: number;
  zeroMinutes: number | null;
}

function simulate(
  drinks: readonly ScheduledDrink[],
  params: SimulationParams,
  horizonMinutes: number,
  minCoverageMinutes: number,
): SimulationOutput {
  const threshold = BLOOD_MODEL.zeroThresholdPerMille;
  const kBase = Math.LN2 / params.absorptionHalfLifeMin; // 1/мин
  // Vmax в граммах в минуту: при высокой концентрации это даёт примерно
  // заданную скорость выведения в ‰/ч, у нуля — плавное затухание.
  const vmaxPerMinute = (params.eliminationPerMillePerHour * params.volumeL) / 60;
  const michaelis = BLOOD_MODEL.michaelisConstantPerMille;

  const curve: number[] = [];
  let gut = 0;
  let body = 0;
  let nextDrink = 0;
  let peakPerMille = 0;
  let peakMinutes = 0;

  for (let minute = 0; minute <= horizonMinutes; minute += 1) {
    // Сначала фиксируем состояние на начало минуты: в момент первого глотка
    // алкоголя в крови ещё нет.
    const concentration = params.volumeL > 0 && body > 0 ? body / params.volumeL : 0;
    curve.push(concentration);

    if (concentration > peakPerMille) {
      peakPerMille = concentration;
      peakMinutes = minute;
    }

    if (minute >= minCoverageMinutes && minute > peakMinutes && concentration <= threshold) {
      break;
    }

    // Напитки, выпитые на этой минуте, попадают в «желудок».
    while (nextDrink < drinks.length && drinks[nextDrink].minutes <= minute) {
      gut += drinks[nextDrink].ethanolMassG;
      nextDrink += 1;
    }

    // Шаг всасывания и выведения за следующую минуту.
    const foodWindow = params.food;
    const foodSlows =
      foodWindow !== null &&
      minute >= foodWindow.startMinutes &&
      minute < foodWindow.endMinutes;
    const absorbed = gut * (1 - Math.exp(-kBase * (foodSlows ? foodWindow.factor : 1)));
    gut -= absorbed;
    body += absorbed;

    const eliminationRate =
      (vmaxPerMinute * concentration) / (michaelis + concentration);
    body -= Number.isFinite(eliminationRate) ? Math.min(body, eliminationRate) : 0;
  }

  let zeroMinutes: number | null = null;
  for (let minute = peakMinutes + 1; minute < curve.length; minute += 1) {
    if (curve[minute] <= threshold) {
      zeroMinutes = minute;
      break;
    }
  }

  return { curve, peakMinutes, peakPerMille, zeroMinutes };
}

function sampleCurve(
  curve: readonly number[],
  endMinutes: number,
  everyMinutes: number,
): BacCurvePoint[] {
  const lastIndex = Math.min(curve.length - 1, Math.max(0, Math.round(endMinutes)));
  const points: BacCurvePoint[] = [];

  for (let minute = 0; minute <= lastIndex; minute += everyMinutes) {
    points.push({ minutes: minute, perMille: curve[minute] ?? 0 });
  }

  if (points.length === 0 || points[points.length - 1].minutes < lastIndex) {
    points.push({ minutes: lastIndex, perMille: curve[lastIndex] ?? 0 });
  }

  return points;
}

function addMinutes(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60_000);
}

/* ============================================================
   Основной расчёт
   ============================================================ */

export interface BloodInput {
  entries: readonly DrinkEntry[];
  profile: BloodProfile;
  window: ResolvedWindow;
  now: Date;
}

/** Считает кривую, диапазон и все производные показатели. null — нет напитков. */
export function computeBloodAlcohol({
  entries,
  profile,
  window,
  now,
}: BloodInput): BacResult | null {
  if (entries.length === 0) return null;
  if (!Number.isFinite(window.nowOffsetMinutes)) return null;

  const drinks = scheduleDrinks(entries, window.durationMinutes);
  const ethanolMl = drinks.reduce((sum, drink) => sum + drink.ethanolMl, 0);
  const ethanolMassG = ethanolMl * ETHANOL_DENSITY_G_PER_ML;

  const { factor, volumeL, heightUsed } = distributionFactor(
    profile.sex,
    profile.weightKg,
    profile.heightCm,
  );
  if (!Number.isFinite(volumeL) || volumeL <= 0) return null;

  const foodLevel = FOOD_LEVEL_MAP[profile.foodLevel];
  const food =
    profile.foodLevel === 'none' || window.mealOffsetMinutes === null
      ? null
      : {
          factor: foodLevel.absorptionFactor,
          startMinutes: window.mealOffsetMinutes,
          endMinutes: window.mealOffsetMinutes + foodLevel.windowHours * 60,
        };

  const minCoverage = Math.max(window.nowOffsetMinutes, window.durationMinutes, 0) + 60;
  const horizon = Math.min(
    BLOOD_MODEL.maxHorizonHours * 60,
    minCoverage + 24 * 60,
  );

  const central = simulate(
    drinks,
    {
      volumeL,
      eliminationPerMillePerHour: BLOOD_MODEL.eliminationPerMillePerHour,
      absorptionHalfLifeMin: BLOOD_MODEL.absorptionHalfLifeMin,
      food,
    },
    horizon,
    minCoverage,
  );

  const nowMinutes = window.nowOffsetMinutes;
  const nowIndex = Math.min(central.curve.length - 1, Math.max(0, Math.round(nowMinutes)));
  const currentPerMille = central.curve[nowIndex] ?? 0;

  // Диапазон: та же модель при границах допустимых параметров.
  const volumeScales = [BLOOD_MODEL.volumeSpread.min, 1, BLOOD_MODEL.volumeSpread.max];
  const eliminationRates = [
    BLOOD_MODEL.eliminationSpreadPerMillePerHour.min,
    BLOOD_MODEL.eliminationPerMillePerHour,
    BLOOD_MODEL.eliminationSpreadPerMillePerHour.max,
  ];
  const halfLives = [
    BLOOD_MODEL.absorptionHalfLifeSpreadMin.min,
    BLOOD_MODEL.absorptionHalfLifeMin,
    BLOOD_MODEL.absorptionHalfLifeSpreadMin.max,
  ];

  const currentValues = [currentPerMille];
  const peakValues = [central.peakPerMille];
  const zeroValues: number[] = central.zeroMinutes === null ? [] : [central.zeroMinutes];

  for (const volumeScale of volumeScales) {
    for (const elimination of eliminationRates) {
      for (const halfLife of halfLives) {
        const isCentral =
          volumeScale === 1 &&
          elimination === BLOOD_MODEL.eliminationPerMillePerHour &&
          halfLife === BLOOD_MODEL.absorptionHalfLifeMin;
        if (isCentral) continue;

        const variant = simulate(
          drinks,
          {
            volumeL: volumeL * volumeScale,
            eliminationPerMillePerHour: elimination,
            absorptionHalfLifeMin: halfLife,
            food,
          },
          horizon,
          minCoverage,
        );

        const index = Math.min(variant.curve.length - 1, nowIndex);
        currentValues.push(variant.curve[index] ?? 0);
        peakValues.push(variant.peakPerMille);
        if (variant.zeroMinutes !== null) zeroValues.push(variant.zeroMinutes);
      }
    }
  }

  const uncertainty: BacUncertainty = {
    currentPerMilleMin: Math.min(...currentValues),
    currentPerMilleMax: Math.max(...currentValues),
    peakPerMilleMin: Math.min(...peakValues),
    peakPerMilleMax: Math.max(...peakValues),
    zeroMinutesMin: zeroValues.length > 0 ? Math.min(...zeroValues) : null,
    zeroMinutesMax: zeroValues.length > 0 ? Math.max(...zeroValues) : null,
  };

  const threshold = BLOOD_MODEL.zeroThresholdPerMille;
  let phase: BacPhase;
  if (currentPerMille <= threshold) {
    // Сразу после первого глотка концентрация ещё нулевая, но модель говорит,
    // что пик впереди: это стадия роста, а не «уже трезв».
    phase =
      central.peakPerMille > threshold && central.peakMinutes > nowMinutes
        ? 'rising'
        : 'sober';
  } else if (nowMinutes < central.peakMinutes - 10) {
    phase = 'rising';
  } else if (Math.abs(nowMinutes - central.peakMinutes) <= 10) {
    phase = 'peak';
  } else {
    phase = 'falling';
  }

  const alreadySober = central.zeroMinutes !== null && central.zeroMinutes <= nowMinutes;
  const lastRelevant = Math.max(
    central.zeroMinutes ?? nowMinutes,
    central.peakMinutes,
    nowMinutes,
  );
  const chartEndMinutes = Math.min(20 * 60, Math.max(60, lastRelevant + 60));

  return {
    ethanolMl,
    ethanolMassG,
    distributionFactor: factor,
    volumeOfDistributionL: volumeL,
    heightUsed,
    bloodWaterFraction: BLOOD_MODEL.bloodWaterFraction,
    currentPerMille,
    uncertainty,
    phase,
    peakPerMille: central.peakPerMille,
    peakMinutes: central.peakMinutes,
    peakAt: addMinutes(window.startAt, central.peakMinutes),
    peakInFuture: central.peakMinutes > nowMinutes,
    zeroMinutes: central.zeroMinutes,
    zeroAt: central.zeroMinutes === null ? null : addMinutes(window.startAt, central.zeroMinutes),
    zeroEarliestAt:
      uncertainty.zeroMinutesMin === null
        ? null
        : addMinutes(window.startAt, uncertainty.zeroMinutesMin),
    zeroLatestAt:
      uncertainty.zeroMinutesMax === null
        ? null
        : addMinutes(window.startAt, uncertainty.zeroMinutesMax),
    alreadySober,
    curve: sampleCurve(central.curve, chartEndMinutes, 5),
    chartEndMinutes,
    nowMinutes,
    nowAt: now,
    durationMinutes: window.durationMinutes,
    startAt: window.startAt,
    endAt: window.endAt,
    mealMinutes: window.mealOffsetMinutes,
    foodLevel: profile.foodLevel,
    absorptionFactor: foodLevel.absorptionFactor,
    foodWindowHours: foodLevel.windowHours,
    drinks,
  };
}
