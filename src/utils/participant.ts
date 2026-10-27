/**
 * Всё, что связано с именем участника: нормализация, тексты для отправки
 * друзьям и постоянная ссылка на приложение.
 *
 * Имя необязательное: без него приложение работает как раньше, а тексты
 * переключаются на нейтральный вариант без имени.
 */

/** Постоянная ссылка на приложение. Она ведёт на весь тест, а не на результат. */
export const APP_URL = 'https://kirilltolich.github.io/vkal/';

export const MAX_NAME_LENGTH = 30;

/**
 * Разрешены буквы любых алфавитов (кириллица, латиница и остальные), цифры,
 * диакритика, пробел, дефис, апостроф, точка, подчёркивание, скобки и кавычки.
 * Эмодзи, управляющие символы и разметка отбрасываются.
 */
const DISALLOWED_NAME_CHARS = /[^\p{L}\p{M}\p{N} '’.\-_()«»]/gu;

/** Пере переводом строки — обычный пробел, а не склейка слов. */
const WHITESPACE_CONTROLS = /[\t\n\r\v\f]+/gu;
/** Остальные управляющие и форматирующие символы просто выбрасываем. */
const INVISIBLE_CHARS = /[\p{Cc}\p{Cf}]/gu;
/** Невидимые хвосты эмодзи: селекторы и невидимые соединители. */
const EMOJI_LEFTOVERS = /[\ufe00-\ufe0f\u200d]/gu;

/** Лимит считаем по символам, а не по UTF-16: редкая буква тоже один символ. */
function limitByCharacters(value: string): string {
  const characters = Array.from(value);
  if (characters.length <= MAX_NAME_LENGTH) return value;
  return characters.slice(0, MAX_NAME_LENGTH).join('');
}

/**
 * Нормализация живого ввода: любые пробельные серии становятся одним пробелом,
 * запрещённые символы убираются, длина ограничивается. Пробелы по краям
 * намеренно остаются — иначе в поле нельзя набрать имя из двух слов.
 */
export function sanitizeNameInput(value: unknown): string {
  if (typeof value !== 'string') return '';
  const cleared = value
    .replace(WHITESPACE_CONTROLS, ' ')
    .replace(INVISIBLE_CHARS, '')
    .replace(EMOJI_LEFTOVERS, '')
    // Запрещённый символ заменяем пробелом, а не удаляем: иначе «Кирилл🍻Толич»
    // склеился бы в одно слово.
    .replace(DISALLOWED_NAME_CHARS, ' ')
    .replace(/\s+/gu, ' ');
  return limitByCharacters(cleared);
}

/**
 * Финальная нормализация для хранения, карточки и текста сообщения:
 * то же самое плюс обрезка пробелов по краям. «Иван » → «Иван».
 */
export function sanitizeName(value: unknown): string {
  return sanitizeNameInput(value).trim();
}

/** Есть ли в имени хоть что-то осмысленное. */
export function hasName(value: unknown): boolean {
  return sanitizeName(value).length > 0;
}

export interface ShareTextOptions {
  /** Имя участника; пустая строка — нейтральный вариант. */
  name: string;
  /** Текущий шуточный вердикт, например «Детское опьянение». */
  verdictName: string;
  appUrl?: string;
}

/**
 * Короткий текст для сообщения. Про ссылку говорим честно: она ведёт на тест,
 * а не на чей-то результат.
 */
export function buildShareText({
  name,
  verdictName,
  appUrl = APP_URL,
}: ShareTextOptions): string {
  const cleanName = sanitizeName(name);
  const cleanVerdict = verdictName.trim() || 'без вердикта';

  const firstLine = cleanName
    ? `${cleanName} прошёл тест «В ГОВНО» 🍻`
    : 'Я прошёл тест «В ГОВНО» 🍻';

  return `${firstLine}\nВердикт: ${cleanVerdict}.\nПроверь себя: ${appUrl}`;
}

/** Заголовок для системного меню «Поделиться». */
export function buildShareTitle(name: string): string {
  const cleanName = sanitizeName(name);
  return cleanName ? `В ГОВНО — вердикт: ${cleanName}` : 'В ГОВНО — мой вердикт';
}
