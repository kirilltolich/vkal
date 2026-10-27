import { describe, expect, it } from 'vitest';
import { MEME_WIDTH, createMemeFileName, fitNameLine, wrapText } from './memeImage';

/** 1080 − отступы 72×2 − внутренние отступы панели 104. */
const NAME_MAX_WIDTH = MEME_WIDTH - 72 * 2 - 104;

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

describe('fitNameLine', () => {
  it('короткое имя остаётся целиком и в верхнем регистре', () => {
    const ctx = fakeContext(10);
    const line = fitNameLine(ctx as never, 'Кирилл');

    expect(line.text).toBe('КИРИЛЛ');
    expect(line.size).toBe(40);
  });

  it('без имени не рисует пустую подпись', () => {
    const ctx = fakeContext(10);
    expect(fitNameLine(ctx as never, '')).toEqual({ text: '', size: 0 });
    expect(fitNameLine(ctx as never, '   ')).toEqual({ text: '', size: 0 });
    expect(fitNameLine(ctx as never, '🍻🍻')).toEqual({ text: '', size: 0 });
  });

  it('максимальное имя в 30 символов влезает в одну строку', () => {
    const ctx = fakeContext(24);
    const line = fitNameLine(ctx as never, 'Я'.repeat(30));

    expect(line.text).toBe('Я'.repeat(30));
    expect(line.text.length * 24).toBeLessThanOrEqual(NAME_MAX_WIDTH);
  });

  it('совсем невпихуемое имя обрезается с многоточием и не выходит за границы', () => {
    const ctx = fakeContext(60);
    const line = fitNameLine(ctx as never, 'Я'.repeat(30));

    expect(line.text.endsWith('…')).toBe(true);
    expect(line.size).toBe(22);
    expect(line.text.length * 60).toBeLessThanOrEqual(NAME_MAX_WIDTH);
  });

  it('эмодзи и разметка не попадают на карточку', () => {
    const ctx = fakeContext(10);
    expect(fitNameLine(ctx as never, 'Кирилл 🍻 <b>').text).toBe('КИРИЛЛ B');
  });
});
