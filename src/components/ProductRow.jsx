/**
 * ProductRow — read-only row that defers editing to a modal popup.
 *
 * Columns (in render order, matching ProductTable headers):
 *   Brand · Model No · Pack_size · PLC ·
 *   Total Cost · CATAGORY TEAM COST · History (link) · Edit (button)
 *
 * The dashboard intentionally hides ASIN and the raw source price
 * (source_price_ex_gst). ASIN is still loaded for routing.
 */

import { memo } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../utils/format.js';

const ProductRow = ({ product, onEdit, isSaving = false, justSaved = false }) => (
  <tr className={`ptable__row ${justSaved ? 'ptable__row--flash' : ''}`}>
    <td data-label="Brand">{product.brand || '—'}</td>
    <td data-label="Model No" className="ptable__model">{product.modelNo || '—'}</td>
    <td data-label="Pack size" className="ptable__num">{product.packSize || '—'}</td>
    <td data-label="PLC">
      <span className="ptable__chip">{product.plc || '—'}</span>
    </td>

    <td data-label="Total Cost" className="ptable__num ptable__total">
      {formatPrice(product.totalCost)}
    </td>

    <td data-label="Category team cost" className="ptable__num">
      {product.categoryTeamCost > 0 ? formatPrice(product.categoryTeamCost) : '—'}
    </td>

    <td data-label="History" className="ptable__history-cell">
      <Link
        to={`/product/${encodeURIComponent(product.asin)}`}
        className="ptable__history-btn"
        title="View full price history"
        aria-label={`View price history for ${product.asin}`}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
          <path d="M12 8v5l3.5 2" />
        </svg>
      </Link>
    </td>

    <td data-label="" className="ptable__actions">
      <button
        type="button"
        className="ptable__edit-btn"
        onClick={() => onEdit?.(product)}
        disabled={isSaving}
        title="Open edit dialog"
      >
        {isSaving ? '…' : 'Edit'}
      </button>
    </td>
  </tr>
);

export default memo(ProductRow);
