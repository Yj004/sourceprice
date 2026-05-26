/**
 * AuthContext — Phase 2
 * ----------------------------------------------------------------
 * Centralized authentication state.
 *
 * Responsibilities:
 *   - Hold the currently logged-in user (or null).
 *   - Auto-login by rehydrating a saved session from localStorage
 *     during the very first render (lazy `useState` initializer).
 *     This is inherently loading-safe: by the time React paints the
 *     first frame, `isAuthenticated` is already correct, so the user
 *     never flashes to /login on a hard refresh.
 *   - Expose `login(email)` and `logout()` actions.
 *   - Expose `initializing` (always false today) — reserved for a
 *     future async boot step (e.g. fetching the allowed-users list
 *     from Google Sheets) so route guards can simply show a Loader
 *     while it is true.
 *
 * Authentication flow (current — dummy Gmail):
 *   LoginPage -> ctx.login(email)
 *      -> authService.loginWithEmail(email)
 *           -> checks /data/allowedUsers.js whitelist
 *      -> on success: setUser + persist to localStorage
 *      -> on failure: returns { ok: false, error: "Access Denied." }
 *
 * FUTURE GOOGLE OAUTH FLOW (drop-in):
 *   - Add `ctx.loginWithGoogle()` that calls a `loginWithGoogle`
 *     helper in authService.js (Google Identity Services).
 *   - The whitelist check stays here; only the input source changes.
 *
 * FUTURE GOOGLE SHEETS INTEGRATION:
 *   - Replace the static `allowedUsers` import with
 *     `await sheetsService.fetchAllowedUsers()` during boot. Flip
 *     `initializing` to true while that promise is pending so the
 *     ProtectedRoute Loader handles the UX automatically.
 */

import { createContext, useCallback, useMemo, useState } from 'react';
import { loginWithEmail } from '../services/authService.js';

const STORAGE_KEY = 'sourceprice.auth.user';

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.email === 'string' ? parsed : null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);
  const [error, setError] = useState('');
  const initializing = false;

  const login = useCallback((email, password) => {
    setError('');
    const result = loginWithEmail(email, password);

    if (!result.ok) {
      setError(result.error);
      return { ok: false, error: result.error };
    }

    setUser(result.user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result.user));
    return { ok: true, user: result.user };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setError('');
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      initializing,
      error,
      login,
      logout,
    }),
    [user, initializing, error, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
