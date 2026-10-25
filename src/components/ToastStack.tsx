import type { ToastMessage } from '../types';

interface ToastStackProps {
  toasts: readonly ToastMessage[];
  onDismiss: (id: string) => void;
}

const ICONS: Record<ToastMessage['tone'], string> = {
  info: '💬',
  success: '✅',
  error: '⚠️',
};

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone}`} role="status">
          <span className="toast-icon" aria-hidden="true">
            {ICONS[toast.tone]}
          </span>
          <span className="toast-text">{toast.text}</span>
          <button
            type="button"
            className="toast-close"
            onClick={() => onDismiss(toast.id)}
            aria-label="Закрыть уведомление"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
