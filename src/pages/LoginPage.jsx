/**
 * LoginPage
 * ----------------------------------------------------------------
 * Modern, animated, mobile-first sign-in screen.
 *
 *   - Email + Password (whitelist in data/allowedUsers.js)
 *   - Show/hide password via PasswordInput
 *   - Single banner-style error (never reveals which field is wrong)
 *   - Animated soft "blob" background, glass-morphism card, gradient
 *     brand mark, subtle entrance animation
 *   - Auto-login: if AuthContext has a saved session, redirects to
 *     the dashboard (or wherever the user originally came from)
 */

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import Button from '../components/Button.jsx';
import Input from '../components/Input.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import './LoginPage.css';

const LoginPage = () => {
  const { login, isAuthenticated, initializing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = location.state?.from || '/dashboard';

  useEffect(() => {
    if (!initializing && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [initializing, isAuthenticated, navigate, redirectTo]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    const result = login(email, password);
    setSubmitting(false);
    if (result.ok) navigate(redirectTo, { replace: true });
    else setError(result.error);
  };

  return (
    <main className="login">
      <div className="login__bg" aria-hidden="true">
        <span className="login__blob login__blob--1" />
        <span className="login__blob login__blob--2" />
        <span className="login__blob login__blob--3" />
      </div>

      <form className="login__card" onSubmit={handleSubmit} noValidate>
        <div className="login__head">
          <div className="login__logo" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 17l6-6 4 4 8-8" />
              <path d="M14 7h7v7" />
            </svg>
          </div>
          <h1 className="login__title">Welcome back</h1>
          <p className="login__subtitle">
            Sign in to access your <strong>sourcePrice</strong> dashboard
          </p>
        </div>

        <div className="login__fields">
          <Input
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <PasswordInput
            label="Password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <div className="login__error" role="alert">
            <span className="login__error-dot" aria-hidden="true" />
            {error}
          </div>
        )}

        <Button type="submit" className="login__submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>

        <p className="login__hint">
          Only authorized accounts can access the dashboard.
        </p>
      </form>
    </main>
  );
};

export default LoginPage;
