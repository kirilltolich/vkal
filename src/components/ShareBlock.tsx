import { useCallback, useState } from 'react';
import type { ToastMessage } from '../types';
import { copyText, downloadMemeCard, shareResult } from '../utils/download';
import { renderMemeCardPng, type MemeCardData } from '../utils/memeImage';
import { APP_URL, buildShareText, buildShareTitle, sanitizeName } from '../utils/participant';

interface ShareBlockProps {
  data: MemeCardData;
  notify: (text: string, tone?: ToastMessage['tone']) => void;
}

type Busy = 'download' | 'share' | 'link' | null;

/**
 * Блок «ПОКАЖИ ДРУЗЬЯМ»: скачать PNG, отдать карточку в системное меню
 * «Поделиться» или скопировать ссылку на тест.
 *
 * PNG рисуется лениво — только когда пользователь реально нажал кнопку,
 * поэтому на телефоне блок ничего не тормозит.
 */
export function ShareBlock({ data, notify }: ShareBlockProps) {
  const [cache, setCache] = useState<{ data: MemeCardData; blob: Blob } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [note, setNote] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState<string | null>(null);

  const name = sanitizeName(data.name);
  const message = buildShareText({ name, verdictName: data.levelName });
  // Кэш привязан к конкретному результату: если цифры или вердикт поменялись,
  // старая картинка не подставляется.
  const blob = cache && cache.data === data ? cache.blob : null;

  const ensureBlob = useCallback(async (): Promise<Blob | null> => {
    if (blob) return blob;
    setPreparing(true);
    try {
      const png = await renderMemeCardPng(data);
      setCache({ data, blob: png });
      return png;
    } catch (reason) {
      setHint(
        reason instanceof Error
          ? `${reason.message} Можно всё равно поделиться текстом или скопировать ссылку.`
          : 'Не удалось собрать PNG. Можно поделиться текстом или скопировать ссылку.',
      );
      return null;
    } finally {
      setPreparing(false);
    }
  }, [blob, data]);

  const handleDownload = async () => {
    setBusy('download');
    setNote(null);
    setHint(null);

    try {
      const png = await ensureBlob();
      if (!png) {
        setNote('Карточку собрать не удалось. Попробуй ещё раз или поделись ссылкой.');
        return;
      }
      const filename = downloadMemeCard(png, data.date);
      setNote(`PNG сохранён: ${filename}. Если файла нет — проверь настройки загрузок.`);
      notify(`PNG сохранён: ${filename}`, 'success');
    } catch {
      setNote('Браузер не дал скачать файл. Попробуй другое браузер или поделись ссылкой.');
      notify('Скачать файл не получилось.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleShare = async () => {
    setBusy('share');
    setNote(null);
    setHint(null);

    try {
      const png = await ensureBlob();
      const result = await shareResult({
        blob: png,
        title: buildShareTitle(name),
        text: message,
        url: APP_URL,
      });

      if (result.status === 'shared') {
        setNote(
          result.withFile
            ? 'Системное меню «Поделиться» открыто с карточкой. Отправку завершает само приложение, куда ты её выберешь.'
            : 'Системное меню открыто с текстом и ссылкой: этот браузер не пропускает PNG в «Поделиться».',
        );
        return;
      }

      if (result.status === 'cancelled') {
        setNote('Отправку отменили — ничего страшного. Карточку можно скачать или скопировать ссылку.');
        return;
      }

      setHint(
        result.status === 'unsupported'
          ? 'Этот браузер не умеет делиться файлами. Скачай карточку или скопируй ссылку — текст ниже тоже можно выделить и отправить вручную.'
          : result.reason,
      );
    } finally {
      setBusy(null);
    }
  };

  const handleCopyLink = async () => {
    setBusy('link');
    setNote(null);
    setHint(null);

    try {
      const result = await copyText(APP_URL);
      if (result.status === 'copied') {
        setManualUrl(null);
        setNote(`Ссылка скопирована: ${APP_URL}`);
        notify('Ссылка на приложение скопирована.', 'success');
        return;
      }
      setManualUrl(APP_URL);
      setNote(result.reason);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="share-block" aria-labelledby="share-title">
      <header className="share-head">
        <h3 id="share-title">ПОКАЖИ ДРУЗЬЯМ</h3>
        <p>
          Карточка рисуется прямо в браузере, ничего никуда не отправляется.
          {name ? ` Имя «${name}» уже подставлено в картинку и в текст.` : ''}
        </p>
      </header>

      <div className="share-actions">
        <button
          type="button"
          className="button button-primary"
          onClick={handleDownload}
          disabled={busy !== null}
        >
          <span aria-hidden="true">⬇</span>{' '}
          {preparing && busy === 'download' ? 'Собираю PNG…' : 'СКАЧАТЬ КАРТОЧКУ'}
        </button>
        <button
          type="button"
          className="button button-ghost"
          onClick={handleShare}
          disabled={busy !== null}
        >
          <span aria-hidden="true">↗</span>{' '}
          {preparing && busy === 'share' ? 'Собираю PNG…' : 'ПОДЕЛИТЬСЯ РЕЗУЛЬТАТОМ'}
        </button>
        <button
          type="button"
          className="button button-ghost"
          onClick={handleCopyLink}
          disabled={busy !== null}
        >
          <span aria-hidden="true">🔗</span> СКОПИРОВАТЬ ССЫЛКУ
        </button>
      </div>

      <div className="share-message">
        <p className="share-label">Текст для сообщения</p>
        <p className="share-text">{message}</p>
      </div>

      {manualUrl ? (
        <label className="share-manual">
          <span>Скопируй ссылку вручную:</span>
          <input
            type="text"
            readOnly
            value={manualUrl}
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>
      ) : null}

      {hint ? (
        <p className="share-hint" role="status">
          {hint}
        </p>
      ) : null}
      {note ? (
        <p className="share-note" role="status">
          {note}
        </p>
      ) : null}

      <p className="share-fine">
        Ссылка ведёт на тест целиком — чужого результата в ней нет: друзья пройдут его
        сами. Время достижения нуля и вердикты — шутка на основе расчёта, а не диагноз
        и не разрешение садиться за руль.
      </p>
    </section>
  );
}
