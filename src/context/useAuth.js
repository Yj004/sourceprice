/**
 * useAuth hook — split into its own file so AuthContext.jsx only
 * exports a component (keeps React Fast Refresh happy).
 */

import { useContext } from 'react';
import AuthContext from './AuthContext.jsx';

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>.');
  return ctx;
};

export default useAuth;
