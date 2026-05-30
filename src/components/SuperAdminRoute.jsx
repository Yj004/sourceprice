import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import Loader from './Loader.jsx';

const SuperAdminRoute = () => {
  const { isAuthenticated, isSuperAdmin, initializing } = useAuth();

  if (initializing) return <Loader label="Loading…" />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: '/admin/users' }} />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default SuperAdminRoute;
