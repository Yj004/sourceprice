/**
 * Navbar
 * ----------------------------------------------------------------
 * Sticky top bar shown on authenticated pages.
 *   - Gradient brand mark on the left (matches the login logo).
 *   - Current-user avatar + email pill on the right (collapses to
 *     just the avatar on small mobile).
 *   - Logout button.
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import Button from './Button.jsx';
import './Navbar.css';

const initialOf = (email) => String(email || '?').trim().charAt(0).toUpperCase();

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <div className="navbar__brand">
          <span className="navbar__logo" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 17l6-6 4 4 8-8" />
              <path d="M14 7h7v7" />
            </svg>
          </span>
          <span className="navbar__brand-name">sourcePrice</span>
        </div>

        <div className="navbar__right">
          {user && (
            <div className="navbar__user" title={user.email}>
              <span className="navbar__avatar" aria-hidden="true">
                {initialOf(user.email)}
              </span>
              <span className="navbar__email">{user.email}</span>
            </div>
          )}
          <Button variant="ghost" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
