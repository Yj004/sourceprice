/**
 * Navbar — Phase 2
 * Top bar shown on authenticated pages. Brand on the left,
 * user pill + Logout on the right.
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import Button from './Button.jsx';
import './Navbar.css';

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
          <span className="navbar__dot" />
          sourcePrice
        </div>

        <div className="navbar__right">
          {user && (
            <span className="navbar__user" title={user.email}>
              {user.email}
            </span>
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
