/**
 * HistoryPanel
 * ----------------------------------------------------------------
 * Recent price changes (newest first). Each entry shows:
 *   - user avatar (gradient circle with initial)
 *   - ASIN + update# badge
 *   - directional delta with arrow (↑ for raise, ↓ for cut)
 *   - actor and timestamp
 */

import { formatPrice } from '../utils/format.js';
import './HistoryPanel.css';

const initialOf = (email) => String(email || '?').trim().charAt(0).toUpperCase();

const ArrowUp = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M7 17 17 7" />
    <path d="M7 7h10v10" />
  </svg>
);

const ArrowDown = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M7 7 17 17" />
    <path d="M17 7v10H7" />
  </svg>
);

const HistoryPanel = ({ entries = [], loading = false }) => {
  return (
    <aside className="history">
      <div className="history__head">
        <h2 className="history__title">
          <span className="history__title-dot" aria-hidden />
          Recent History
        </h2>
        {!loading && entries.length > 0 && (
          <span className="history__count">{entries.length}</span>
        )}
      </div>

      {loading ? (
        <div className="history__skel-wrap">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="history__skel" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="history__empty">No price changes yet.</p>
      ) : (
        <ul className="history__list">
          {entries.map((e) => {
            const isUp = e.newPrice > e.oldPrice;
            return (
              <li key={e.id} className="history__item">
                <span
                  className="history__avatar"
                  aria-hidden="true"
                  title={e.updatedBy}
                >
                  {initialOf(e.updatedBy)}
                </span>
                <div className="history__content">
                  <div className="history__row">
                    <span className="history__asin">{e.asin}</span>
                    {typeof e.updateNumber === 'number' && (
                      <span className="history__badge">#{e.updateNumber}</span>
                    )}
                  </div>
                  <div className={`history__delta history__delta--${isUp ? 'up' : 'down'}`}>
                    <span className="history__delta-arrow">
                      {isUp ? <ArrowUp /> : <ArrowDown />}
                    </span>
                    <span className="history__delta-text">
                      {formatPrice(e.oldPrice)} → {formatPrice(e.newPrice)}
                    </span>
                  </div>
                  <div className="history__meta">
                    <span className="history__by" title={e.updatedBy}>{e.updatedBy}</span>
                    <time className="history__time">{e.timestamp}</time>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
};

export default HistoryPanel;
