/**
 * ProductHistoryPage
 * ----------------------------------------------------------------
 * Detailed change log for a single ASIN. Three sections after the
 * back link / page header:
 *
 *   1. Product summary       — current state of every meaningful field.
 *   2. Changes per field     — count + value drift per field, sorted
 *                              by edit frequency (clickable to filter).
 *   3. Edit sessions         — every popup save grouped together with
 *                              its sub-changes, newest first.
 *
 * The page consumes the same `history` array that powers the dashboard
 * (already filtered to this ASIN), then re-aggregates it via
 * utils/historyGrouping.js. No new data is fetched here.
 */

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Loader from '../components/Loader.jsx';
import { useProducts } from '../context/useProducts.js';
import { countEditSessions } from '../utils/countUpdates.js';
import { formatPrice } from '../utils/format.js';
import {
  SNAPSHOT_FIELDS,
  computeFieldStats,
  countFieldChanges,
  formatHistoryValue,
  groupBySession,
  isNumericValue,
} from '../utils/historyGrouping.js';
import './ProductHistoryPage.css';

const initialOf = (email) =>
  String(email || '?').trim().charAt(0).toUpperCase();

const formatDelta = (stat) => {
  if (stat.delta == null) return null;
  const sign = stat.delta > 0 ? '+' : '';
  const value = stat.isMoney
    ? formatPrice(Math.abs(stat.delta))
    : new Intl.NumberFormat('en-IN').format(Math.abs(stat.delta));
  const direction = stat.delta > 0 ? '▲' : stat.delta < 0 ? '▼' : '•';
  return { sign, value, direction };
};

const sessionSummary = (session) => {
  const { changes } = session;
  if (!changes.length) return 'Full snapshot saved';
  if (changes.length === 1) {
    const c = changes[0];
    return `${c.field} · ${formatHistoryValue(c.oldValue ?? c.oldPrice, c.field)} → ${formatHistoryValue(c.newValue ?? c.newPrice, c.field)}`;
  }
  const names = changes.slice(0, 2).map((c) => c.field).join(', ');
  const extra = changes.length > 2 ? ` +${changes.length - 2} more` : '';
  return `${changes.length} fields · ${names}${extra}`;
};

const Chevron = ({ open }) => (
  <svg
    className={`phist__session-chevron ${open ? 'phist__session-chevron--open' : ''}`}
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const ProductHistoryPage = () => {
  const { asin: asinParam } = useParams();
  const asin = decodeURIComponent(asinParam || '').trim();
  const { products, history, loading, error } = useProducts();
  const [fieldFilter, setFieldFilter] = useState('');
  const [expandedKeys, setExpandedKeys] = useState(() => new Set());

  const toggleSession = (key) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const product = useMemo(
    () => products.find((p) => p.asin === asin),
    [products, asin],
  );

  const productHistory = useMemo(
    () => history.filter((h) => h.asin === asin),
    [history, asin],
  );

  const fieldStats = useMemo(
    () => computeFieldStats(productHistory),
    [productHistory],
  );

  const editSessionCount = useMemo(
    () => countEditSessions(productHistory),
    [productHistory],
  );

  const allSessions = useMemo(
    () => groupBySession(productHistory),
    [productHistory],
  );

  const fieldChangeCount = useMemo(
    () => countFieldChanges(productHistory),
    [productHistory],
  );

  const sessions = useMemo(
    () =>
      fieldFilter
        ? allSessions.filter((s) =>
            s.changes.some((c) => c.field === fieldFilter),
          )
        : allSessions,
    [allSessions, fieldFilter],
  );

  if (loading) {
    return (
      <>
        <Navbar />
        <Loader label="Loading product history…" />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <main className="phist">
          <p className="phist__error">{error}</p>
          <Link to="/dashboard" className="phist__back">
            ← Back to dashboard
          </Link>
        </main>
      </>
    );
  }

  if (!asin || !product) {
    return (
      <>
        <Navbar />
        <main className="phist">
          <h1 className="phist__title">Product not found</h1>
          <p className="phist__muted">
            No product matches ASIN {asin || '(missing)'}.
          </p>
          <Link to="/dashboard" className="phist__back">
            ← Back to dashboard
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="phist">
        <Link to="/dashboard" className="phist__back">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back to dashboard
        </Link>

        <header className="phist__head">
          <div>
            <p className="phist__eyebrow">Change history</p>
            <h1 className="phist__title">{product.modelNo || '—'}</h1>
            <p className="phist__asin">{product.asin}</p>
            <p className="phist__sub">
              {product.brand || '—'} · {product.masterCategory || '—'}
            </p>
          </div>
          <div className="phist__head-stats">
            <span className="phist__count">
              {editSessionCount} edit{editSessionCount === 1 ? '' : 's'}
            </span>
            <span className="phist__count phist__count--alt">
              {fieldChangeCount} field change{fieldChangeCount === 1 ? '' : 's'}
            </span>
          </div>
        </header>

        {/* — Product summary —————————————————————————————— */}
        <section className="phist__card phist__summary" aria-label="Product details">
          <h2 className="phist__section-title">Current values</h2>
          <dl className="phist__grid">
            <div>
              <dt>Source price (ex GST)</dt>
              <dd className="phist__price">
                {formatPrice(product.sourcePrice ?? product.currentPrice)}
              </dd>
            </div>
            <div>
              <dt>Total Cost</dt>
              <dd className="phist__price">{formatPrice(product.totalCost)}</dd>
            </div>
            <div>
              <dt>CATAGORY TEAM COST</dt>
              <dd className="phist__price">
                {product.categoryTeamCost > 0
                  ? formatPrice(product.categoryTeamCost)
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>Pack size</dt>
              <dd>{product.packSize || '—'}</dd>
            </div>
            <div>
              <dt>PLC</dt>
              <dd>{product.plc || '—'}</dd>
            </div>
            <div>
              <dt>GST</dt>
              <dd>{product.gst ? `${product.gst}%` : '—'}</dd>
            </div>
          </dl>
        </section>

        {/* — Changes per field —————————————————————————————— */}
        {fieldStats.length > 0 && (
          <section className="phist__card" aria-label="Changes per field">
            <h2 className="phist__section-title">Changes per field</h2>
            <p className="phist__hint">
              Click a row to filter the timeline below.
            </p>
            <ul className="phist__fields">
              {fieldStats.map((s) => {
                const active = fieldFilter === s.field;
                const delta = formatDelta(s);
                return (
                  <li key={s.field}>
                    <button
                      type="button"
                      className={`phist__field-row ${active ? 'phist__field-row--active' : ''}`}
                      onClick={() =>
                        setFieldFilter((prev) => (prev === s.field ? '' : s.field))
                      }
                    >
                      <span className="phist__field-name">{s.field}</span>
                      <span className="phist__field-count">
                        {s.count} change{s.count === 1 ? '' : 's'}
                      </span>
                      <span className="phist__field-range">
                        {formatHistoryValue(s.firstOldValue, s.field)}{' '}
                        <span className="phist__field-arrow">→</span>{' '}
                        {formatHistoryValue(s.lastNewValue, s.field)}
                      </span>
                      {delta && (
                        <span
                          className={`phist__field-delta phist__field-delta--${
                            s.delta > 0 ? 'up' : s.delta < 0 ? 'down' : 'flat'
                          }`}
                        >
                          {delta.direction} {delta.sign}
                          {delta.value}
                          {s.deltaPercent != null && (
                            <span className="phist__field-delta-pct">
                              {' '}
                              ({s.deltaPercent > 0 ? '+' : ''}
                              {s.deltaPercent.toFixed(1)}%)
                            </span>
                          )}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* — Edit sessions ————————————————————————————————— */}
        <section className="phist__card" aria-label="Edit sessions">
          <div className="phist__section-head">
            <h2 className="phist__section-title">
              {fieldFilter ? `Edits affecting "${fieldFilter}"` : 'All edit sessions'}
            </h2>
            {fieldFilter && (
              <button
                type="button"
                className="phist__clear-filter"
                onClick={() => setFieldFilter('')}
              >
                Clear filter
              </button>
            )}
          </div>
          <p className="phist__hint">
            One line per update — click to see full details.
          </p>

          {sessions.length === 0 ? (
            <p className="phist__empty">
              {fieldFilter
                ? `No changes recorded for "${fieldFilter}" yet.`
                : 'No changes recorded for this product yet.'}
            </p>
          ) : (
            <ol className="phist__sessions">
              {sessions.map((s) => {
                const open = expandedKeys.has(s.key);
                return (
                  <li
                    key={s.key}
                    className={`phist__session ${open ? 'phist__session--open' : ''}`}
                  >
                    <button
                      type="button"
                      className="phist__session-toggle"
                      onClick={() => toggleSession(s.key)}
                      aria-expanded={open}
                    >
                      <Chevron open={open} />
                      <span className="phist__session-line">
                        <time className="phist__session-time">{s.timestamp}</time>
                        {typeof s.updateNumber === 'number' && (
                          <>
                            <span className="phist__session-sep" aria-hidden>·</span>
                            <span className="phist__session-edit">Edit #{s.updateNumber}</span>
                          </>
                        )}
                        <span className="phist__session-sep" aria-hidden>·</span>
                        <span className="phist__session-summary">
                          {sessionSummary(s)}
                        </span>
                      </span>
                    </button>

                    {open && (
                      <div className="phist__session-body">
                        <div className="phist__session-detail-head">
                          <span className="phist__session-avatar" aria-hidden>
                            {initialOf(s.updatedBy)}
                          </span>
                          <div className="phist__session-meta">
                            <span className="phist__session-by" title={s.updatedBy}>
                              {s.updatedBy || '—'}
                            </span>
                            {(s.snapshot?.modelNo || s.modelNo) && (
                              <span className="phist__session-product">
                                {s.snapshot?.modelNo || s.modelNo}
                                {(s.snapshot?.packSize || product.packSize) && (
                                  <> · Pack {s.snapshot?.packSize || product.packSize}</>
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        {s.changes.length > 0 && (
                          <>
                            <h3 className="phist__session-subtitle">What changed</h3>
                            <ul className="phist__session-changes">
                              {s.changes.map((c) => {
                                const numericPair =
                                  isNumericValue(c.oldValue ?? c.oldPrice) &&
                                  isNumericValue(c.newValue ?? c.newPrice);
                                const isUp =
                                  numericPair &&
                                  Number(c.newValue ?? c.newPrice) >
                                    Number(c.oldValue ?? c.oldPrice);
                                return (
                                  <li key={c.id} className="phist__change">
                                    <span className="phist__change-field">{c.field}</span>
                                    <span
                                      className={`phist__change-delta ${
                                        numericPair
                                          ? isUp
                                            ? 'phist__change-delta--up'
                                            : 'phist__change-delta--down'
                                          : ''
                                      }`}
                                    >
                                      {formatHistoryValue(c.oldValue ?? c.oldPrice, c.field)}{' '}
                                      <span className="phist__change-arrow">→</span>{' '}
                                      {formatHistoryValue(c.newValue ?? c.newPrice, c.field)}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          </>
                        )}

                        {s.isSnapshot && s.snapshot && (
                          <>
                            <h3 className="phist__session-subtitle">
                              {s.changes.length > 0 ? 'Full record after save' : 'Saved values'}
                            </h3>
                            <dl className="phist__snapshot-grid">
                              {SNAPSHOT_FIELDS.map(({ key, label }) => (
                                <div key={key}>
                                  <dt>{label}</dt>
                                  <dd>
                                    {formatHistoryValue(s.snapshot[key], label)}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          </>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </main>
    </>
  );
};

export default ProductHistoryPage;
