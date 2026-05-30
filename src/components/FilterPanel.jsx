/**
 * FilterPanel
 * ----------------------------------------------------------------
 * Multi-filter bar above the product table:
 *
 *   - Search anything (text input)
 *   - PLC / Brand / Master Category (custom dropdowns — click to
 *     open a panel with every option visible + search inside)
 *
 * All filters combine with AND.
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { buildFieldOptions, filterProducts } from '../services/productService.js';
import './FilterPanel.css';

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const ClearIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const ResetIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

const ChevronIcon = ({ open }) => (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    className={`fbar__dd-chevron ${open ? 'fbar__dd-chevron--open' : ''}`}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/**
 * Custom dropdown — click the trigger to open a scrollable panel
 * listing every option. Includes an inner search box to narrow long
 * lists without hiding the full option set on first open.
 */
/**
 * Search box with a product picker panel. When PLC / Brand / Category
 * dropdowns are set, clicking or focusing the search field opens a
 * scrollable list of matching products so the user can pick one
 * instead of typing.
 */
const SearchProductPicker = ({ value, onChange, products, dropdownFilters }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listId = useId();

  const q = String(value || '').trim();
  const hasValue = q.length > 0;

  const scopedProducts = useMemo(
    () =>
      filterProducts(products, {
        plc: dropdownFilters.plc || '',
        brand: dropdownFilters.brand || '',
        masterCategory: dropdownFilters.masterCategory || '',
        q: '',
      }),
    [products, dropdownFilters],
  );

  const hasDropdownFilter =
    Boolean(dropdownFilters.plc) ||
    Boolean(dropdownFilters.brand) ||
    Boolean(dropdownFilters.masterCategory);

  const listProducts = useMemo(() => {
    const needle = q.toLowerCase();
    if (!needle) return scopedProducts;
    return scopedProducts.filter((p) => {
      const hay =
        `${p.asin} ${p.brand} ${p.modelNo} ${p.masterCategory} ${p.plc} ${p.packSize}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [scopedProducts, q]);

  useEffect(() => {
    if (!open) return undefined;

    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openPanel = () => setOpen(true);

  const pickProduct = (p) => {
    onChange(p.asin);
    setOpen(false);
    inputRef.current?.blur();
  };

  const placeholder = hasDropdownFilter
    ? `Search or pick from ${scopedProducts.length.toLocaleString('en-IN')} product${scopedProducts.length === 1 ? '' : 's'}…`
    : 'ASIN, brand, model, PLC, category, pack size…';

  return (
    <div
      ref={rootRef}
      className={`fbar__search-picker ${open ? 'fbar__search-picker--open' : ''}`}
    >
      <span className="fbar__field-label">
        Search anything
        {hasDropdownFilter && (
          <span className="fbar__field-count">{scopedProducts.length}</span>
        )}
      </span>

      <div className="fbar__input-wrap fbar__input-wrap--search">
        <input
          ref={inputRef}
          type="search"
          className="fbar__input fbar__input--search"
          placeholder={placeholder}
          value={value || ''}
          onChange={(e) => {
            onChange(e.target.value);
            openPanel();
          }}
          onFocus={openPanel}
          autoComplete="off"
          aria-expanded={open}
          aria-controls={listId}
          aria-haspopup="listbox"
        />
        {hasValue && (
          <button
            type="button"
            className="fbar__clear-input fbar__clear-input--search"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
            aria-label="Clear search"
            tabIndex={-1}
          >
            <ClearIcon />
          </button>
        )}
        <button
          type="button"
          className="fbar__search-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close product list' : 'Show product list'}
          aria-expanded={open}
        >
          <ChevronIcon open={open} />
        </button>
      </div>

      {open && (
        <div className="fbar__dd-panel fbar__dd-panel--search" role="presentation">
          <div className="fbar__dd-panel-head">
            <span className="fbar__dd-panel-title">
              {hasDropdownFilter ? 'Products in selection' : 'All products'}
            </span>
            <span className="fbar__dd-panel-meta">
              {listProducts.length.toLocaleString('en-IN')} shown
            </span>
          </div>

          {hasDropdownFilter && (
            <p className="fbar__search-hint">
              Filtered by{' '}
              {[
                dropdownFilters.plc && `PLC: ${dropdownFilters.plc}`,
                dropdownFilters.brand && `Brand: ${dropdownFilters.brand}`,
                dropdownFilters.masterCategory &&
                  `Category: ${dropdownFilters.masterCategory}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}

          <ul id={listId} className="fbar__dd-list fbar__dd-list--products" role="listbox">
            {listProducts.length === 0 ? (
              <li className="fbar__dd-empty" role="presentation">
                No products match your search.
              </li>
            ) : (
              listProducts.map((p) => (
                <li key={p.asin} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={q === p.asin}
                    className={`fbar__product-option ${q === p.asin ? 'fbar__product-option--selected' : ''}`}
                    onClick={() => pickProduct(p)}
                  >
                    <span className="fbar__product-asin">{p.asin}</span>
                    <span className="fbar__product-meta">
                      {p.brand || '—'} · {p.modelNo || '—'}
                    </span>
                    <span className="fbar__product-tags">
                      {p.plc && <span className="fbar__product-tag">{p.plc}</span>}
                      {p.packSize && (
                        <span className="fbar__product-tag">Pack {p.packSize}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

const FilterDropdown = ({
  label,
  value,
  options,
  onChange,
  placeholder,
  allLabel,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const listId = useId();

  const selected = String(value || '').trim();
  const hasValue = selected.length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return undefined;

    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => searchRef.current?.focus(), 30);

    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, [open]);

  const pick = (opt) => {
    onChange(opt);
    setOpen(false);
    setQuery('');
  };

  const toggle = () => {
    setOpen((o) => {
      if (o) setQuery('');
      return !o;
    });
  };

  return (
    <div
      ref={rootRef}
      className={`fbar__dd ${open ? 'fbar__dd--open' : ''}`}
    >
      <span className="fbar__field-label">
        {label}
        <span className="fbar__field-count">{options.length}</span>
      </span>

      <button
        type="button"
        className={`fbar__dd-trigger ${hasValue ? 'fbar__dd-trigger--active' : ''}`}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
      >
        <span className={`fbar__dd-value ${!hasValue ? 'fbar__dd-value--placeholder' : ''}`}>
          {hasValue ? selected : placeholder}
        </span>
        <ChevronIcon open={open} />
      </button>

      {hasValue && !open && (
        <button
          type="button"
          className="fbar__dd-clear"
          onClick={() => onChange('')}
          aria-label={`Clear ${label}`}
        >
          <ClearIcon />
        </button>
      )}

      {open && (
        <div className="fbar__dd-panel" role="presentation">
          <div className="fbar__dd-panel-head">
            <span className="fbar__dd-panel-title">{label}</span>
            <span className="fbar__dd-panel-meta">
              {filtered.length} of {options.length}
            </span>
          </div>

          <div className="fbar__dd-search-wrap">
            <span className="fbar__dd-search-icon" aria-hidden>
              <SearchIcon />
            </span>
            <input
              ref={searchRef}
              type="search"
              className="fbar__dd-search"
              placeholder={`Search ${label.toLowerCase()}…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              aria-label={`Search within ${label}`}
            />
          </div>

          <ul
            id={listId}
            className="fbar__dd-list"
            role="listbox"
            aria-label={label}
          >
            <li role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={!hasValue}
                className={`fbar__dd-option fbar__dd-option--all ${!hasValue ? 'fbar__dd-option--selected' : ''}`}
                onClick={() => pick('')}
              >
                {allLabel}
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="fbar__dd-empty" role="presentation">
                No matches for &ldquo;{query}&rdquo;
              </li>
            ) : (
              filtered.map((opt) => (
                <li key={opt} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected === opt}
                    className={`fbar__dd-option ${selected === opt ? 'fbar__dd-option--selected' : ''}`}
                    onClick={() => pick(opt)}
                  >
                    {opt}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

const FilterPanel = ({
  value,
  onChange,
  onReset,
  products = [],
  resultCount,
  totalCount,
}) => {
  const filters = value || {};
  const patch = (next) => onChange?.({ ...filters, ...next });

  const plcOptions = useMemo(
    () => buildFieldOptions(products, 'plc'),
    [products],
  );
  const brandOptions = useMemo(
    () => buildFieldOptions(products, 'brand'),
    [products],
  );
  const categoryOptions = useMemo(
    () => buildFieldOptions(products, 'masterCategory'),
    [products],
  );

  const activeCount =
    (filters.q ? 1 : 0) +
    (filters.plc ? 1 : 0) +
    (filters.brand ? 1 : 0) +
    (filters.masterCategory ? 1 : 0);
  const hasAny = activeCount > 0;

  return (
    <section className="fbar" aria-label="Filter products">
      <div className="fbar__title">
        <span className="fbar__title-dot" aria-hidden />
        Filter
        {activeCount > 0 && (
          <span className="fbar__active-badge" title="Active filters">
            {activeCount}
          </span>
        )}
      </div>

      <div className="fbar__search-row">
        <SearchProductPicker
          value={filters.q || ''}
          onChange={(v) => patch({ q: v })}
          products={products}
          dropdownFilters={{
            plc: filters.plc || '',
            brand: filters.brand || '',
            masterCategory: filters.masterCategory || '',
          }}
        />
      </div>

      <div className="fbar__dropdowns">
        <FilterDropdown
          label="PLC"
          value={filters.plc || ''}
          options={plcOptions}
          onChange={(v) => patch({ plc: v })}
          placeholder="All PLCs"
          allLabel="All PLCs"
        />
        <FilterDropdown
          label="Brand"
          value={filters.brand || ''}
          options={brandOptions}
          onChange={(v) => patch({ brand: v })}
          placeholder="All brands"
          allLabel="All brands"
        />
        <FilterDropdown
          label="Master Category"
          value={filters.masterCategory || ''}
          options={categoryOptions}
          onChange={(v) => patch({ masterCategory: v })}
          placeholder="All categories"
          allLabel="All categories"
        />

        <button
          type="button"
          className="fbar__reset"
          onClick={onReset}
          disabled={!hasAny}
          title="Clear all filters"
        >
          <ResetIcon />
          <span>Reset</span>
        </button>
      </div>

      <div className="fbar__count">
        <strong>{(resultCount ?? 0).toLocaleString('en-IN')}</strong>
        <span className="fbar__count-of">of</span>
        <strong>{(totalCount ?? 0).toLocaleString('en-IN')}</strong>
        <span className="fbar__count-of">
          product{(totalCount ?? 0) === 1 ? '' : 's'}
        </span>
        {hasAny && <span className="fbar__count-hint">· filtered</span>}
      </div>
    </section>
  );
};

export default FilterPanel;
