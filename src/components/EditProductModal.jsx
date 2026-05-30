/**
 * EditProductModal
 * ----------------------------------------------------------------
 * Popup that lets the user edit every cost component for a single
 * product in one shot. Mirrors the Main_Data sheet columns B + I..T.
 *
 * Auto-derived:
 *   - Total Cost (col S) = source_price_ex_gst + Σ(cost components).
 *     Always read-only; recomputed live as the user types.
 *
 * Manual:
 *   - CATAGORY TEAM COST (col T) — free-form numeric input.
 *
 * The modal is purely presentational. It calls the supplied
 * `onSave(updates)` with the dirty fields only (the parent decides
 * how / where to persist). Pressing Escape or clicking the backdrop
 * cancels; pressing Enter inside any field saves.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatPrice } from '../utils/format.js';
import './EditProductModal.css';

const COST_FIELDS = [
  { key: 'sourcePrice',       label: 'Source price (ex GST)' },
  { key: 'warehouse',         label: 'Warehouse' },
  { key: 'transport',         label: 'Transport' },
  { key: 'label',             label: 'Label' },
  { key: 'labour',            label: 'Labour' },
  { key: 'poly',              label: 'Poly' },
  { key: 'pouch',             label: 'Pouch' },
  { key: 'box',               label: 'Box' },
  { key: 'masterCartoon',     label: 'Master cartoon' },
  { key: 'manualsPamphlets',  label: 'Manuals / Pamphlets' },
  { key: 'otherCost',         label: 'Other Cost (if any)' },
];

const ALL_NUMERIC_FIELDS = [...COST_FIELDS, { key: 'categoryTeamCost', label: 'CATAGORY TEAM COST' }];

/**
 * Every numeric field is mandatory — even a value of 0 must be typed
 * explicitly. Pre-fill with the sheet value (which is often 0) so the
 * user sees the current state rather than an empty box.
 */
const toDraftValue = (raw) => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return '0';
  return String(n);
};

const parseDraft = (s) => {
  const trimmed = String(s ?? '').trim();
  if (trimmed === '') return NaN;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : NaN;
};

const buildInitialDraft = (product) => {
  const draft = {};
  for (const f of ALL_NUMERIC_FIELDS) {
    draft[f.key] = toDraftValue(product?.[f.key]);
  }
  return draft;
};

const EditProductModal = ({ product, onClose, onSave, isSaving = false }) => {
  const [draft, setDraft] = useState(() => buildInitialDraft(product));
  const [error, setError] = useState('');
  const [showValidation, setShowValidation] = useState(false);
  const firstInputRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    setDraft(buildInitialDraft(product));
    setError('');
    setShowValidation(false);
  }, [product]);

  // Body scroll lock + focus + escape
  useEffect(() => {
    if (!product) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape' && !isSaving) {
        e.preventDefault();
        onClose?.();
      }
    };
    document.addEventListener('keydown', onKey);

    // Defer focus until after the modal mounts.
    const t = setTimeout(() => firstInputRef.current?.focus(), 30);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, [product, onClose, isSaving]);

  /**
   * Per-field validation status. A field is invalid if it is blank,
   * a non-number, or negative. We compute this every render so the
   * UI can highlight bad inputs the moment the user clicks Save.
   */
  const fieldErrors = useMemo(() => {
    const errs = {};
    for (const f of ALL_NUMERIC_FIELDS) {
      const raw = String(draft[f.key] ?? '').trim();
      if (raw === '') {
        errs[f.key] = 'required';
      } else {
        const n = Number(raw);
        if (!Number.isFinite(n)) errs[f.key] = 'invalid';
        else if (n < 0) errs[f.key] = 'negative';
      }
    }
    return errs;
  }, [draft]);

  const invalidKeys = Object.keys(fieldErrors);
  const hasInvalid = invalidKeys.length > 0;

  const totalCost = useMemo(() => {
    let total = 0;
    for (const f of COST_FIELDS) {
      const n = parseDraft(draft[f.key]);
      if (!Number.isFinite(n)) return NaN; // any blank/invalid field disables total
      total += n;
    }
    return Math.round(total * 100) / 100;
  }, [draft]);

  const patch = (key, value) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  /** Clear pre-filled 0 on focus so typing starts fresh. */
  const handleFocus = (key) => {
    setDraft((prev) => {
      const raw = String(prev[key] ?? '').trim();
      const n = Number(raw);
      if (raw !== '' && Number.isFinite(n) && n === 0) {
        return { ...prev, [key]: '' };
      }
      return prev;
    });
  };

  /** Empty field on blur becomes 0 (still mandatory). */
  const handleBlur = (key) => {
    setDraft((prev) => {
      if (String(prev[key] ?? '').trim() === '') {
        return { ...prev, [key]: '0' };
      }
      return prev;
    });
  };

  const dirtyFields = useMemo(() => {
    const out = {};
    for (const f of ALL_NUMERIC_FIELDS) {
      const next = parseDraft(draft[f.key]);
      if (!Number.isFinite(next)) continue; // invalid drafts are not "changes"
      const prev = Math.round((Number(product?.[f.key]) || 0) * 100) / 100;
      if (next !== prev) out[f.key] = next;
    }
    return out;
  }, [draft, product]);

  const dirtyCount = Object.keys(dirtyFields).length;

  const handleSave = async () => {
    setError('');

    if (hasInvalid) {
      setShowValidation(true);
      const firstBadKey = invalidKeys[0];
      const firstBad = ALL_NUMERIC_FIELDS.find((f) => f.key === firstBadKey);
      const reason = fieldErrors[firstBadKey];
      const msg =
        reason === 'required'
          ? `All fields are mandatory. Please fill "${firstBad?.label}" (use 0 if not applicable).`
          : reason === 'negative'
            ? `"${firstBad?.label}" cannot be negative.`
            : `"${firstBad?.label}" must be a valid number.`;
      setError(msg);
      // Scroll the first invalid input into view + focus it.
      const node = dialogRef.current?.querySelector(
        `[data-field="${firstBadKey}"]`,
      );
      if (node) {
        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        node.focus({ preventScroll: true });
      }
      return;
    }

    if (dirtyCount === 0) {
      setError('No changes to save.');
      return;
    }

    const result = await onSave?.(dirtyFields);
    if (result?.ok) {
      onClose?.();
    } else if (result && !result.ok) {
      setError(result.error || 'Save failed.');
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !isSaving) {
      e.preventDefault();
      handleSave();
    }
  };

  if (!product) return null;

  return (
    <div
      className="emodal__backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        className="emodal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="emodal-title"
      >
        <header className="emodal__head">
          <div className="emodal__head-text">
            <p className="emodal__eyebrow">Edit product</p>
            <h2 id="emodal-title" className="emodal__title">
              {product.modelNo || product.asin}
            </h2>
            <p className="emodal__meta">
              <span className="emodal__meta-pill">{product.brand || '—'}</span>
              <span className="emodal__meta-sep" aria-hidden>·</span>
              <span>{product.masterCategory || '—'}</span>
              {product.packSize && (
                <>
                  <span className="emodal__meta-sep" aria-hidden>·</span>
                  <span>Pack {product.packSize}</span>
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            className="emodal__close"
            onClick={() => onClose?.()}
            disabled={isSaving}
            aria-label="Close edit dialog"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        <div className="emodal__body" onKeyDown={onKeyDown}>
          <section className="emodal__section">
            <div className="emodal__section-head">
              <h3 className="emodal__section-title">Cost breakdown</h3>
              <span className="emodal__section-note">
                All fields required — enter <strong>0</strong> if not applicable.
              </span>
            </div>
            <div className="emodal__grid">
              {COST_FIELDS.map((f, i) => {
                const err = showValidation ? fieldErrors[f.key] : null;
                return (
                  <label key={f.key} className="emodal__field">
                    <span className="emodal__label">
                      {f.label}
                      <span className="emodal__required" aria-hidden>*</span>
                    </span>
                    <input
                      ref={i === 0 ? firstInputRef : undefined}
                      data-field={f.key}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      required
                      className={`emodal__input ${err ? 'emodal__input--error' : ''}`}
                      value={draft[f.key]}
                      onChange={(e) => patch(f.key, e.target.value)}
                      onFocus={() => handleFocus(f.key)}
                      onBlur={() => handleBlur(f.key)}
                      disabled={isSaving}
                      aria-invalid={Boolean(err)}
                    />
                  </label>
                );
              })}
            </div>
          </section>

          <section className="emodal__totals">
            <div className="emodal__total-card emodal__total-card--auto">
              <span className="emodal__total-label">Total Cost</span>
              <span className="emodal__total-value">
                {Number.isFinite(totalCost) ? formatPrice(totalCost) : '—'}
              </span>
              <span className="emodal__total-hint">
                Auto = source price + all cost components
              </span>
            </div>

            <label
              className={`emodal__total-card emodal__total-card--manual ${
                showValidation && fieldErrors.categoryTeamCost
                  ? 'emodal__total-card--error'
                  : ''
              }`}
            >
              <span className="emodal__total-label">
                CATAGORY TEAM COST
                <span className="emodal__required" aria-hidden>*</span>
              </span>
              <input
                data-field="categoryTeamCost"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                required
                className={`emodal__total-input ${
                  showValidation && fieldErrors.categoryTeamCost
                    ? 'emodal__input--error'
                    : ''
                }`}
                value={draft.categoryTeamCost}
                onChange={(e) => patch('categoryTeamCost', e.target.value)}
                onFocus={() => handleFocus('categoryTeamCost')}
                onBlur={() => handleBlur('categoryTeamCost')}
                disabled={isSaving}
                aria-invalid={Boolean(
                  showValidation && fieldErrors.categoryTeamCost,
                )}
              />
              <span className="emodal__total-hint">Entered manually (required)</span>
            </label>
          </section>

          {error && (
            <p className="emodal__error" role="alert">
              {error}
            </p>
          )}
        </div>

        <footer className="emodal__foot">
          <span
            className={`emodal__dirty ${hasInvalid ? 'emodal__dirty--warn' : ''}`}
          >
            {hasInvalid
              ? `${invalidKeys.length} field${invalidKeys.length === 1 ? '' : 's'} need a value`
              : dirtyCount > 0
                ? `${dirtyCount} unsaved change${dirtyCount === 1 ? '' : 's'}`
                : 'No changes yet'}
          </span>
          <div className="emodal__actions">
            <button
              type="button"
              className="emodal__btn emodal__btn--ghost"
              onClick={() => onClose?.()}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="emodal__btn emodal__btn--primary"
              onClick={handleSave}
              disabled={isSaving || hasInvalid || dirtyCount === 0}
            >
              {isSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default EditProductModal;
