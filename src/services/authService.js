import api from './apiClient.js';

const normalize = (email) => String(email || '').trim().toLowerCase();

export const isEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalize(email));

export const loginWithEmail = async (email, password) => {
  const value = normalize(email);
  const pwd = String(password ?? '');

  if (!value) return { ok: false, error: 'Please enter your email.' };
  if (!isEmail(value)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  if (!pwd) return { ok: false, error: 'Please enter your password.' };

  try {
    const data = await api.login(value, pwd);
    return {
      ok: true,
      user: data.user,
      token: data.token,
    };
  } catch (e) {
    return { ok: false, error: e.message || 'Invalid email or password.' };
  }
};
