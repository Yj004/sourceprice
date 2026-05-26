/**
 * storage.js — Phase 4
 * ----------------------------------------------------------------
 * Tiny, defensive wrapper around `localStorage`. Every domain
 * service (`productService`, `historyService`) goes through this
 * module so they never touch `localStorage` directly.
 *
 * Why this matters:
 *   When Phase 5 swaps the data source to Google Sheets / a real
 *   backend, the domain services replace these `storage.get/set`
 *   calls with `fetch(...)` calls. Nothing else in the codebase
 *   needs to change.
 *
 * FUTURE INTEGRATION POINTS:
 *   - Google Sheets REST API (sheets.googleapis.com)
 *   - Apps Script Webhook (script.google.com/macros/.../exec)
 *   - Node backend (/api/...)
 *   - MongoDB collection (via the same Node backend)
 *
 * The same key names will become the API resource paths
 * (e.g. PRODUCTS_KEY → GET /api/products).
 */

const isBrowser = typeof window !== 'undefined' && !!window.localStorage;

export const storageKeys = {
  PRODUCTS: 'sourceprice.products',
  HISTORY: 'sourceprice.history',
};

export const storage = {
  get(key, fallback = null) {
    if (!isBrowser) return fallback;
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    if (!isBrowser) return false;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove(key) {
    if (!isBrowser) return;
    localStorage.removeItem(key);
  },
};

export default storage;
