/**
 * FilterPanel — Phase 4
 * ----------------------------------------------------------------
 * Controlled filter sidebar. DashboardPage owns the filter state.
 *
 * Filters (all AND-combined, real-time):
 *   - q (global)        substring across ASIN/Brand/Model/Category
 *   - asin              substring, case-insensitive
 *   - brand             substring, case-insensitive
 *   - modelNo           substring, case-insensitive
 *   - masterCategory    exact match (dropdown)
 *
 * Minimum-click UX:
 *   - Every keystroke updates the table instantly.
 *   - "Reset" clears every filter at once.
 */

import './FilterPanel.css';

const FilterPanel = ({
  value,
  onChange,
  categories = [],
  onReset,
  resultCount,
  totalCount,
}) => {
  const patch = (next) => onChange?.({ ...value, ...next });

  const hasAny =
    value.q || value.asin || value.brand || value.modelNo || value.masterCategory;

  return (
    <aside className="filters">
      <div className="filters__head">
        <h2 className="filters__title">Filters</h2>
        <button
          type="button"
          className="filters__clear"
          onClick={onReset}
          disabled={!hasAny}
        >
          Reset
        </button>
      </div>

      <div className="filters__group">
        <label className="filters__label" htmlFor="f-q">Search anything</label>
        <input
          id="f-q"
          type="search"
          className="filters__input"
          placeholder="ASIN, brand, model…"
          value={value.q}
          onChange={(e) => patch({ q: e.target.value })}
          autoComplete="off"
        />
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
    </aside>
  );
};

export default FilterPanel;
