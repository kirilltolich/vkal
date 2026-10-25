import { describe, expect, it } from 'vitest';
import { createMemeFileName, wrapText } from './memeImage';

function fakeContext(charWidth = 10) {
  return {
    measureText: (text: string) => ({ width: text.length * charWidth }),
  };
}

describe('wrapText', () => {
  it('переносит текст по словам и не теряет слова', () => {
    const ctx = fakeContext(10);
    const lines = wrapText(ctx as never, 'Брат ты пока ещё тут', 120);

    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(line.length * 10).toBeLessThanOrEqual(120);
    }
    expect(lines.join(' ')).toBe('Брат ты пока ещё тут');
  });

  it('разбивает слишком длинное слово по символам', () => {
    const ctx = fakeContext(10);
    const lines = wrapText(ctx as never, 'ЬЗСХЦЫФАИА', 30);

    expect(lines).toEqual(['ЬЗС', 'ХЦЫ', 'ФАИ', 'А']);
    expect(lines.join('')).toBe('ЬЗСХЦЫФАИА');
  });

  it('держит кириллицу и длинную фразу в пределах ширины', () => {
    const ctx = fakeContext(8);
    const phrase =
      'Тебе не стрёмно так ходить, ёбаный рот? ЬЗСХЦЫФА ИА — это не медицинский диагноз, а просто плохая идея.';
    const lines = wrapText(ctx as never, phrase, 300);

    expect(lines.length).toBeGreaterThanOrEqual(3);
    for (const line of lines) {
      expect(line.length * 8).toBeLessThanOrEqual(300);
    }
    expect(lines.join(' ')).toBe(phrase);
  });

  it('возвращает хотя бы одну строку для пустой строки', () => {
    const ctx = fakeContext();
    expect(wrapText(ctx as never, '', 100)).toEqual(['']);
  });
});

describe('createMemeFileName', () => {
  it('формирует имя PNG с датой', () => {
    expect(createMemeFileName(new Date(2026, 9, 25))).toBe('v-govno-2026-10-25.png');
  });
});
