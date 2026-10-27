import { createMemeFileName } from './memeImage';

/** Скачивает настоящий файл через Blob + временную ссылку. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Не отзываем URL мгновенно: браузеру нужно время начать скачивание.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function downloadMemeCard(blob: Blob, date = new Date()): string {
  const filename = createMemeFileName(date);
  downloadBlob(blob, filename);
  return filename;
}

export type ShareResult =
  /** Меню открылось. withFile — передали ли PNG, или только текст со ссылкой. */
  | { status: 'shared'; withFile: boolean }
  | { status: 'cancelled' }
  | { status: 'unsupported'; reason: string }
  | { status: 'error'; reason: string };

export interface SharePayload {
  /** PNG-карточка; null — если рисовать нечего или не получилось. */
  blob: Blob | null;
  title: string;
  text: string;
  url?: string;
}

function makePngFile(blob: Blob): File {
  return new File([blob], createMemeFileName(new Date()), { type: 'image/png' });
}

function hasShareApi(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/** Умеет ли этот браузер отдавать в «Поделиться» именно файл-картинку. */
export function canSharePngFile(blob: Blob): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false;
  try {
    return navigator.canShare({ files: [makePngFile(blob)] });
  } catch {
    return false;
  }
}

/**
 * Открывает системное меню «Поделиться».
 *
 * Сначала пробуем отдать PNG вместе с текстом. Если браузер файлы не умеет,
 * отдаём текст со ссылкой. Отмена меню — не ошибка, а обычный сценарий.
 * «Меню открылось» не значит «сообщение отправлено»: отправку завершает
 * пользователь уже в системном окне.
 */
export async function shareResult({
  blob,
  title,
  text,
  url,
}: SharePayload): Promise<ShareResult> {
  if (!hasShareApi()) {
    return {
      status: 'unsupported',
      reason: 'Этот браузер не умеет открывать системное «Поделиться».',
    };
  }

  const file = blob && canSharePngFile(blob) ? makePngFile(blob) : null;

  try {
    if (file) {
      await navigator.share({ files: [file], title, text });
      return { status: 'shared', withFile: true };
    }

    await navigator.share(url ? { title, text, url } : { title, text });
    return { status: 'shared', withFile: false };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { status: 'cancelled' };
    }
    return {
      status: 'error',
      reason: 'Системное «Поделиться» не сработало. Скачай PNG или скопируй ссылку.',
    };
  }
}

export type CopyResult =
  | { status: 'copied' }
  /** Копирование не разрешено — покажем текст в поле для ручного копирования. */
  | { status: 'manual'; reason: string };

/** Старый способ на случай, когда Clipboard API недоступен (http, webview). */
function copyWithTextarea(text: string): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    return copied;
  } catch {
    return false;
  }
}

/** Копирует текст в буфер обмена; если браузер не дал — просит скопировать руками. */
export async function copyText(text: string): Promise<CopyResult> {
  const clipboard =
    typeof navigator !== 'undefined' && navigator.clipboard ? navigator.clipboard : null;

  if (clipboard && typeof clipboard.writeText === 'function') {
    try {
      await clipboard.writeText(text);
      return { status: 'copied' };
    } catch {
      // Пробуем запасной способ ниже.
    }
  }

  if (copyWithTextarea(text)) return { status: 'copied' };

  return {
    status: 'manual',
    reason: 'Браузер не разрешил копировать сам. Скопируй ссылку из поля вручную.',
  };
}
