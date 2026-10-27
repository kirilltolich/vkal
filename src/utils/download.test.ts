import { afterEach, describe, expect, it, vi } from 'vitest';
import { canSharePngFile, copyText, shareResult } from './download';

const APP_URL = 'https://kirilltolich.github.io/vkal/';

function pngBlob(): Blob {
  return new Blob(['png'], { type: 'image/png' });
}

function stubNavigator(value: Record<string, unknown>): void {
  vi.stubGlobal('navigator', value);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('canSharePngFile', () => {
  it('без canShare и при его ошибке честно говорит «нет»', () => {
    stubNavigator({});
    expect(canSharePngFile(pngBlob())).toBe(false);

    stubNavigator({
      canShare: () => {
        throw new Error('нельзя');
      },
    });
    expect(canSharePngFile(pngBlob())).toBe(false);
  });

  it('спрашивает браузер именно про PNG', () => {
    const canShare = vi.fn((_data?: unknown) => true);
    stubNavigator({ canShare });

    expect(canSharePngFile(pngBlob())).toBe(true);
    const payload = canShare.mock.calls[0]?.[0] as { files: File[] };
    expect(payload.files[0]?.type).toBe('image/png');
  });
});

describe('shareResult', () => {
  it('без Web Share API возвращает unsupported, а не ошибку', async () => {
    stubNavigator({});
    const result = await shareResult({ blob: pngBlob(), title: 't', text: 'txt', url: APP_URL });

    expect(result.status).toBe('unsupported');
    if (result.status === 'unsupported') expect(result.reason).toContain('Поделиться');
  });

  it('передаёт PNG, когда браузер умеет файлы', async () => {
    const share = vi.fn(async (_data?: unknown) => undefined);
    stubNavigator({ share, canShare: () => true });

    const result = await shareResult({
      blob: pngBlob(),
      title: 'В ГОВНО',
      text: 'текст',
      url: APP_URL,
    });

    expect(result).toEqual({ status: 'shared', withFile: true });
    expect(share).toHaveBeenCalledTimes(1);
    const payload = share.mock.calls[0]?.[0] as { files?: File[]; text: string };
    expect(payload.files).toHaveLength(1);
    expect(payload.files?.[0]?.type).toBe('image/png');
    expect(payload.files?.[0]?.name.endsWith('.png')).toBe(true);
    expect(payload.text).toBe('текст');
  });

  it('без поддержки файлов делится текстом и ссылкой', async () => {
    const share = vi.fn(async (_data?: unknown) => undefined);
    stubNavigator({ share, canShare: () => false });

    const result = await shareResult({
      blob: pngBlob(),
      title: 'В ГОВНО',
      text: 'текст',
      url: APP_URL,
    });

    expect(result).toEqual({ status: 'shared', withFile: false });
    const payload = share.mock.calls[0]?.[0] as { files?: File[]; url?: string };
    expect(payload.files).toBeUndefined();
    expect(payload.url).toBe(APP_URL);
  });

  it('без картинки делится только текстом', async () => {
    const share = vi.fn(async (_data?: unknown) => undefined);
    stubNavigator({ share, canShare: () => true });

    const result = await shareResult({ blob: null, title: 't', text: 'txt', url: APP_URL });

    expect(result).toEqual({ status: 'shared', withFile: false });
    const payload = share.mock.calls[0]?.[0] as { files?: File[] };
    expect(payload.files).toBeUndefined();
  });

  it('отмена системного меню — не ошибка', async () => {
    const share = vi.fn(async () => {
      throw new DOMException('Отмена', 'AbortError');
    });
    stubNavigator({ share, canShare: () => true });

    const result = await shareResult({ blob: pngBlob(), title: 't', text: 'txt', url: APP_URL });
    expect(result.status).toBe('cancelled');
  });

  it('настоящая ошибка шаринга возвращает error', async () => {
    const share = vi.fn(async () => {
      throw new Error('браузер сломался');
    });
    stubNavigator({ share, canShare: () => true });

    const result = await shareResult({ blob: pngBlob(), title: 't', text: 'txt', url: APP_URL });
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.reason).toContain('Скачай PNG');
  });
});

describe('copyText', () => {
  it('копирует через Clipboard API', async () => {
    const writeText = vi.fn(async (_text: string) => undefined);
    stubNavigator({ clipboard: { writeText } });

    const result = await copyText(APP_URL);

    expect(result).toEqual({ status: 'copied' });
    expect(writeText).toHaveBeenCalledWith(APP_URL);
  });

  it('если браузер запретил копирование, просит скопировать вручную', async () => {
    const writeText = vi.fn(async () => {
      throw new Error('нет разрешения');
    });
    stubNavigator({ clipboard: { writeText } });

    const result = await copyText(APP_URL);
    expect(result.status).toBe('manual');
  });

  it('без Clipboard API тоже просит скопировать вручную', async () => {
    stubNavigator({});
    const result = await copyText(APP_URL);
    expect(result.status).toBe('manual');
  });
});
