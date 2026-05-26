/**
 * FilterPanel
 * ----------------------------------------------------------------
 * Left-side filter sidebar. Collapsible on mobile (the chevron
 * button is hidden via CSS on desktop, where the panel is always
 * expanded).
 *
 * Filters (all AND-combined, real-time):
 *   - q (global)        substring across ASIN/Brand/Model/Category
 *   - asin              substring, case-insensitive
 *   - brand             substring, case-insensitive
 *   - modelNo           substring, case-insensitive
 *   - masterCategory    exact match (dropdown)
 */

import { useState } from 'react';
import './FilterPanel.css';

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const ChevronIcon = ({ open }) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}
    aria-hidden
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const FilterPanel = ({
  value,
  onChange,
  categories = [],
  onReset,
  resultCount,
  totalCount,
}) => {
  const [open, setOpen] = useState(true);
  const patch = (next) => onChange?.({ ...value, ...next });

  const hasAny =
    value.q || value.asin || value.brand || value.modelNo || value.masterCategory;

  return (
    <aside className={`filters ${open ? '' : 'filters--collapsed'}`.trim()}>
      <div className="filters__head">
        <h2 className="filters__title">
          <span className="filters__title-dot" aria-hidden />
          Filters
        </h2>
        <div className="filters__head-actions">
          <button
            type="button"
            className="filters__clear"
            onClick={onReset}
            disabled={!hasAny}
          >
            Reset
          </button>
          <button
            type="button"
            className="filters__toggle"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Collapse filters' : 'Expand filters'}
            aria-expanded={open}
          >
            <ChevronIcon open={open} />
          </button>
        </div>
      </div>

      <div className="filters__body">
        <div className="filters__group">
          <label className="filters__label" htmlFor="f-q">Search anything</label>
          <div className="filters__input-wrap">
            <span className="filters__input-icon"><SearchIcon /></span>
            <input
              id="f-q"
              type="search"
              className="filters__input filters__input--with-icon"
              placeholder="ASIN, brand, model…"
              value={value.q}
              onChange={(e) => patch({ q: e.target.value })}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="filters__group">
          <label className="filters__label" htmlFor="f-asin">ASIN</label>
          <input
            id="f-asin"
            type="search"
            className="filters__input"
            placeholder="e.g. B0DX76861K"
            value={value.asin}
            onChange={(e) => patch({ asin: e.target.value })}
            autoComplete="off"
          />
        </div>

        <div className="filters__group">
          <label className="filters__label" htmlFor="f-brand">Brand</label>
          <input
            id="f-brand"
            type="search"
            className="filters__input"
            placeholder="e.g. Robustt"
            value={value.brand}
            onChange={(e) => patch({ brand: e.target.value })}
            autoComplete="off"
          />
        </div>

        <div className="filters__group">
          <label className="filters__label" htmlFor="f-model">Model No</label>
          <input
            id="f-model"
            type="search"
            className="filters__input"
            placeholder="e.g. RB-AC-MOUNT"
            value={value.modelNo}
            onChange={(e) => patch({ modelNo: e.target.value })}
            autoComplete="off"
          />
        </div>

        <div className="filters__group">
          <label className="filters__label" htmlFor="f-cat">Master Category</label>
          <select
            id="f-cat"
            className="filters__input"
            value={value.masterCategory}
            onChange={(e) => patch({ masterCategory: e.target.value })}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="filters__count">
          Showing <strong>{resultCount}</strong> of {totalCount}
        </div>
      </div>
    </aside>
  );
};

export default FilterPanel;
