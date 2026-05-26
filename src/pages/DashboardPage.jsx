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
import { useProducts } from '../context/useProducts.js';
import { filterProducts } from '../services/productService.js';
import { parseTimestamp, toDateKey } from '../utils/format.js';
import './DashboardPage.css';

const INITIAL_FILTERS = {
  q: '',
  asin: '',
  brand: '',
  modelNo: '',
  masterCategory: '',
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const DashboardPage = () => {
  const { products, history, loading, error, savingId, updatePrice, refresh } =
    useProducts();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  // `statsTime` snapshots "now" so stats are pure w.r.t. their deps.
  // It is initialized lazily on mount and bumped whenever the user
  // explicitly refreshes — keeping the 24h rolling window honest
  // without recomputing on every unrelated render.
  const [statsTime, setStatsTime] = useState(() => Date.now());

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.masterCategory))).sort(),
    [products],
  );

  const visibleProducts = useMemo(
    () => filterProducts(products, filters),
    [products, filters],
  );

  const stats = useMemo(() => {
    const todayKey = toDateKey(new Date(statsTime));

    const totalUpdates = products.reduce(
      (sum, p) => sum + (p.totalUpdates || 0),
      0,
    );

    const todayHistory = history.filter((h) =>
      String(h.timestamp || '').startsWith(todayKey),
    );

    const recentActivity = history.filter((h) => {
      const ts = parseTimestamp(h.timestamp);
      return ts && statsTime - ts.getTime() <= ONE_DAY_MS;
    }).length;

    return {
      totalProducts: products.length,
      totalUpdates,
      productsUpdatedToday: new Set(todayHistory.map((h) => h.asin)).size,
      recentActivity,
    };
  }, [products, history, statsTime]);

  const handleRefresh = async () => {
    setStatsTime(Date.now());
    await refresh();
  };

  return (
    <>
      <Navbar />
      <main className="dash">
        <header className="dash__head">
          <div>
            <h1 className="dash__title">Price Management</h1>
            <p className="dash__subtitle">
              Click <strong>Edit</strong> on any row, type the new price, press
              <kbd className="dash__kbd">Enter</kbd> to save.
            </p>
          </div>
          <button
            type="button"
            className="dash__refresh"
            onClick={handleRefresh}
            disabled={loading}
            title="Reload data"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </header>

        <StatsCards stats={stats} loading={loading} />

        <div className="dash__layout">
          <FilterPanel
            value={filters}
            onChange={setFilters}
            onReset={() => setFilters(INITIAL_FILTERS)}
            categories={categories}
            resultCount={visibleProducts.length}
            totalCount={products.length}
          />

          <section className="dash__table">
            <ProductTable
              products={visibleProducts}
              onSave={updatePrice}
              loading={loading}
              error={error}
              savingId={savingId}
            />
          </section>

          <HistoryPanel entries={history} loading={loading} />
        </div>
      </main>
    </>
  );
};

export default DashboardPage;
