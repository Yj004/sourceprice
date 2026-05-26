/**
 * ProductRow — Phase 4 (click-to-edit)
 * ----------------------------------------------------------------
 * UX rules (per spec):
 *   - The edit input appears ONLY while editing (no permanent input).
 *   - Click "Edit" to enter edit mode → input auto-focuses and
 *     selects all text so the user can immediately type a new value.
 *   - Enter        → commit (save)
 *   - Escape       → cancel
 *   - Save button  → disabled while the draft equals the current
 *                    price OR while a save is in flight.
 *   - On success   → row flashes accent purple for ~1.2s.
 *
 * Each row owns its own draft so editing one row never causes any
 * sibling row to re-render.
 */

import { useEffect, useRef, useState } from 'react';
import { formatPrice } from '../utils/format.js';

const ProductRow = ({ product, onSave, isSaving }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [flash, setFlash] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEdit = () => {
    setDraft(String(product.currentPrice));
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft('');
  };

  const draftNumber = Number(draft);
  const validDraft =
    draft !== '' && Number.isFinite(draftNumber) && draftNumber >= 0;
  const dirty = validDraft && draftNumber !== product.currentPrice;

  const commit = async () => {
    if (!dirty || isSaving) return;
    const result = await onSave(product.id, draftNumber);
    if (result?.ok) {
      setEditing(false);
      setDraft('');
      setFlash(true);
      setTimeout(() => setFlash(false), 1200);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  return (
    <tr className={`ptable__row ${flash ? 'ptable__row--flash' : ''}`}>
      <td data-label="ASIN" className="ptable__asin">{product.asin}</td>
      <td data-label="Brand">{product.brand}</td>
      <td data-label="Model No" className="ptable__model">{product.modelNo}</td>
      <td data-label="Master Category">
        <span className="ptable__chip">{product.masterCategory}</span>
      </td>

      <td data-label="Current Price" className="ptable__num">
        {editing ? (
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            className="ptable__edit"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            aria-label={`Edit price for ${product.asin}`}
          />
        ) : (
          formatPrice(product.currentPrice)
        )}
      </td>

      <td data-label="Updates" className="ptable__num ptable__updates">
        {product.totalUpdates ?? 0}
      </td>

      <td data-label="" className="ptable__actions">
        {editing ? (
          <div className="ptable__btns">
            <button
              type="button"
              className="ptable__save"
              onClick={commit}
              disabled={!dirty || isSaving}
              title="Save (Enter)"
            >
              {isSaving ? '…' : 'Save'}
            </button>
            <button
              type="button"
              className="ptable__cancel"
              onClick={cancelEdit}
              disabled={isSaving}
              title="Cancel (Esc)"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="ptable__edit-btn"
            onClick={startEdit}
            title="Edit price"
          >
            Edit
          </button>
        )}
      </td>
    </tr>
  );
};

export default ProductRow;
