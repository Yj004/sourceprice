/**
 * ProductTable — Phase 4
 * ----------------------------------------------------------------
 * Presentational table. Supports the full loading/empty/error
 * state matrix so the same component works once a real API is wired.
 */

import ProductRow from './ProductRow.jsx';
import './ProductTable.css';

const SkeletonRow = () => (
  <tr className="ptable__skeleton-row">
    {Array.from({ length: 7 }).map((_, i) => (
      <td key={i}><span className="ptable__skel" /></td>
    ))}
  </tr>
);

const ProductTable = ({
  products,
  onSave,
  loading = false,
  error = null,
  savingId = null,
}) => {
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
          <thead>
            <tr>
              <th>ASIN</th>
              <th>Brand</th>
              <th>Model No</th>
              <th>Master Category</th>
              <th className="ptable__num">Current Price</th>
              <th className="ptable__num">Updates</th>
              <th aria-label="Action"></th>
            </tr>
          </thead>
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

  return (
    <div className="ptable__wrap">
      <table className="ptable">
        <thead>
          <tr>
            <th>ASIN</th>
            <th>Brand</th>
            <th>Model No</th>
            <th>Master Category</th>
            <th className="ptable__num">Current Price</th>
            <th className="ptable__num">Updates</th>
            <th aria-label="Action"></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <ProductRow
              key={p.id}
              product={p}
              onSave={onSave}
              isSaving={savingId === p.id}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductTable;
