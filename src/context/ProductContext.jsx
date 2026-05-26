/**
 * ProductContext — Phase 4
 * ----------------------------------------------------------------
 * Centralized state + orchestration for products and price history.
 *
 * Responsibilities:
 *   - Load products + history through the services layer on mount
 *     (fake async today, real network calls tomorrow).
 *   - Expose `updatePrice(id, newPrice)` which:
 *        1. delegates the data write to productService
 *        2. constructs the audit-log entry (with updateNumber)
 *        3. delegates the log write to historyService
 *        4. updates local state for instant UI feedback
 *        5. fires a toast for user confirmation
 *   - Expose `loading`, `error`, `refresh()` for the UI's
 *     loading-/empty-/error-state architecture.
 *
 * Strict layering — components NEVER import services directly.
 * They only consume `useProducts()`. This is what makes the
 * Phase 5 swap to Google Sheets a one-file change.
 *
 * FUTURE INTEGRATION POINTS (no UI changes required):
 *   - Replace storage-backed services with Sheets API / Node backend.
 *   - Add subscription (SSE or polling) here to sync across tabs.
 *   - Add role-based gating around `updatePrice` (read `useAuth().user.role`).
 */

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import {
  getAllProducts,
  updateProductPrice as svcUpdatePrice,
} from '../services/productService.js';
import {
  getHistory,
  addHistoryRecord,
} from '../services/historyService.js';
import { formatPrice, formatTimestamp } from '../utils/format.js';
import { useAuth } from './useAuth.js';
import { useToast } from './useToast.js';

const ProductContext = createContext(null);

export const ProductProvider = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const loadAll = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [p, h] = await Promise.all([getAllProducts(), getHistory()]);
      setProducts(p);
      setHistory(h);
    } catch (e) {
      setError(e?.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, h] = await Promise.all([getAllProducts(), getHistory()]);
        if (cancelled) return;
        setProducts(p);
        setHistory(h);
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updatePrice = useCallback(
    async (id, newPrice) => {
      setSavingId(id);
      try {
        const result = await svcUpdatePrice({ id, newPrice });
        if (!result.ok) {
          showToast(result.error || 'Update failed.', 'error');
          return result;
        }

        const entry = {
          id: `h-${Date.now()}-${id}`,
          asin: result.product.asin,
          oldPrice: result.oldPrice,
          newPrice: result.product.currentPrice,
          updatedBy: user?.email || 'unknown',
          timestamp: formatTimestamp(new Date()),
          updateNumber: result.product.totalUpdates,
        };

        await addHistoryRecord(entry);

        setProducts((prev) =>
          prev.map((p) => (p.id === id ? result.product : p)),
        );
        setHistory((prev) => [entry, ...prev]);

        showToast(
          `Saved · ${entry.asin} → ${formatPrice(entry.newPrice)}`,
          'success',
        );

        return { ok: true, entry };
      } catch (e) {
        const msg = e?.message || 'Update failed.';
        showToast(msg, 'error');
        return { ok: false, error: msg };
      } finally {
        setSavingId(null);
      }
    },
    [user, showToast],
  );

  const value = useMemo(
    () => ({
      products,
      history,
      loading,
      error,
      savingId,
      updatePrice,
      refresh: loadAll,
    }),
    [products, history, loading, error, savingId, updatePrice, loadAll],
  );

  return (
    <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
  );
};

export default ProductContext;
