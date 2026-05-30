/**
 * TodayUpdatesModal
 * ----------------------------------------------------------------
 * Popup triggered by the "My Updates Today" KPI card. Lists the
 * current user's edit sessions for the local calendar day, grouped
 * by (asin, timestamp). Each session shows every field that was
 * changed in that save with old → new values.
 *
 * Pure presentational — the parent supplies an already-filtered list
 * of entries (the dashboard does the email + date filtering so this
 * component stays trivially testable).
 */

import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { countEditSessions } from '../utils/countUpdates.js';
import {
  countFieldChanges,
  formatHistoryValue,
  groupBySession,
  isNumericValue,
} from '../utils/historyGrouping.js';
import './TodayUpdatesModal.css';

const initialOf = (email) =>
  String(email || '?').trim().charAt(0).toUpperCase();

const TodayUpdatesModal = ({
  entries = [],
  userEmail = '',
  onClose,
  onNavigate,
}) => {
  const sessions = useMemo(() => groupBySession(entries), [entries]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const sessionCount = countEditSessions(entries);
  const changeCount = countFieldChanges(entries);
  const uniqueProducts = new Set(sessions.map((s) => s.asin).filter(Boolean)).size;

  return (
    <div
      className="tumodal__backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="tumodal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tumodal-title"
      >
        <header className="tumodal__head">
          <div className="tumodal__head-text">
            <p className="tumodal__eyebrow">Today's updates</p>
            <h2 id="tumodal-title" className="tumodal__title">
              {userEmail ? `Edits by ${userEmail}` : 'Your edits'}
            </h2>
            <p className="tumodal__sub">
              <span className="tumodal__stat">
                <strong>{sessionCount}</strong> edit
                {sessionCount === 1 ? '' : 's'}
              </span>
              <span className="tumodal__stat-sep" aria-hidden>·</span>
              <span className="tumodal__stat">
                <strong>{changeCount}</strong> field change
                {changeCount === 1 ? '' : 's'}
              </span>
              <span className="tumodal__stat-sep" aria-hidden>·</span>
              <span className="tumodal__stat">
                <strong>{uniqueProducts}</strong> product
                {uniqueProducts === 1 ? '' : 's'}
              </span>
            </p>
          </div>
          <button
            type="button"
            className="tumodal__close"
            onClick={() => onClose?.()}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        <div className="tumodal__body">
          {sessions.length === 0 ? (
            <div className="tumodal__empty">
              <div className="tumodal__empty-icon" aria-hidden>
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                  <path d="M12 14v4M10 16h4" />
                </svg>
              </div>
              <p className="tumodal__empty-text">
                You haven't made any updates today yet.
              </p>
              <p className="tumodal__empty-hint">
                Click <strong>Edit</strong> on any product row to record one.
              </p>
            </div>
          ) : (
            <ol className="tumodal__sessions">
              {sessions.map((s) => (
                <li key={s.key} className="tumodal__session">
                  <div className="tumodal__session-head">
                    <span className="tumodal__avatar" aria-hidden>
                      {initialOf(s.updatedBy)}
                    </span>
                    <div className="tumodal__session-meta">
                      <Link
                        to={`/product/${encodeURIComponent(s.asin)}`}
                        className="tumodal__model"
                        onClick={() => onNavigate?.()}
                        title="View full product history"
                      >
                        {s.modelNo || s.snapshot?.modelNo || s.asin || '—'}
                      </Link>
                      <span className="tumodal__asin">{s.asin}</span>
                      <span className="tumodal__product-meta">
                        {s.brand || s.snapshot?.brand || '—'}
                        {(s.snapshot?.packSize || s.packSize) && (
                          <> · Pack {s.snapshot?.packSize || s.packSize}</>
                        )}
                      </span>
                    </div>
                    <div className="tumodal__session-right">
                      <span className="tumodal__time">{s.timestamp}</span>
                      <span className="tumodal__badge">
                        {s.changes.length > 0
                          ? `${s.changes.length} change${s.changes.length === 1 ? '' : 's'}`
                          : 'Full snapshot'}
                      </span>
                    </div>
                  </div>

                  <ul className="tumodal__changes">
                    {s.changes.map((c) => {
                      const oldV = c.oldValue ?? c.oldPrice;
                      const newV = c.newValue ?? c.newPrice;
                      const numeric =
                        isNumericValue(oldV) && isNumericValue(newV);
                      const isUp =
                        numeric && Number(newV) > Number(oldV);
                      return (
                        <li key={c.id} className="tumodal__change">
                          <span className="tumodal__change-field">
                            {c.field}
                          </span>
                          <span
                            className={`tumodal__change-delta ${
                              numeric
                                ? isUp
                                  ? 'tumodal__change-delta--up'
                                  : 'tumodal__change-delta--down'
                                : ''
                            }`}
                          >
                            {formatHistoryValue(oldV, c.field)}{' '}
                            <span className="tumodal__change-arrow">→</span>{' '}
                            {formatHistoryValue(newV, c.field)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </div>

        <footer className="tumodal__foot">
          <button
            type="button"
            className="tumodal__btn"
            onClick={() => onClose?.()}
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
};

export default TodayUpdatesModal;
