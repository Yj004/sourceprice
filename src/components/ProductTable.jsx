/**
 * ProductTable — virtualized for large catalogs (~2k+ rows).
 *
 * The row layout is described in ProductRow.jsx. This component is
 * presentation only: it does not own the edit-modal state — it just
 * surfaces an onEdit(product) callback up to the dashboard so the
 * modal can be hoisted there.
 */

import { useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import ProductRow from './ProductRow.jsx';
import './ProductTable.css';

const ROW_HEIGHT = 49;
const MOBILE_PAGE_SIZE = 30;
const COL_COUNT = 8;

const HEADERS = [
  { label: 'Brand' },
  { label: 'Model No' },
  { label: 'Pack size', numeric: true },
  { label: 'PLC', chip: true },
  { label: 'Total Cost', numeric: true },
  { label: 'CATAGORY TEAM COST', numeric: true },
  { label: '', historyCol: true },
  { label: '', actionCol: true },
];

const SkeletonRow = () => (
  <tr className="ptable__skeleton-row">
    {Array.from({ length: COL_COUNT }).map((_, i) => (
      <td key={i}><span className="ptable__skel" /></td>
    ))}
  </tr>
);

const useNarrowLayout = () => {
  const [narrow, setNarrow] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 720px)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)');
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return narrow;
};

const TableHead = () => (
  <thead>
    <tr>
      {HEADERS.map((h, i) => (
        <th
          key={i}
          className={[
            h.numeric ? 'ptable__num' : '',
            h.chip ? 'ptable__chip-col' : '',
            h.historyCol ? 'ptable__history-th' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label={!h.label ? (h.actionCol ? 'Action' : 'History') : undefined}
        >
          {h.label}
        </th>
      ))}
    </tr>
  </thead>
);

const ProductTable = ({
  products,
  onEdit,
  onBulkEdit,
  selectedAsins,
  onToggleSelect,
  onToggleSelectAll,
  loading = false,
  error = null,
  savingId = null,
}) => {
  const scrollRef = useRef(null);
  const narrow = useNarrowLayout();
  const [mobilePage, setMobilePage] = useState(1);

  useEffect(() => {
    setMobilePage(1);
  }, [products]);

  const rowVirtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
    enabled: !narrow && products.length > 0,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0;

  const mobilePageCount = Math.max(
    1,
    Math.ceil(products.length / MOBILE_PAGE_SIZE),
  );
  const mobileProducts = narrow
    ? products.slice(
        (mobilePage - 1) * MOBILE_PAGE_SIZE,
        mobilePage * MOBILE_PAGE_SIZE,
      )
    : products;

  if (error) {
    return (
      <div className="ptable__state ptable__state--error">
        <strong>Could not load products.</strong>
        <span>{error}</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="ptable__wrap">
        <table className="ptable">
          <TableHead />
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="ptable__state ptable__state--empty">
        No products match your filters.
      </div>
    );
  }

  const selectedSet = selectedAsins ?? new Set();
  const selectedCount = products.filter((p) => selectedSet.has(p.asin)).length;
  const allVisibleSelected =
    products.length > 0 && selectedCount === products.length;
  const someVisibleSelected = selectedCount > 0 && !allVisibleSelected;

  const renderRow = (p) => (
    <ProductRow
      key={p.id}
      product={p}
      onEdit={onEdit}
      isSaving={savingId === p.id}
      selected={selectedSet.has(p.asin)}
      onToggleSelect={onToggleSelect}
    />
  );

  return (
    <div className="ptable__shell">
      {selectedCount > 0 && (
        <div className="ptable__bulk-bar">
          <span className="ptable__bulk-count">
            <strong>{selectedCount}</strong> selected
          </span>
          <label className="ptable__bulk-select-all">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              ref={(el) => {
                if (el) el.indeterminate = someVisibleSelected;
              }}
              onChange={() => onToggleSelectAll?.()}
              aria-label="Select all visible products"
            />
            Select all visible
          </label>
          {selectedCount >= 2 && (
            <button
              type="button"
              className="ptable__bulk-edit"
              onClick={() => onBulkEdit?.()}
            >
              Edit selected ({selectedCount})
            </button>
          )}
          <button
            type="button"
            className="ptable__bulk-clear"
            onClick={() => onToggleSelectAll?.(true)}
          >
            Clear
          </button>
        </div>
      )}

      <div ref={scrollRef} className="ptable__wrap">
        <table className="ptable">
          <TableHead />
          <tbody>
            {narrow ? (
              mobileProducts.map(renderRow)
            ) : (
              <>
                {paddingTop > 0 && (
                  <tr aria-hidden className="ptable__spacer">
                    <td colSpan={COL_COUNT} style={{ height: paddingTop }} />
                  </tr>
                )}
                {virtualRows.map((vr) => renderRow(products[vr.index]))}
                {paddingBottom > 0 && (
                  <tr aria-hidden className="ptable__spacer">
                    <td colSpan={COL_COUNT} style={{ height: paddingBottom }} />
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      <footer className="ptable__foot">
        {narrow ? (
          <div className="ptable__pager">
            <button
              type="button"
              className="ptable__page-btn"
              disabled={mobilePage <= 1}
              onClick={() => setMobilePage((p) => p - 1)}
            >
              Previous
            </button>
            <span className="ptable__page-info">
              Page {mobilePage} of {mobilePageCount}
              <span className="ptable__page-muted">
                {' '}
                · {products.length} rows
              </span>
            </span>
            <button
              type="button"
              className="ptable__page-btn"
              disabled={mobilePage >= mobilePageCount}
              onClick={() => setMobilePage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        ) : (
          <span className="ptable__page-info">
            Showing {products.length.toLocaleString('en-IN')} products · scroll
            to browse
          </span>
        )}
      </footer>
    </div>
  );
};

export default ProductTable;
