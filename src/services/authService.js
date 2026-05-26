/**
 * Auth Service
 * ----------------------------------------------------------------
 * Thin wrapper around "login". Currently uses the local allowedUsers
 * array as the SOLE source of truth — any well-formed email present
 * in the whitelist is accepted (Gmail, company domains, etc.).
 *
 * Contract:
 *   loginWithEmail(email) -> { ok: true, user } | { ok: false, error }
 *
 * FUTURE GOOGLE OAUTH:
 *   - Replace `loginWithEmail` with `loginWithGoogle()` that uses
 *     Google Identity Services (https://developers.google.com/identity).
 *   - Verify the returned id_token, extract `email`, then run the
 *     same whitelist check below.
 */

import allowedUsers from '../data/allowedUsers.js';

const normalize = (email) => String(email || '').trim().toLowerCase();

// Generic email shape — accepts any domain. The whitelist below
// is what actually controls access, so domain restriction belongs
// in `data/allowedUsers.js`, not here.
export const isEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalize(email));

export const loginWithEmail = (email) => {
  const value = normalize(email);

  if (!value) return { ok: false, error: 'Please enter your email.' };
  if (!isEmail(value)) return { ok: false, error: 'Enter a valid email address.' };
  if (!allowedUsers.includes(value)) return { ok: false, error: 'Access Denied.' };

  return {
    ok: true,
    user: { email: value, loggedInAt: new Date().toISOString() },
  };
};
