/**
 * Toast — single bottom-right notification card.
 * Auto-dismisses; re-keyed on every new toast so the timer resets.
 */

import { useEffect } from 'react';
import './Toast.css';

const Toast = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(onDismiss, toast.duration ?? 2800);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      <div key={toast.id} className={`toast toast--${toast.type}`}>
        <span className="toast__icon" aria-hidden>
          {toast.type === 'error' ? '!' : '✓'}
        </span>
        <span className="toast__msg">{toast.message}</span>
        <button
          type="button"
          className="toast__close"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Toast;
