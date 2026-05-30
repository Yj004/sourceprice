/**
 * ProtectedRoute — Phase 2
 * ----------------------------------------------------------------
 * Loading-safe route guard:
 *   1. While AuthContext is rehydrating from localStorage
 *      (`initializing === true`), render a Loader so we never
 *      flash the LoginPage on a hard refresh.
 *   2. After rehydrate, if not authenticated → redirect to /login,
 *      preserving the originally requested path so the user is
 *      returned there after a successful login.
 *
 * Usage:
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/dashboard" element={<DashboardPage />} />
 *   </Route>
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import Loader from './Loader.jsx';

const ProtectedRoute = ({ children }) => {
  const { user, isAuthenticated, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <Loader label="Restoring session…" />;

  if (!isAuthenticated || !user?.token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children ?? <Outlet />;
};

export default ProtectedRoute;
