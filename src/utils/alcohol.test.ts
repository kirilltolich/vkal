import { describe, expect, it } from 'vitest';
import type { DrinkEntry } from '../types';
import {
  ETHANOL_DENSITY_G_PER_ML,
  computeTotals,
  entryEthanolMl,
  entryVolumeMl,
  equivalentVolumeMl,
  ethanolMassG,
} from './alcohol';
import { formatEquivalentMl, formatNumber, plural } from './format';

function entry(partial: Partial<DrinkEntry>): DrinkEntry {
  return {
    id: 'id',
    categoryId: 'beer',
    name: 'Напиток',
    volumeMl: 500,
    strength: 5,
    quantity: 1,
    ...partial,
  };
}

describe('чистый этанол', () => {
  it('Тест 1: 500 мл пива 5% = 25 мл этанола и ~19,73 г', () => {
    const beer = entry({ volumeMl: 500, strength: 5, quantity: 1 });
    expect(entryEthanolMl(beer)).toBe(25);
    expect(ethanolMassG(25)).toBeCloseTo(19.725, 5);
    expect(ethanolMassG(25)).toBeCloseTo(19.73, 2);
    expect(ETHANOL_DENSITY_G_PER_ML).toBe(0.789);
  });

  it('Тест 2: 100 мл водки 40% = 40 мл этанола и ~31,56 г', () => {
    const vodka = entry({ categoryId: 'vodka', volumeMl: 100, strength: 40 });
    expect(entryEthanolMl(vodka)).toBe(40);
    expect(ethanolMassG(40)).toBeCloseTo(31.56, 2);
  });

  it('Тест 3: 200 мл вина 12% = 24 мл этанола', () => {
    const wine = entry({ categoryId: 'wine', volumeMl: 200, strength: 12 });
    expect(entryEthanolMl(wine)).toBeCloseTo(24, 10);
  });

  it('Тест 4: 100 мл этанола — это 250 мл напитка 40%', () => {
    expect(equivalentVolumeMl(100, 40)).toBeCloseTo(250, 10);
    expect(formatEquivalentMl(250)).toBe('250 мл');
  });

  it('Тест 5: разные напитки и порции суммируются', () => {
    const entries = [
      entry({ id: 'beer', volumeMl: 500, strength: 5, quantity: 5 }),
      entry({ id: 'vodka', categoryId: 'vodka', volumeMl: 200, strength: 40, quantity: 1 }),
    ];
    const totals = computeTotals(entries);

    expect(totals.ethanolMl).toBeCloseTo(205, 10);
    expect(totals.volumeMl).toBe(2700);
    expect(totals.ethanolMassG).toBeCloseTo(205 * 0.789, 10);
    expect(totals.positions).toBe(2);
  });

  it('Тест 6: изменение объёма или крепости меняет результат', () => {
    const base = computeTotals([entry({ volumeMl: 500, strength: 5 })]);
    const bigger = computeTotals([entry({ volumeMl: 1000, strength: 5 })]);
    const stronger = computeTotals([entry({ volumeMl: 500, strength: 7 })]);

    expect(base.ethanolMl).toBe(25);
    expect(bigger.ethanolMl).toBe(50);
    expect(stronger.ethanolMl).toBe(35);
  });

  it('Тест 7: удаление позиции пересчитывает сумму', () => {
    const first = entry({ id: 'a', volumeMl: 500, strength: 5 });
    const second = entry({ id: 'b', categoryId: 'vodka', volumeMl: 50, strength: 40 });

    expect(computeTotals([first, second]).ethanolMl).toBe(45);
    expect(computeTotals([first]).ethanolMl).toBe(25);
    expect(computeTotals([second]).ethanolMl).toBe(20);
  });

  it('Тест 8: пустой список даёт нули без NaN', () => {
    const totals = computeTotals([]);

    expect(totals).toEqual({
      volumeMl: 0,
      ethanolMl: 0,
      ethanolMassG: 0,
      positions: 0,
    });
    expect(Number.isNaN(totals.ethanolMl)).toBe(false);
  });

  it('Тест 10: дробные объёмы и количества считаются точно', () => {
    const cocktail = entry({
      categoryId: 'cocktail',
      volumeMl: 150.5,
      strength: 12.5,
      quantity: 2.5,
    });

    expect(entryVolumeMl(cocktail)).toBeCloseTo(376.25, 10);
    expect(entryEthanolMl(cocktail)).toBeCloseTo((150.5 * 12.5 * 2.5) / 100, 10);
  });

  it('не округляет промежуточные значения при суммировании', () => {
    const totals = computeTotals([
      entry({ volumeMl: 333, strength: 4.7, quantity: 3 }),
      entry({ volumeMl: 99, strength: 33.3, quantity: 1 }),
    ]);

    const expected = (333 * 4.7 * 3) / 100 + (99 * 33.3) / 100;
    expect(totals.ethanolMl).toBeCloseTo(expected, 12);
  });

  it('эквивалент не считается при нулевой или отрицательной крепости', () => {
    expect(equivalentVolumeMl(100, 0)).toBeNull();
    expect(equivalentVolumeMl(100, -5)).toBeNull();
    expect(equivalentVolumeMl(100, Number.NaN)).toBeNull();
  });

  it('эквивалент почти литра пива показывается в литрах', () => {
    expect(formatEquivalentMl(1250)).toBe('1,25 л');
    expect(formatNumber(19.725)).toBe('19,7');
  });

  it('склонения считаются по-русски', () => {
    expect(plural(1, ['позиция', 'позиции', 'позиций'])).toBe('позиция');
    expect(plural(2, ['позиция', 'позиции', 'позиций'])).toBe('позиции');
    expect(plural(5, ['позиция', 'позиции', 'позиций'])).toBe('позиций');
    expect(plural(11, ['позиция', 'позиции', 'позиций'])).toBe('позиций');
    expect(plural(21, ['позиция', 'позиции', 'позиций'])).toBe('позиция');
  });
});
