/**
 * DashboardPage — Phase 4
 * ----------------------------------------------------------------
 * Orchestrates the dashboard view. Reads ALL data from ProductContext
 * (which itself talks to the services layer); it never touches
 * dummy data or localStorage directly.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/apiClient.js';
import Navbar from '../components/Navbar.jsx';
import FilterPanel from '../components/FilterPanel.jsx';
import ProductTable from '../components/ProductTable.jsx';
import HistoryPanel from '../components/HistoryPanel.jsx';
import StatsCards from '../components/StatsCards.jsx';
import EditProductModal from '../components/EditProductModal.jsx';
import TodayUpdatesModal from '../components/TodayUpdatesModal.jsx';
import { useAuth } from '../context/useAuth.js';
import { useProducts } from '../context/useProducts.js';
import { useDebounce } from '../hooks/useDebounce.js';
import {
  buildOptionCounts,
  filterProducts,
  getAvailableBrands,
  getAvailablePlcs,
  getCtcStatusCounts,
  INITIAL_FILTERS,
} from '../services/productService.js';
import { attachUpdateCounts, countEditSessions } from '../utils/countUpdates.js';
import { attachCtcUpdateStatus } from '../utils/ctcUpdateStatus.js';
import { groupBySession } from '../utils/historyGrouping.js';
import { isSameLocalDay, parseTimestamp } from '../utils/format.js';
import './DashboardPage.css';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEARCH_LIST_LIMIT = 60;

const DashboardPage = () => {
  const { user } = useAuth();
  const {
    products,
    history,
    ctcUpdatedAsins,
    loading,
    error,
    savingId,
    saveProductEdit,
    refresh,
  } = useProducts();

  const [searchInput, setSearchInput] = useState(INITIAL_FILTERS.search);
  const [brand, setBrand] = useState(INITIAL_FILTERS.brand);
  const [plc, setPlc] = useState(INITIAL_FILTERS.plc);
  const [ctcStatus, setCtcStatus] = useState(INITIAL_FILTERS.ctcStatus);
  const debouncedSearch = useDebounce(searchInput, 200);

  const [editingAsin, setEditingAsin] = useState(null);
  const [editQueue, setEditQueue] = useState([]);
  const [selectedAsins, setSelectedAsins] = useState(() => new Set());
  const [showMyUpdates, setShowMyUpdates] = useState(false);
  const bulkCtcPendingRef = useRef([]);
  const [statsTime, setStatsTime] = useState(() => Date.now());

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      brand,
      plc,
      ctcStatus,
    }),
    [debouncedSearch, brand, plc, ctcStatus],
  );

  const instantFilters = useMemo(
    () => ({
      search: searchInput,
      brand,
      plc,
      ctcStatus,
    }),
    [searchInput, brand, plc, ctcStatus],
  );

  const currentEmail = String(user?.email || '').trim().toLowerCase();

  const productsWithCounts = useMemo(() => {
    const withSessions = attachUpdateCounts(products, history);
    return attachCtcUpdateStatus(withSessions, history, ctcUpdatedAsins);
  }, [products, history, ctcUpdatedAsins]);

  const visibleProducts = useMemo(
    () => filterProducts(productsWithCounts, filters),
    [productsWithCounts, filters],
  );

  const availablePlcs = useMemo(
    () => getAvailablePlcs(productsWithCounts, instantFilters),
    [productsWithCounts, instantFilters.brand, instantFilters.search],
  );

  const availableBrands = useMemo(
    () => getAvailableBrands(productsWithCounts, instantFilters),
    [productsWithCounts, instantFilters.plc, instantFilters.search],
  );

  const plcCounts = useMemo(
    () => buildOptionCounts(productsWithCounts, instantFilters, 'plc'),
    [productsWithCounts, instantFilters],
  );

  const brandCounts = useMemo(
    () => buildOptionCounts(productsWithCounts, instantFilters, 'brand'),
    [productsWithCounts, instantFilters],
  );

  const ctcStatusCounts = useMemo(
    () => getCtcStatusCounts(productsWithCounts, instantFilters),
    [productsWithCounts, instantFilters],
  );

  const searchListProducts = useMemo(() => {
    const matched = filterProducts(productsWithCounts, instantFilters);
    return matched.slice(0, SEARCH_LIST_LIMIT);
  }, [productsWithCounts, instantFilters]);

  useEffect(() => {
    if (brand && !availableBrands.includes(brand)) {
      setBrand('');
    }
  }, [brand, availableBrands]);

  useEffect(() => {
    if (plc && !availablePlcs.includes(plc)) {
      setPlc('');
    }
  }, [plc, availablePlcs]);

  useEffect(() => {
    setSelectedAsins((prev) => {
      const visible = new Set(visibleProducts.map((p) => p.asin));
      const next = new Set([...prev].filter((asin) => visible.has(asin)));
      return next.size === prev.size ? prev : next;
    });
  }, [visibleProducts]);

  const handleBrandChange = useCallback(
    (nextBrand) => {
      setBrand(nextBrand);
      if (plc && nextBrand) {
        const stillValid = productsWithCounts.some(
          (p) =>
            String(p.brand || '').trim() === nextBrand &&
            String(p.plc || '').trim() === plc,
        );
        if (!stillValid) setPlc('');
      }
    },
    [plc, productsWithCounts],
  );

  const handlePlcChange = useCallback(
    (nextPlc) => {
      setPlc(nextPlc);
      if (brand && nextPlc) {
        const stillValid = productsWithCounts.some(
          (p) =>
            String(p.plc || '').trim() === nextPlc &&
            String(p.brand || '').trim() === brand,
        );
        if (!stillValid) setBrand('');
      }
    },
    [brand, productsWithCounts],
  );

  const handlePickProduct = useCallback((product) => {
    setSearchInput(product.asin || '');
    if (product.brand) setBrand(String(product.brand).trim());
    if (product.plc) setPlc(String(product.plc).trim());
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchInput(INITIAL_FILTERS.search);
    setBrand(INITIAL_FILTERS.brand);
    setPlc(INITIAL_FILTERS.plc);
    setCtcStatus(INITIAL_FILTERS.ctcStatus);
  }, []);

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

    const todayHistory = history.filter((h) =>
      isSameLocalDay(h.timestamp, refDate),
    );

    const recentRows = history.filter((h) => {
      const ts = parseTimestamp(h.timestamp);
      return ts && statsTime - ts.getTime() <= ONE_DAY_MS;
    });

    return {
      totalProducts: products.length,
      totalUpdates: countEditSessions(history),
      productsUpdatedToday: new Set(
        groupBySession(todayHistory).map((s) => s.asin).filter(Boolean),
      ).size,
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

  const bulkProgress = useMemo(() => {
    if (!editQueue.length || !editingAsin) return null;
    const idx = editQueue.indexOf(editingAsin);
    if (idx < 0) return null;
    return { current: idx + 1, total: editQueue.length };
  }, [editQueue, editingAsin]);

  const handleToggleSelect = useCallback((asin) => {
    setSelectedAsins((prev) => {
      const next = new Set(prev);
      if (next.has(asin)) next.delete(asin);
      else next.add(asin);
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(
    (clearOnly = false) => {
      if (clearOnly) {
        setSelectedAsins(new Set());
        return;
      }
      setSelectedAsins((prev) => {
        const visibleAsins = visibleProducts.map((p) => p.asin);
        const allSelected =
          visibleAsins.length > 0 && visibleAsins.every((asin) => prev.has(asin));
        if (allSelected) return new Set();
        return new Set(visibleAsins);
      });
    },
    [visibleProducts],
  );

  const flushBulkCtcEmail = useCallback(async () => {
    const items = bulkCtcPendingRef.current;
    bulkCtcPendingRef.current = [];
    if (!items.length) return;

    try {
      await api.notifyCategoryTeamCostBatch({
        items,
        updatedBy: user?.email || 'unknown',
        timestamp: new Date().toLocaleString('en-IN'),
      });
    } catch (err) {
      console.error('Bulk Category Team Cost email failed:', err);
    }
  }, [user?.email]);

  const collectBulkCtcChange = useCallback((result, product) => {
    const ctc = (result.changes || []).find((c) => c.key === 'categoryTeamCost');
    if (!ctc) return;

    bulkCtcPendingRef.current.push({
      asin: result.product?.asin || product.asin,
      brand: result.product?.brand || product.brand,
      modelNo: result.product?.modelNo || product.modelNo,
      packSize: result.product?.packSize || product.packSize,
      oldValue: ctc.oldValue,
      newValue: ctc.newValue,
    });
  }, []);

  const handleSingleEdit = useCallback((product) => {
    bulkCtcPendingRef.current = [];
    setEditQueue([]);
    setEditingAsin(product.asin);
  }, []);

  const buildSelectionQueue = useCallback(
    (orderSource) =>
      orderSource
        .filter((p) => selectedAsins.has(p.asin))
        .map((p) => p.asin),
    [selectedAsins],
  );

  const startEditQueue = useCallback(
    (orderSource) => {
      const queue = buildSelectionQueue(orderSource);
      if (queue.length === 0) return;

      bulkCtcPendingRef.current = [];

      if (queue.length === 1) {
        setEditQueue([]);
        setEditingAsin(queue[0]);
        return;
      }

      setEditQueue(queue);
      setEditingAsin(queue[0]);
    },
    [buildSelectionQueue],
  );

  const handleStartBulkEdit = useCallback(() => {
    const queue = buildSelectionQueue(visibleProducts);
    if (queue.length < 2) return;
    startEditQueue(visibleProducts);
  }, [visibleProducts, buildSelectionQueue, startEditQueue]);

  const handleStartBulkEditFromSearch = useCallback(() => {
    startEditQueue(searchListProducts);
  }, [searchListProducts, startEditQueue]);

  const handleEditSelectedFromSearch = useCallback(() => {
    startEditQueue(searchListProducts);
  }, [searchListProducts, startEditQueue]);

  const handleToggleSelectAllInSearchList = useCallback(() => {
    setSelectedAsins((prev) => {
      const asins = searchListProducts.map((p) => p.asin);
      const allSelected =
        asins.length > 0 && asins.every((asin) => prev.has(asin));
      if (allSelected) {
        const next = new Set(prev);
        asins.forEach((asin) => next.delete(asin));
        return next;
      }
      return new Set([...prev, ...asins]);
    });
  }, [searchListProducts]);

  const advanceBulkEdit = useCallback(() => {
    const idx = editQueue.indexOf(editingAsin);
    const nextAsin = idx >= 0 ? editQueue[idx + 1] : null;
    if (nextAsin) {
      setEditingAsin(nextAsin);
      return;
    }
    void flushBulkCtcEmail();
    setEditingAsin(null);
    setEditQueue([]);
  }, [editQueue, editingAsin, flushBulkCtcEmail]);

  const handleCloseEdit = useCallback(() => {
    void flushBulkCtcEmail();
    setEditingAsin(null);
    setEditQueue([]);
  }, [flushBulkCtcEmail]);

  const handleClearSelection = useCallback(() => {
    void flushBulkCtcEmail();
    setEditingAsin(null);
    setEditQueue([]);
    setSelectedAsins(new Set());
  }, [flushBulkCtcEmail]);

  const handleEditSave = useCallback(
    async (updates) => {
      if (!editingProduct) {
        return { ok: false, error: 'No product selected.' };
      }

      const inBulk = editQueue.length > 0;
      const result = await saveProductEdit(editingProduct.id, updates, {
        suppressEmail: inBulk,
      });
      if (!result?.ok) return result;

      if (inBulk) {
        collectBulkCtcChange(result, editingProduct);
        const idx = editQueue.indexOf(editingAsin);
        const nextAsin = idx >= 0 ? editQueue[idx + 1] : null;
        if (nextAsin) {
          setEditingAsin(nextAsin);
          return { ok: true, keepOpen: true, product: result.product };
        }
        setEditQueue([]);
        setEditingAsin(null);
        await flushBulkCtcEmail();
        return { ok: true, product: result.product };
      }

      setEditingAsin(null);
      return { ok: true, product: result.product };
    },
    [
      editQueue,
      editingAsin,
      editingProduct,
      saveProductEdit,
      collectBulkCtcChange,
      flushBulkCtcEmail,
    ],
  );

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
              searchInput={searchInput}
              onSearchInputChange={setSearchInput}
              brand={brand}
              plc={plc}
              ctcStatus={ctcStatus}
              onBrandChange={handleBrandChange}
              onPlcChange={handlePlcChange}
              onCtcStatusChange={setCtcStatus}
              onPickProduct={handlePickProduct}
              selectedAsins={selectedAsins}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAllInList={handleToggleSelectAllInSearchList}
              onStartBulkEdit={handleStartBulkEditFromSearch}
              onEditSelected={handleEditSelectedFromSearch}
              onReset={handleResetFilters}
              availablePlcs={availablePlcs}
              availableBrands={availableBrands}
              plcCounts={plcCounts}
              brandCounts={brandCounts}
              ctcStatusCounts={ctcStatusCounts}
              listProducts={searchListProducts}
              resultCount={visibleProducts.length}
              totalCount={products.length}
            />
            <ProductTable
              products={visibleProducts}
              onEdit={handleSingleEdit}
              onBulkEdit={handleStartBulkEdit}
              selectedAsins={selectedAsins}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              onClearSelection={handleClearSelection}
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
          onClose={handleCloseEdit}
          onSave={handleEditSave}
          onSkip={advanceBulkEdit}
          isSaving={savingId === editingProduct.id}
          bulkProgress={bulkProgress}
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
