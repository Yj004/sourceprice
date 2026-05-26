/**
 * App — Phase 4
 * ----------------------------------------------------------------
 * Provider hierarchy (outer → inner):
 *
 *   AuthProvider     → who is logged in (consumed by ProductContext)
 *     ToastProvider  → app-wide notifications (consumed by ProductContext)
 *       ProductProvider
 *                    → loads products + history via services layer
 *                      and exposes updatePrice() to all components
 *         BrowserRouter
 *           Routes   → /login (public) + /dashboard (protected)
 *
 * To add a new private page:
 *   1. Create the page in /pages.
 *   2. Add a <Route> under <ProtectedRoute> below.
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { ProductProvider } from './context/ProductContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import './App.css';

const App = () => (
  <AuthProvider>
    <ToastProvider>
      <ProductProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ProductProvider>
    </ToastProvider>
  </AuthProvider>
);

export default App;
