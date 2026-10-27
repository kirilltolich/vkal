import { useEffect, useRef, useState } from 'react';
import { useModalBehavior } from '../hooks/useModalBehavior';
import type { ToastMessage } from '../types';
import { downloadMemeCard, shareResult } from '../utils/download';
import { renderMemeCardPng, type MemeCardData } from '../utils/memeImage';
import { APP_URL, buildShareText, buildShareTitle } from '../utils/participant';

interface MemeCardModalProps {
  open: boolean;
  data: MemeCardData | null;
  onClose: () => void;
  notify: (text: string, tone?: ToastMessage['tone']) => void;
}

type RenderStatus = 'rendering' | 'ready' | 'error';

export function MemeCardModal({ open, data, onClose, notify }: MemeCardModalProps) {
  const [status, setStatus] = useState<RenderStatus>('rendering');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [shareHint, setShareHint] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  useModalBehavior(open, onClose);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open || !data) return;

    let cancelled = false;
    let objectUrl: string | null = null;

    setStatus('rendering');
    setError(null);
    setBlob(null);
    setImageUrl(null);
    setNote(null);
    setShareHint(null);

    renderMemeCardPng(data)
      .then((png) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(png);
        setBlob(png);
        setImageUrl(objectUrl);
        setStatus('ready');
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setStatus('error');
        setError(
          reason instanceof Error
            ? reason.message
            : 'Не удалось нарисовать карточку. Попробуй ещё раз.',
        );
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, data, attempt]);

  if (!open || !data) return null;

  const handleDownload = () => {
    if (!blob) return;
    try {
      const filename = downloadMemeCard(blob, data.date);
      const message = `PNG сохранён: ${filename}`;
      setNote(`${message}. Если файл не появился — проверь настройки загрузок браузера.`);
      setShareHint(null);
      notify(message, 'success');
    } catch {
      const message = 'Браузер не дал скачать файл. Попробуй открыть страницу в другом браузере.';
      setNote(message);
      notify(message, 'error');
    }
  };

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    setShareHint(null);
    setNote(null);

    try {
      const result = await shareResult({
        blob,
        title: buildShareTitle(data.name),
        text: buildShareText({ name: data.name, verdictName: data.levelName }),
        url: APP_URL,
      });

      if (result.status === 'shared') {
        setNote(
          result.withFile
            ? 'Меню «Поделиться» открыто: выбери, куда отправить карточку.'
            : 'Меню открыто. Карточку этот браузер не пропускает, поэтому ушли текст и ссылка.',
        );
      } else if (result.status === 'cancelled') {
        setNote('Отправку отменили. Карточка осталась здесь.');
      } else {
        setShareHint(`${result.reason} Кнопка «Скачать карточку» сохранит PNG на устройство.`);
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal-card meme-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meme-title"
      >
        <header className="meme-modal-head">
          <div>
            <p className="eyebrow eyebrow-small">
              <span className="pulse-dot" aria-hidden="true" /> готово к отправке
            </p>
            <h2 id="meme-title">Мем-карточка</h2>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Закрыть мем-карточку"
            ref={closeRef}
          >
            ×
          </button>
        </header>

        <div className="meme-preview">
          {status === 'rendering' ? (
            <div className="meme-skeleton" role="status">
              <span className="spinner" aria-hidden="true" />
              <p>Рисуем PNG 1080 × 1350…</p>
              <small>Canvas работает прямо в браузере, ничего не отправляем на сервер.</small>
            </div>
          ) : null}

          {status === 'error' ? (
            <div className="meme-error" role="alert">
              <p>{error}</p>
              <button
                type="button"
                className="button button-primary"
                onClick={() => setAttempt((value) => value + 1)}
              >
                Попробовать ещё раз
              </button>
            </div>
          ) : null}

          {status === 'ready' && imageUrl ? (
            <img src={imageUrl} alt={`Мем-карточка: ${data.levelName}. ${data.phrase}`} />
          ) : null}
        </div>

        <div className="meme-modal-foot">
          <p className="meme-meta">1080 × 1350 · PNG · генерируется локально</p>

          <div className="meme-actions">
            <button
              type="button"
              className="button button-primary"
              onClick={handleDownload}
              disabled={status !== 'ready' || !blob}
            >
              <span aria-hidden="true">⬇</span> Скачать карточку
            </button>
            <button
              type="button"
              className="button button-ghost"
              onClick={handleShare}
              disabled={status === 'rendering' || sharing}
            >
              <span aria-hidden="true">↗</span> {sharing ? 'Открываю…' : 'Поделиться'}
            </button>
          </div>

          {shareHint ? (
            <p className="meme-share-hint" role="status">
              {shareHint}
            </p>
          ) : null}
          {note ? (
            <p className="meme-note" role="status">
              {note}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
