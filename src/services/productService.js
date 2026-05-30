/**
 * productService — Google Sheets via backend API
 */

import api from './apiClient.js';

export const getAllProducts = async () => api.getProducts();

export const updateProductPrice = async ({ id, newPrice, updatedBy }) => {
  const result = await api.updatePrice(id, newPrice, updatedBy);
  return result;
};

export const updateProduct = async ({ id, updates, updatedBy }) => {
  const result = await api.updateProduct(id, updates, updatedBy);
  return result;
};

/**
 * Pure filter — kept here so the same logic can later run server-side.
 *
 * Accepts a partial map of `{ q, plc, brand, masterCategory }`.
 * All non-empty entries are AND-combined. `q` is a free-text search
 * that matches against ASIN / brand / model / PLC / category / pack
 * size (case-insensitive substring). The other keys do a
 * case-insensitive substring match on the corresponding product field
 * (so typing "rob" matches "Robustt" too).
 *
 * `INITIAL_FILTERS` is the canonical empty state — exported so the
 * UI and any future server route stay in sync about the shape.
 */
export const INITIAL_FILTERS = {
  q: '',
  plc: '',
  brand: '',
  masterCategory: '',
};

const norm = (v) => String(v ?? '').trim().toLowerCase();

export const filterProducts = (products, filters = {}) => {
  const q = norm(filters.q);
  const plc = norm(filters.plc);
  const brand = norm(filters.brand);
  const category = norm(filters.masterCategory);

  if (!q && !plc && !brand && !category) return products;

  return products.filter((p) => {
    // Dropdown picks are exact values from the option list.
    if (plc && norm(p.plc) !== plc) return false;
    if (brand && norm(p.brand) !== brand) return false;
    if (category && norm(p.masterCategory) !== category) return false;
    if (q) {
      const hay =
        `${p.asin} ${p.brand} ${p.modelNo} ${p.masterCategory} ${p.plc} ${p.packSize}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
};

/**
 * Build the list of unique values for a given product field, used to
 * power the autocomplete <datalist> in the filter panel. Empty values
 * are skipped, and the result is sorted for stable UI.
 */
export const buildFieldOptions = (products, field) => {
  const seen = new Set();
  for (const p of products) {
    const v = String(p?.[field] ?? '').trim();
    if (v) seen.add(v);
  }
  return Array.from(seen).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
};
