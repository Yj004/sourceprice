/**
 * LoginPage — Phase 2
 * ----------------------------------------------------------------
 * Minimal, centered login card.
 *   - One Gmail input + one button (minimum-click workflow).
 *   - If the email exists in AuthContext.allowedUsers (via
 *     authService.loginWithEmail) → user is logged in, persisted
 *     to localStorage by the context, and redirected to /dashboard
 *     (or the route they originally requested).
 *   - Otherwise the form shows "Access Denied."
 *
 * Auto-login: if the AuthContext already restored a session from
 * localStorage, this page immediately redirects to /dashboard.
 *
 * FUTURE GOOGLE OAUTH:
 *   - Replace the form with a "Sign in with Google" button that
 *     calls `loginWithGoogle()` from `authService.js`.
 *   - Success/failure handling stays identical.
 */

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import Button from '../components/Button.jsx';
import Input from '../components/Input.jsx';
import './LoginPage.css';

const LoginPage = () => {
  const { login, isAuthenticated, initializing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const redirectTo = location.state?.from || '/dashboard';

  useEffect(() => {
    if (!initializing && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [initializing, isAuthenticated, navigate, redirectTo]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const result = login(email);
    if (result.ok) navigate(redirectTo, { replace: true });
    else setError(result.error);
  };

  return (
    <main className="login">
      <form className="login__card" onSubmit={handleSubmit} noValidate>
        <div className="login__head">
          <span className="login__logo" />
          <h1 className="login__title">Welcome back</h1>
          <p className="login__subtitle">
            Sign in with your authorized email to continue.
          </p>
        </div>

        <Input
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
        />

        <Button type="submit" className="login__submit">
          Login
        </Button>

        <p className="login__hint">
          Only whitelisted accounts can access the dashboard.
        </p>
      </form>
    </main>
  );
};

export default LoginPage;
