import { describe, expect, it } from 'vitest';
import {
  APP_URL,
  MAX_NAME_LENGTH,
  buildShareText,
  buildShareTitle,
  hasName,
  sanitizeName,
  sanitizeNameInput,
} from './participant';

describe('sanitizeName', () => {
  it('оставляет кириллицу, латиницу, пробелы и обычные символы имени', () => {
    expect(sanitizeName('Кирилл')).toBe('Кирилл');
    expect(sanitizeName("Мэри-Энн О'Нил")).toBe("Мэри-Энн О'Нил");
    expect(sanitizeName('Ivan Petrov')).toBe('Ivan Petrov');
    expect(sanitizeName('Жанна д’Арк')).toBe('Жанна д’Арк');
    expect(sanitizeName('Кирилл (Толич)')).toBe('Кирилл (Толич)');
  });

  it('убирает пробелы по краям и схлопывает повторы', () => {
    expect(sanitizeName('   Кирилл   ')).toBe('Кирилл');
    expect(sanitizeName('Кирилл   Толич')).toBe('Кирилл Толич');
    expect(sanitizeName('\n\tКирилл\u00a0Толич ')).toBe('Кирилл Толич');
  });

  it('выбрасывает эмодзи, разметку и управляющие символы', () => {
    expect(sanitizeName('Кирилл 🍻')).toBe('Кирилл');
    expect(sanitizeName('<Кирилл>')).toBe('Кирилл');
    expect(sanitizeName('Ки\u0007рилл')).toBe('Кирилл');
  });

  it('ограничивает длину 30 символами и считает именно символы', () => {
    expect(sanitizeName('Я'.repeat(45))).toBe('Я'.repeat(MAX_NAME_LENGTH));
    // Буква вне BMP — один символ, а не два: лимит не должен резать её пополам.
    const rare = '𠀋'.repeat(35);
    const limited = sanitizeName(rare);
    expect(Array.from(limited)).toHaveLength(MAX_NAME_LENGTH);
    expect(limited).not.toContain('\uFFFD');
  });

  it('мусор вместо имени даёт пустую строку', () => {
    expect(sanitizeName('')).toBe('');
    expect(sanitizeName('    ')).toBe('');
    expect(sanitizeName('🍻🍻')).toBe('');
    expect(sanitizeName(null)).toBe('');
    expect(sanitizeName(42)).toBe('');
    expect(sanitizeName({ name: 'Кирилл' })).toBe('');
  });

  it('живой ввод не съедает пробел между словами', () => {
    expect(sanitizeNameInput('Иван ')).toBe('Иван ');
    expect(sanitizeNameInput('Иван   ')).toBe('Иван ');
    expect(sanitizeNameInput('Иван 🍺')).toBe('Иван ');
    expect(sanitizeNameInput('Иван Петров')).toBe('Иван Петров');
  });
});

describe('hasName', () => {
  it('отличает имя от пустоты и одних эмодзи', () => {
    expect(hasName('Кирилл')).toBe(true);
    expect(hasName('  Кирилл ')).toBe(true);
    expect(hasName('   ')).toBe(false);
    expect(hasName('🍻')).toBe(false);
    expect(hasName(null)).toBe(false);
  });
});

describe('buildShareText', () => {
  it('с именем: участник, вердикт и ссылка на тест', () => {
    const text = buildShareText({ name: '  Кирилл ', verdictName: 'Детское опьянение' });

    expect(text).toBe(
      'Кирилл прошёл тест «В ГОВНО» 🍻\n' +
        'Вердикт: Детское опьянение.\n' +
        `Проверь себя: ${APP_URL}`,
    );
  });

  it('без имени: нейтральный вариант без пустых подстановок', () => {
    const text = buildShareText({ name: '', verdictName: 'Мутный тип' });

    expect(text).toBe(
      'Я прошёл тест «В ГОВНО» 🍻\n' +
        'Вердикт: Мутный тип.\n' +
        `Проверь себя: ${APP_URL}`,
    );
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('null');
  });

  it('не тащит в текст эмодзи из имени', () => {
    const text = buildShareText({ name: 'Кирилл🍻', verdictName: 'Детское опьянение' });
    expect(text.startsWith('Кирилл прошёл тест')).toBe(true);
  });

  it('пустой вердикт не ломает сообщение', () => {
    expect(buildShareText({ name: '', verdictName: '   ' })).toContain('Вердикт: без вердикта.');
  });

  it('умеет подставить другую ссылку', () => {
    const text = buildShareText({
      name: 'Кирилл',
      verdictName: 'Детское опьянение',
      appUrl: 'http://localhost:5174/vkal/',
    });
    expect(text).toContain('Проверь себя: http://localhost:5174/vkal/');
  });
});

describe('buildShareTitle', () => {
  it('с именем и без', () => {
    expect(buildShareTitle('Кирилл')).toBe('В ГОВНО — вердикт: Кирилл');
    expect(buildShareTitle('   ')).toBe('В ГОВНО — мой вердикт');
  });
});

describe('ссылка на приложение', () => {
  it('совпадает с адресом GitHub Pages', () => {
    expect(APP_URL).toBe('https://kirilltolich.github.io/vkal/');
  });
});
