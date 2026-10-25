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
  | { status: 'shared' }
  | { status: 'cancelled' }
  | { status: 'unsupported'; reason: string }
  | { status: 'error'; reason: string };

interface SharePayload {
  title: string;
  text: string;
}

/**
 * Пробует отправить сам PNG через Web Share API (Level 2).
 * Если браузер не умеет делиться файлами — возвращает unsupported,
 * чтобы интерфейс предложил скачивание.
 */
export async function shareMemeCard(blob: Blob, payload: SharePayload): Promise<ShareResult> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return { status: 'unsupported', reason: 'Этот браузер не поддерживает системное «Поделиться».' };
  }

  const file = new File([blob], createMemeFileName(new Date()), { type: 'image/png' });

  try {
    if (typeof navigator.canShare !== 'function' || !navigator.canShare({ files: [file] })) {
      return {
        status: 'unsupported',
        reason: 'Браузер не умеет передавать файлы через «Поделиться». Скачай карточку — и отправляй вручную.',
      };
    }
    await navigator.share({ files: [file], title: payload.title, text: payload.text });
    return { status: 'shared' };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { status: 'cancelled' };
    }
    return {
      status: 'error',
      reason: 'Не удалось открыть «Поделиться». Скачай PNG и отправь его сам.',
    };
  }
}
