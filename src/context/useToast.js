/**
 * useToast — hook split into its own file for Fast Refresh.
 */

import { useContext } from 'react';
import ToastContext from './ToastContext.jsx';

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>.');
  return ctx;
};

export default useToast;
