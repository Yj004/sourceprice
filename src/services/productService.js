/**
 * productService — Google Sheets via backend API
 */

import api from './apiClient.js';

export const getAllProducts = async () => api.getProducts();

export const updateProductPrice = async ({ id, newPrice, updatedBy }) => {
  const result = await api.updatePrice(id, newPrice, updatedBy);
  return result;
};

export const updateProduct = async ({ id, updates, updatedBy, suppressEmail = false }) => {
  const result = await api.updateProduct(id, updates, updatedBy, { suppressEmail });
  return result;
};

/**
 * Unified filter shape for Search + PLC + Brand (AND-combined).
 */
export const INITIAL_FILTERS = {
  search: '',
  brand: '',
  plc: '',
  /** '' | 'notupdated' | 'updated' — Category Team Cost history */
  ctcStatus: '',
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
const matchesCtcStatus = (p, ctcStatus) => {
  if (!ctcStatus) return true;
  if (ctcStatus === 'notupdated') return !p.ctcEverUpdated;
  if (ctcStatus === 'updated') return Boolean(p.ctcEverUpdated);
  return true;
};

export const filterProducts = (products, filters = {}) => {
  const search = readSearch(filters);
  const plc = norm(filters.plc);
  const brand = norm(filters.brand);
  const ctcStatus = norm(filters.ctcStatus);

  if (!search && !plc && !brand && !ctcStatus) return products;

  return products.filter((p) => {
    if (brand && norm(p.brand) !== brand) return false;
    if (plc && norm(p.plc) !== plc) return false;
    if (search && !matchesSearch(p, search)) return false;
    if (!matchesCtcStatus(p, ctcStatus)) return false;
    return true;
  });
};

/** Count products per CTC status for the filter dropdown (respects other filters). */
export const getCtcStatusCounts = (products, filters = {}) => {
  const base = filterProducts(products, { ...filters, ctcStatus: '' });
  let notUpdated = 0;
  let updated = 0;
  for (const p of base) {
    if (p.ctcEverUpdated) updated += 1;
    else notUpdated += 1;
  }
  return {
    all: base.length,
    notupdated: notUpdated,
    updated,
  };
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
