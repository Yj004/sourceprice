/**
 * DashboardPage — Phase 4
 * ----------------------------------------------------------------
 * Orchestrates the dashboard view. Reads ALL data from ProductContext
 * (which itself talks to the services layer); it never touches
 * dummy data or localStorage directly.
 *
 *   Navbar
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  Stats cards (4)                                             │
 *   ├──────┬──────────────────────────────┬─────────────────────┤
 *   │ Flt  │   Product Table (filtered)   │  Recent History     │
 *   └──────┴──────────────────────────────┴─────────────────────┘
 *
 * Layers:
 *   - Filter state lives here (it's UI-only).
 *   - Visible products derived via productService.filterProducts.
 *   - Stats derived via useMemo from products + history.
 */

import { useMemo, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import FilterPanel from '../components/FilterPanel.jsx';
import ProductTable from '../components/ProductTable.jsx';
import HistoryPanel from '../components/HistoryPanel.jsx';
import StatsCards from '../components/StatsCards.jsx';
import EditProductModal from '../components/EditProductModal.jsx';
import TodayUpdatesModal from '../components/TodayUpdatesModal.jsx';
import { useAuth } from '../context/useAuth.js';
import { useProducts } from '../context/useProducts.js';
import { filterProducts, INITIAL_FILTERS } from '../services/productService.js';
import { attachUpdateCounts, countEditSessions } from '../utils/countUpdates.js';
import { isSameLocalDay, parseTimestamp } from '../utils/format.js';
import './DashboardPage.css';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const DashboardPage = () => {
  const { user } = useAuth();
  const {
    products,
    history,
    loading,
    error,
    savingId,
    saveProductEdit,
    refresh,
  } = useProducts();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [editingAsin, setEditingAsin] = useState(null);
  const [showMyUpdates, setShowMyUpdates] = useState(false);
  // `statsTime` snapshots "now" so stats are pure w.r.t. their deps.
  // It is initialized lazily on mount and bumped whenever the user
  // explicitly refreshes — keeping the 24h rolling window honest
  // without recomputing on every unrelated render.
  const [statsTime, setStatsTime] = useState(() => Date.now());

  const currentEmail = String(user?.email || '').trim().toLowerCase();

  const productsWithCounts = useMemo(
    () => attachUpdateCounts(products, history),
    [products, history],
  );

  const visibleProducts = useMemo(
    () => filterProducts(productsWithCounts, filters),
    [productsWithCounts, filters],
  );

  // History rows authored by the current user on today's local date.
  // Powers both the "My Updates Today" KPI and the modal it opens.
  const myTodayHistory = useMemo(() => {
    if (!currentEmail) return [];
    const refDate = new Date(statsTime);
    return history.filter(
      (h) =>
        String(h.updatedBy || '').trim().toLowerCase() === currentEmail &&
        isSameLocalDay(h.timestamp, refDate),
    );
  }, [history, currentEmail, statsTime]);

  const stats = useMemo(() => {
    const refDate = new Date(statsTime);

    const totalUpdates = countEditSessions(history);

    const todayHistory = history.filter((h) =>
      isSameLocalDay(h.timestamp, refDate),
    );

    const recentRows = history.filter((h) => {
      const ts = parseTimestamp(h.timestamp);
      return ts && statsTime - ts.getTime() <= ONE_DAY_MS;
    });

    return {
      totalProducts: products.length,
      totalUpdates,
      productsUpdatedToday: new Set(todayHistory.map((h) => h.asin)).size,
      recentActivity: countEditSessions(recentRows),
      myUpdatesToday: countEditSessions(myTodayHistory),
    };
  }, [products, history, statsTime, myTodayHistory]);

  const handleRefresh = async () => {
    setStatsTime(Date.now());
    await refresh();
  };

  const editingProduct = useMemo(
    () => productsWithCounts.find((p) => p.asin === editingAsin) || null,
    [productsWithCounts, editingAsin],
  );

  const handleEditSave = (updates) =>
    saveProductEdit(editingProduct.id, updates);

  return (
    <>
      <Navbar />
      <main className="dash">
        <header className="dash__head">
          <div className="dash__heading">
            <h1 className="dash__title">Price Management</h1>
            <p className="dash__subtitle">
              Click <strong>Edit</strong> on any row to open the cost
              breakdown popup — update every component, the total
              recalculates live.
            </p>
          </div>
          <button
            type="button"
            className="dash__refresh"
            onClick={handleRefresh}
            disabled={loading}
            title="Reload data"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </header>

        <StatsCards
          stats={stats}
          loading={loading}
          onOpenMyUpdates={() => setShowMyUpdates(true)}
        />

        <div className="dash__layout">
          <section className="dash__main">
            <FilterPanel
              value={filters}
              onChange={setFilters}
              onReset={() => setFilters(INITIAL_FILTERS)}
              products={productsWithCounts}
              resultCount={visibleProducts.length}
              totalCount={products.length}
            />
            <ProductTable
              products={visibleProducts}
              onEdit={(p) => setEditingAsin(p.asin)}
              loading={loading}
              error={error}
              savingId={savingId}
            />
          </section>

          <HistoryPanel entries={history} loading={loading} />
        </div>
      </main>

      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingAsin(null)}
          onSave={handleEditSave}
          isSaving={savingId === editingProduct.id}
        />
      )}

      {showMyUpdates && (
        <TodayUpdatesModal
          entries={myTodayHistory}
          userEmail={user?.email || ''}
          onClose={() => setShowMyUpdates(false)}
          onNavigate={() => setShowMyUpdates(false)}
        />
      )}
    </>
  );
};

export default DashboardPage;
