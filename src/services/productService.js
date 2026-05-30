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
 * Unified filter shape for Search + PLC + Brand (AND-combined).
 */
export const INITIAL_FILTERS = {
  search: '',
  brand: '',
  plc: '',
};

const norm = (v) => String(v ?? '').trim().toLowerCase();

export const productSearchHaystack = (p) =>
  `${p.asin} ${p.brand} ${p.modelNo} ${p.masterCategory} ${p.plc} ${p.packSize}`.toLowerCase();

export const matchesSearch = (p, q) => {
  const needle = norm(q);
  if (!needle) return true;
  return productSearchHaystack(p).includes(needle);
};

const readSearch = (filters) => norm(filters.search ?? filters.q);

/**
 * Intersection filter — brand (exact), plc (exact), search (substring).
 */
export const filterProducts = (products, filters = {}) => {
  const search = readSearch(filters);
  const plc = norm(filters.plc);
  const brand = norm(filters.brand);

  if (!search && !plc && !brand) return products;

  return products.filter((p) => {
    if (brand && norm(p.brand) !== brand) return false;
    if (plc && norm(p.plc) !== plc) return false;
    if (search && !matchesSearch(p, search)) return false;
    return true;
  });
};

/**
 * PLC options scoped by selected brand + search (not current PLC).
 */
export const getAvailablePlcs = (products, filters = {}) =>
  buildFieldOptions(
    filterProducts(products, {
      brand: filters.brand,
      search: filters.search ?? filters.q,
      plc: '',
    }),
    'plc',
  );

/**
 * Brand options scoped by selected PLC + search (not current brand).
 */
export const getAvailableBrands = (products, filters = {}) =>
  buildFieldOptions(
    filterProducts(products, {
      plc: filters.plc,
      search: filters.search ?? filters.q,
      brand: '',
    }),
    'brand',
  );

/**
 * Count products for each option value given the other active filters.
 */
export const buildOptionCounts = (products, filters, field) => {
  const counts = new Map();
  const options =
    field === 'plc'
      ? getAvailablePlcs(products, filters)
      : getAvailableBrands(products, filters);

  for (const value of options) {
    counts.set(
      value,
      filterProducts(products, { ...filters, [field]: value }).length,
    );
  }
  return counts;
};

/**
 * Build the list of unique values for a given product field.
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
