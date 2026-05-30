import { createContext, useCallback, useMemo, useState } from 'react';
import { getStoredAuth } from '../services/apiClient.js';
import { loginWithEmail } from '../services/authService.js';

const STORAGE_KEY = 'sourceprice.auth.user';

const readStoredUser = () => {
  const stored = getStoredAuth();
  if (!stored) return null;
  return {
    email: stored.email,
    role: stored.role || 'user',
    token: stored.token,
    loggedInAt: stored.loggedInAt,
  };
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);
  const [error, setError] = useState('');
  const initializing = false;

  const login = useCallback(async (email, password) => {
    setError('');
    const result = await loginWithEmail(email, password);

    if (!result.ok) {
      setError(result.error);
      return { ok: false, error: result.error };
    }

    const session = {
      email: result.user.email,
      role: result.user.role || 'user',
      token: result.token,
      loggedInAt: result.user.loggedInAt || new Date().toISOString(),
    };

    // Guard against stale client bundles: never treat login as success
    // unless the server returned a JWT token.
    if (!session.token) {
      const msg = 'Login session is invalid. Please refresh and sign in again.';
      setError(msg);
      return { ok: false, error: msg };
    }

    setUser(session);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return { ok: true, user: session };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setError('');
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const isSuperAdmin = user?.role === 'super_admin';

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user?.token),
      isSuperAdmin,
      initializing,
      error,
      login,
      logout,
    }),
    [user, isSuperAdmin, initializing, error, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
