import { describe, expect, it } from 'vitest';
import { parseDecimal, validateDraft, validateStrength } from './validation';

const baseDraft = {
  name: 'Пиво',
  volume: '500',
  unit: 'ml' as const,
  strength: '5',
  quantity: '1',
};

describe('parseDecimal', () => {
  it('понимает точку и запятую', () => {
    expect(parseDecimal('12.5')).toBe(12.5);
    expect(parseDecimal('12,5')).toBe(12.5);
  });

  it('игнорирует пробелы, включая неразрывный', () => {
    expect(parseDecimal('1 000,5')).toBe(1000.5);
    expect(parseDecimal('1\u00a0000.25')).toBe(1000.25);
  });

  it('возвращает null для пустой строки и мусора', () => {
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('   ')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
    expect(parseDecimal('-5')).toBeNull();
    expect(parseDecimal('12,5,5')).toBeNull();
    expect(parseDecimal('1e3')).toBeNull();
  });
});

describe('validateDraft', () => {
  it('принимает корректную позицию', () => {
    const result = validateDraft(baseDraft);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        name: 'Пиво',
        volumeMl: 500,
        strength: 5,
        quantity: 1,
      });
    }
  });

  it('переводит литры в миллилитры', () => {
    const result = validateDraft({ ...baseDraft, volume: '0,75', unit: 'l' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.volumeMl).toBe(750);
  });

  it('Тест 9: отклоняет крепость 0%', () => {
    const result = validateDraft({ ...baseDraft, strength: '0' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.strength).toContain('больше нуля');
  });

  it('Тест 9: отклоняет крепость выше 100%', () => {
    const result = validateDraft({ ...baseDraft, strength: '101' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.strength).toContain('выше 100');
  });

  it('Тест 9: отклоняет отрицательный и нулевой объём', () => {
    for (const volume of ['-500', '-0,5', '0']) {
      const result = validateDraft({ ...baseDraft, volume });
      expect(result.ok).toBe(false);
    }
  });

  it('Тест 9: отклоняет пустые значения', () => {
    const result = validateDraft({
      name: '  ',
      volume: '',
      unit: 'ml',
      strength: '',
      quantity: '',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.name).toBeTruthy();
      expect(result.errors.volume).toBeTruthy();
      expect(result.errors.strength).toBeTruthy();
      expect(result.errors.quantity).toBeTruthy();
    }
  });

  it('Тест 9: отклоняет нулевое количество', () => {
    const result = validateDraft({ ...baseDraft, quantity: '0' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.quantity).toContain('больше нуля');
  });

  it('Тест 10: принимает десятичные значения с запятой и точкой', () => {
    const comma = validateDraft({
      name: 'Коктейль',
      volume: '0,33',
      unit: 'l',
      strength: '12,5',
      quantity: '1,5',
    });
    const dot = validateDraft({
      name: 'Коктейль',
      volume: '0.33',
      unit: 'l',
      strength: '12.5',
      quantity: '1.5',
    });

    expect(comma.ok).toBe(true);
    expect(dot.ok).toBe(true);
    if (comma.ok && dot.ok) {
      expect(comma.value).toEqual(dot.value);
      expect(comma.value.volumeMl).toBeCloseTo(330, 5);
      expect(comma.value.strength).toBe(12.5);
      expect(comma.value.quantity).toBe(1.5);
    }
  });

  it('ограничивает слишком большие объёмы и количества', () => {
    const hugeVolume = validateDraft({ ...baseDraft, volume: '999999999' });
    const hugeQuantity = validateDraft({ ...baseDraft, quantity: '1000' });

    expect(hugeVolume.ok).toBe(false);
    expect(hugeQuantity.ok).toBe(false);
  });
});

describe('validateStrength', () => {
  it('возвращает значение для нормальной крепости', () => {
    expect(validateStrength('40')).toEqual({ value: 40 });
    expect(validateStrength('4,5')).toEqual({ value: 4.5 });
  });

  it('возвращает ошибку для пустого, нулевого и запредельного значения', () => {
    expect(validateStrength('').error).toBeTruthy();
    expect(validateStrength('0').error).toContain('больше нуля');
    expect(validateStrength('100,1').error).toContain('выше 100');
    expect(validateStrength('водка').error).toBeTruthy();
  });
});
