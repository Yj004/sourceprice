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
  updateProduct as svcUpdateProduct,
  updateProductPrice as svcUpdatePrice,
} from '../services/productService.js';
import {
  getHistory,
  addHistoryRecord,
} from '../services/historyService.js';
import { formatPrice, formatTimestamp } from '../utils/format.js';
import { getCtcUpdatedAsinSet } from '../utils/ctcUpdateStatus.js';
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
  const [ctcUpdatedAsins, setCtcUpdatedAsins] = useState(() => new Set());

  const loadAll = useCallback(async () => {
    if (!user?.token) return;
    setError(null);
    setLoading(true);
    try {
      const [p, h] = await Promise.all([getAllProducts(), getHistory()]);
      setProducts(p);
      setHistory(h);
      setCtcUpdatedAsins(getCtcUpdatedAsinSet(h));
    } catch (e) {
      setError(e?.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    if (!user?.token) {
      setProducts([]);
      setHistory([]);
      setCtcUpdatedAsins(new Set());
      setError(null);
      setLoading(false);
      return;
    }
    loadAll();
  }, [user?.token, loadAll]);

  const updatePrice = useCallback(
    async (id, newPrice) => {
      setSavingId(id);
      try {
        const result = await svcUpdatePrice({
          id,
          newPrice,
          updatedBy: user?.email || 'unknown',
        });
        if (!result.ok) {
          showToast(result.error || 'Update failed.', 'error');
          return result;
        }

        const entry =
          result.entry || {
            id: `h-${Date.now()}-${id}`,
            asin: result.product.asin,
            oldPrice: result.oldPrice,
            newPrice: result.product.currentPrice,
            updatedBy: user?.email || 'unknown',
            timestamp: formatTimestamp(new Date()),
            updateNumber: result.product.totalUpdates,
          };

        await addHistoryRecord(entry);

        setHistory((prev) => {
          const asin = result.product.asin;
          const updateNumber =
            prev.filter((h) => h.asin === asin).length + 1;
          return [{ ...entry, updateNumber }, ...prev];
        });

        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...result.product } : p)),
        );

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

  /**
   * Save a multi-field edit from the popup modal.
   *
   *   id      = product ASIN
   *   updates = partial map of editable keys → numbers
   *
   * After a successful write we refresh `products` with the canonical
   * post-write row and reload `history` so the new audit rows appear
   * in the right order. We do a full history reload (cheap, single
   * GET) rather than synthesising rows client-side because the server
   * appends multiple rows in one save and assigns the canonical timestamps.
   */
  const saveProductEdit = useCallback(
    async (id, updates, options = {}) => {
      setSavingId(id);
      try {
        const result = await svcUpdateProduct({
          id,
          updates,
          updatedBy: user?.email || 'unknown',
          suppressEmail: Boolean(options.suppressEmail),
        });
        if (!result.ok) {
          showToast(result.error || 'Update failed.', 'error');
          return result;
        }

        const asin = result.product?.asin || id;
        const changedFields = result.changedFields || [];
        const ctcChanged =
          changedFields.includes('categoryTeamCost') ||
          (result.changes || []).some((c) => c.key === 'categoryTeamCost');

        setProducts((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...result.product,
                  ...(ctcChanged
                    ? {
                        ctcEverUpdated: true,
                        ctcUpdateCount: Math.max(
                          p.ctcUpdateCount || 0,
                          result.product?.ctcUpdateCount || 1,
                        ),
                      }
                    : {}),
                }
              : p,
          ),
        );

        if (result.entry) {
          setHistory((prev) => {
            const next = [result.entry, ...prev];
            queueMicrotask(() =>
              setCtcUpdatedAsins(getCtcUpdatedAsinSet(next)),
            );
            return next;
          });
        } else if (ctcChanged) {
          setCtcUpdatedAsins((s) => new Set(s).add(asin));
        }

        const changedCount = (result.changedFields || []).length;
        const summary =
          changedCount > 0
            ? `Saved · ${result.product.asin} · ${changedCount} field${changedCount === 1 ? '' : 's'} updated`
            : `Saved · ${result.product.asin}`;
        showToast(summary, 'success');

        const email = result.email;
        if (email?.ok) {
          showToast('CTC email alert sent to the team', 'success');
        } else if (email && !email.skipped && email.error) {
          showToast(`Saved, but CTC email failed: ${email.error}`, 'error');
        } else if (email?.skipped && email.reason === 'smtp_not_configured') {
          showToast('Saved — SMTP not configured (no CTC email)', 'error');
        }

        return {
          ok: true,
          product: result.product,
          changes: result.changes || [],
          timestamp: result.timestamp,
          email,
        };
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
      ctcUpdatedAsins,
      loading,
      error,
      savingId,
      updatePrice,
      saveProductEdit,
      refresh: loadAll,
    }),
    [
      products,
      history,
      ctcUpdatedAsins,
      loading,
      error,
      savingId,
      updatePrice,
      saveProductEdit,
      loadAll,
    ],
  );

  return (
    <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
  );
};

export default ProductContext;
