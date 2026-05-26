/**
 * productService — Phase 4
 * ----------------------------------------------------------------
 * Domain service for everything product-related. Today it persists
 * to `localStorage` via `storage.js`; tomorrow it will hit Google
 * Sheets / a Node backend / MongoDB without anything above this
 * layer needing to change.
 *
 * Architectural flow:
 *   UI -> ProductContext -> productService -> storage (localStorage)
 *                                                ^
 *                              SWAP POINT for future Google Sheets API
 *
 * Public API:
 *   getAllProducts()                       Promise<Product[]>
 *   updateProductPrice({ id, newPrice })   Promise<{ ok, product?, oldPrice?, error? }>
 *   filterProducts(products, filters)      Product[]    (pure, sync)
 *
 * All async functions deliberately use a small artificial delay to
 * exercise the loading states in the UI — when real network calls
 * replace them, the UI keeps working without changes.
 *
 * FUTURE GOOGLE SHEETS INTEGRATION POINTS:
 *   - getAllProducts():
 *       fetch(`${API_BASE}/sheets/products`)  → JSON rows
 *   - updateProductPrice():
 *       fetch(`${API_BASE}/sheets/products/${id}`, {
 *         method: 'PATCH', body: JSON.stringify({ newPrice })
 *       })
 *       (Or post to an Apps Script Webhook.)
 *
 * FUTURE ROLE-BASED ACCESS / MULTI-USER:
 *   - Accept an `actor` argument here and forward it to the server
 *     so writes are audit-logged with the acting user's identity.
 */

import { mainData } from '../data/dummyData.js';
import storage, { storageKeys } from './storage.js';

const ARTIFICIAL_DELAY_MS = 220;
const delay = (ms = ARTIFICIAL_DELAY_MS) => new Promise((r) => setTimeout(r, ms));

const ensureSchema = (product) => ({
  totalUpdates: 0,
  ...product,
});

const loadFromStorage = () => {
  const stored = storage.get(storageKeys.PRODUCTS);
  if (Array.isArray(stored) && stored.length) return stored.map(ensureSchema);

  const seeded = mainData.map(ensureSchema);
  storage.set(storageKeys.PRODUCTS, seeded);
  return seeded;
};

export const getAllProducts = async () => {
  await delay();
  return loadFromStorage();
};

export const updateProductPrice = async ({ id, newPrice }) => {
  await delay(140);

  const priceNumber = Number(newPrice);
  if (!Number.isFinite(priceNumber) || priceNumber < 0) {
    return { ok: false, error: 'Please enter a valid price.' };
  }

  const products = loadFromStorage();
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return { ok: false, error: 'Product not found.' };

  const current = products[idx];
  if (current.currentPrice === priceNumber) {
    return { ok: false, error: 'Price unchanged.' };
  }

  const updated = {
    ...current,
    currentPrice: priceNumber,
    totalUpdates: (current.totalUpdates || 0) + 1,
  };

  const next = [...products];
  next[idx] = updated;
  storage.set(storageKeys.PRODUCTS, next);

  return { ok: true, product: updated, oldPrice: current.currentPrice };
};

/**
 * Pure filter — kept here (not in a component) so the same filter
 * logic can later run server-side without changes.
 */
export const filterProducts = (products, filters = {}) => {
  const q = String(filters.q || '').trim().toLowerCase();
  const asin = String(filters.asin || '').trim().toLowerCase();
  const brand = String(filters.brand || '').trim().toLowerCase();
  const modelNo = String(filters.modelNo || '').trim().toLowerCase();
  const category = filters.masterCategory || '';

  if (!q && !asin && !brand && !modelNo && !category) return products;

  return products.filter((p) => {
    if (asin && !p.asin.toLowerCase().includes(asin)) return false;
    if (brand && !p.brand.toLowerCase().includes(brand)) return false;
    if (modelNo && !p.modelNo.toLowerCase().includes(modelNo)) return false;
    if (category && p.masterCategory !== category) return false;
    if (q) {
      const hay =
        `${p.asin} ${p.brand} ${p.modelNo} ${p.masterCategory}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
};

/** Test helper / future "factory reset" button. */
export const resetProducts = async () => {
  storage.remove(storageKeys.PRODUCTS);
  return getAllProducts();
};
