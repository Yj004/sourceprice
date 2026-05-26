/**
 * HistoryPanel — Phase 4
 * ----------------------------------------------------------------
 * Recent price changes (newest first). Each entry now also shows
 * the per-product `updateNumber` (e.g. "#5" — the 5th edit of that
 * ASIN), making it easy to spot products that are churning.
 */

import { formatPrice } from '../utils/format.js';
import './HistoryPanel.css';

const HistoryPanel = ({ entries = [], loading = false }) => {
  return (
    <aside className="history">
      <div className="history__head">
        <h2 className="history__title">Recent History</h2>
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
            const direction = e.newPrice > e.oldPrice ? 'up' : 'down';
            return (
              <li key={e.id} className="history__item">
                <div className="history__row">
                  <span className="history__asin">{e.asin}</span>
                  {typeof e.updateNumber === 'number' && (
                    <span className="history__badge">#{e.updateNumber}</span>
                  )}
                  <span className={`history__delta history__delta--${direction}`}>
                    {formatPrice(e.oldPrice)} → {formatPrice(e.newPrice)}
                  </span>
                </div>
                <div className="history__meta">
                  <span className="history__by" title={e.updatedBy}>{e.updatedBy}</span>
                  <time className="history__time">{e.timestamp}</time>
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
