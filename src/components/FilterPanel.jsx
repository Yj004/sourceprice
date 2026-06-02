/**
 * FilterPanel — synchronized Search + PLC + Brand filters.
 * All three inputs share one filter model (owned by DashboardPage).
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react';
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

import { CTC_STATUS_LABELS, CTC_STATUS_OPTIONS } from '../utils/ctcUpdateStatus.js';

const formatOptionLabel = (value, count) => {
  if (count == null) return value;
  return `${value} (${count.toLocaleString('en-IN')})`;
};

const SearchProductPicker = ({
  searchInput,
  onSearchInputChange,
  listProducts,
  onPickProduct,
  selectedAsins,
  onToggleSelect,
  onToggleSelectAllInList,
  onStartBulkEdit,
  onEditSelected,
  brand,
  plc,
  resultCount,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listId = useId();

  const selectedSet = useMemo(
    () => selectedAsins ?? new Set(),
    [selectedAsins],
  );
  const q = String(searchInput || '').trim();
  const hasValue = q.length > 0;
  const hasDropdownFilter = Boolean(brand) || Boolean(plc);
  const showSuggestions = q.length >= 2 || hasDropdownFilter;

  const selectedInList = useMemo(
    () => listProducts.filter((p) => selectedSet.has(p.asin)).length,
    [listProducts, selectedSet],
  );

  const allInListSelected =
    listProducts.length > 0 &&
    listProducts.every((p) => selectedSet.has(p.asin));
  const someInListSelected =
    selectedInList > 0 && !allInListSelected;

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
    onPickProduct?.(p);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleEditSelected = () => {
    onEditSelected?.();
    setOpen(false);
  };

  const handleBulkEdit = () => {
    onStartBulkEdit?.();
    setOpen(false);
  };

  const placeholder = hasDropdownFilter
    ? `Search within ${resultCount.toLocaleString('en-IN')} matching product${resultCount === 1 ? '' : 's'}…`
    : 'ASIN, brand, model, PLC, category, pack size…';

  return (
    <div
      ref={rootRef}
      className={`fbar__search-picker ${open ? 'fbar__search-picker--open' : ''}`}
    >
      <span className="fbar__field-label">
        Search anything
        {(hasDropdownFilter || q.length >= 2) && (
          <span className="fbar__field-count">{listProducts.length}</span>
        )}
      </span>

      <div className="fbar__input-wrap fbar__input-wrap--search">
        <input
          ref={inputRef}
          type="search"
          className="fbar__input fbar__input--search"
          placeholder={placeholder}
          value={searchInput || ''}
          onChange={(e) => {
            onSearchInputChange(e.target.value);
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
              onSearchInputChange('');
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

      {open && showSuggestions && (
        <div className="fbar__dd-panel fbar__dd-panel--search" role="presentation">
          <div className="fbar__dd-panel-head">
            <span className="fbar__dd-panel-title">
              {hasDropdownFilter ? 'Matching products' : 'Search results'}
            </span>
            <span className="fbar__dd-panel-meta">
              {listProducts.length.toLocaleString('en-IN')} shown
            </span>
          </div>

          {hasDropdownFilter && (
            <p className="fbar__search-hint">
              Filtered by{' '}
              {[
                brand && `Brand: ${brand}`,
                plc && `PLC: ${plc}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}

          {listProducts.length > 0 && (
            <div className="fbar__search-select-bar">
              <label className="fbar__search-select-all">
                <input
                  type="checkbox"
                  checked={allInListSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someInListSelected;
                  }}
                  onChange={() => onToggleSelectAllInList?.()}
                  aria-label="Select all products in this list"
                />
                <span>Select all in results</span>
              </label>
              {selectedInList > 0 && (
                <span className="fbar__search-select-count">
                  <strong>{selectedInList}</strong> selected
                </span>
              )}
            </div>
          )}

          <ul id={listId} className="fbar__dd-list fbar__dd-list--products" role="listbox">
            {listProducts.length === 0 ? (
              <li className="fbar__dd-empty" role="presentation">
                No products match your filters.
              </li>
            ) : (
              listProducts.map((p) => {
                const isChecked = selectedSet.has(p.asin);
                const isFilterMatch = q.length >= 2 && q === p.asin;
                return (
                  <li key={p.asin} role="presentation">
                    <div
                      className={`fbar__product-row ${isChecked ? 'fbar__product-row--checked' : ''} ${isFilterMatch ? 'fbar__product-row--filter-match' : ''}`}
                    >
                      <label
                        className="fbar__product-check"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleSelect?.(p.asin)}
                          aria-label={`Select ${p.modelNo || p.asin}`}
                        />
                      </label>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isFilterMatch}
                        className="fbar__product-option"
                        onClick={() => pickProduct(p)}
                      >
                        <span className="fbar__product-meta">
                          {p.brand || '—'} · {p.modelNo || '—'}
                        </span>
                        <span className="fbar__product-tags">
                          {p.plc && (
                            <span className="fbar__product-tag fbar__product-tag--plc">
                              {p.plc}
                            </span>
                          )}
                          <span className="fbar__product-tag">
                            Pack {p.packSize || '—'}
                          </span>
                        </span>
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>

          {selectedInList > 0 && (
            <div className="fbar__search-actions">
              {selectedInList >= 2 ? (
                <button
                  type="button"
                  className="fbar__search-edit-btn"
                  onClick={handleBulkEdit}
                >
                  Edit selected ({selectedInList})
                </button>
              ) : (
                <button
                  type="button"
                  className="fbar__search-edit-btn"
                  onClick={handleEditSelected}
                >
                  Edit selected
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const FilterDropdown = ({
  label,
  value,
  options,
  optionCounts,
  onChange,
  placeholder,
  allLabel,
  searchable = true,
  getOptionLabel,
  allCount: allCountProp,
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
    const t = searchable
      ? setTimeout(() => searchRef.current?.focus(), 30)
      : undefined;

    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      if (t) clearTimeout(t);
    };
  }, [open, searchable]);

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

  const allCount = allCountProp ?? options.length;
  const labelFor = (opt) => (getOptionLabel ? getOptionLabel(opt) : opt);

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
          {hasValue
            ? formatOptionLabel(labelFor(selected), optionCounts?.get(selected))
            : `${placeholder} (${allCount.toLocaleString('en-IN')})`}
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

          {searchable && (
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
          )}

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
                {allLabel} ({allCount.toLocaleString('en-IN')})
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
                    {formatOptionLabel(labelFor(opt), optionCounts?.get(opt))}
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
  searchInput,
  onSearchInputChange,
  brand,
  plc,
  ctcStatus,
  onBrandChange,
  onPlcChange,
  onCtcStatusChange,
  onPickProduct,
  selectedAsins,
  onToggleSelect,
  onToggleSelectAllInList,
  onStartBulkEdit,
  onEditSelected,
  onReset,
  availablePlcs = [],
  availableBrands = [],
  plcCounts,
  brandCounts,
  ctcStatusCounts,
  listProducts = [],
  resultCount,
  totalCount,
}) => {
  const activeCount =
    (searchInput?.trim() ? 1 : 0) +
    (plc ? 1 : 0) +
    (brand ? 1 : 0) +
    (ctcStatus ? 1 : 0);
  const hasAny = activeCount > 0;

  const ctcOptionCounts = useMemo(
    () =>
      new Map([
        ['notupdated', ctcStatusCounts?.notupdated ?? 0],
        ['updated', ctcStatusCounts?.updated ?? 0],
      ]),
    [ctcStatusCounts],
  );

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
          searchInput={searchInput}
          onSearchInputChange={onSearchInputChange}
          listProducts={listProducts}
          onPickProduct={onPickProduct}
          selectedAsins={selectedAsins}
          onToggleSelect={onToggleSelect}
          onToggleSelectAllInList={onToggleSelectAllInList}
          onStartBulkEdit={onStartBulkEdit}
          onEditSelected={onEditSelected}
          brand={brand}
          plc={plc}
          resultCount={resultCount ?? 0}
        />
      </div>

      <div className="fbar__dropdowns">
        <FilterDropdown
          label="PLC"
          value={plc}
          options={availablePlcs}
          optionCounts={plcCounts}
          onChange={onPlcChange}
          placeholder="All PLCs"
          allLabel="All PLCs"
        />
        <FilterDropdown
          label="Brand"
          value={brand}
          options={availableBrands}
          optionCounts={brandCounts}
          onChange={onBrandChange}
          placeholder="All brands"
          allLabel="All brands"
        />
        <FilterDropdown
          label="CTC status"
          value={ctcStatus}
          options={CTC_STATUS_OPTIONS}
          optionCounts={ctcOptionCounts}
          onChange={onCtcStatusChange}
          placeholder="All CTC status"
          allLabel="All CTC status"
          searchable={false}
          getOptionLabel={(opt) => CTC_STATUS_LABELS[opt] || opt}
          allCount={ctcStatusCounts?.all ?? 0}
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
        {hasAny && (
          <button
            type="button"
            className="fbar__inline-reset"
            onClick={onReset}
          >
            Clear filters
          </button>
        )}
      </div>
    </section>
  );
};

export default FilterPanel;
