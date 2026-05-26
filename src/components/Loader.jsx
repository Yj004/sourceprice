/**
 * Loader — full-screen "boot" spinner.
 * Used by ProtectedRoute while AuthContext is still rehydrating
 * the session from localStorage (avoids a /login flash).
 */

import './Loader.css';

const Loader = ({ label = 'Loading…' }) => (
  <div className="loader" role="status" aria-live="polite">
    <span className="loader__spinner" aria-hidden />
    <span className="loader__label">{label}</span>
  </div>
);

export default Loader;
