/**
 * Auth Service
 * ----------------------------------------------------------------
 * Thin wrapper around "login". Validates the input shape and then
 * cross-checks the email + password pair against the whitelist in
 * `data/allowedUsers.js`.
 *
 * Contract:
 *   loginWithEmail(email, password)
 *     -> { ok: true, user } | { ok: false, error }
 *
 * Security note: returns a single generic "Invalid email or password"
 * message when either field is wrong — never tell an attacker which
 * one matched and which one didn't.
 *
 * FUTURE GOOGLE OAUTH:
 *   - Replace `loginWithEmail` with `loginWithGoogle()` that uses
 *     Google Identity Services. The whitelist check stays — just
 *     drop the password field and verify the email against the list.
 */

import allowedUsers from '../data/allowedUsers.js';

const normalize = (email) => String(email || '').trim().toLowerCase();

export const isEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalize(email));

export const loginWithEmail = (email, password) => {
  const value = normalize(email);
  const pwd = String(password ?? '');

  if (!value) return { ok: false, error: 'Please enter your email.' };
  if (!isEmail(value)) return { ok: false, error: 'Enter a valid email address.' };
  if (!pwd) return { ok: false, error: 'Please enter your password.' };

  const entry = allowedUsers.find((u) => u.email === value);
  if (!entry || entry.password !== pwd) {
    return { ok: false, error: 'Invalid email or password.' };
  }

  return {
    ok: true,
    user: { email: value, loggedInAt: new Date().toISOString() },
  };
};
