/**
 * ToastContext — Phase 4
 * ----------------------------------------------------------------
 * App-wide lightweight notification system.
 *
 * Any component (or context) can call:
 *   const { showToast } = useToast();
 *   showToast('Saved!', 'success');
 *   showToast('Something went wrong', 'error');
 *
 * Toasts auto-dismiss after `duration` ms (default 2800).
 * Only one toast is shown at a time — newer toasts replace older
 * ones, which matches the "fast workflow / minimum-click" goal.
 */

import { createContext, useCallback, useMemo, useState } from 'react';
import Toast from '../components/Toast.jsx';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success', duration = 2800) => {
    setToast({ id: Date.now(), message, type, duration });
  }, []);

  const dismiss = useCallback(() => setToast(null), []);

  const value = useMemo(() => ({ showToast, dismiss }), [showToast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast toast={toast} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

export default ToastContext;
