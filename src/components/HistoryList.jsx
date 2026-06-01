import { Link } from 'react-router-dom';
import { formatHistoryValue, isNumericValue } from '../utils/historyGrouping.js';
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

const ProductIdentity = ({ entry }) => {
  const model = String(entry.snapshot?.modelNo ?? entry.modelNo ?? '').trim();
  const asin = String(entry.asin ?? '').trim();
  const brand = String(entry.brand ?? entry.snapshot?.brand ?? '').trim();
  const pack = String(entry.snapshot?.packSize ?? '').trim();
  const primary = model || asin || '—';

  return (
    <div className="history__identity">
      <span className="history__model" title={primary}>
        {primary}
      </span>
      {asin && model && <span className="history__asin">{asin}</span>}
      {(brand || pack) && (
        <span className="history__product-meta">
          {[brand, pack && `Pack ${pack}`].filter(Boolean).join(' · ')}
        </span>
      )}
    </div>
  );
};

const SnapshotSummary = ({ entry }) => {
  const snap = entry.snapshot;
  if (!snap) return null;
  return (
    <div className="history__snapshot-summary">
      <span>Source {formatPrice(snap.sourcePrice)}</span>
      <span className="history__snapshot-sep" aria-hidden>·</span>
      <span>Total {formatPrice(snap.totalCost)}</span>
      {snap.categoryTeamCost > 0 && (
        <>
          <span className="history__snapshot-sep" aria-hidden>·</span>
          <span>CTC {formatPrice(snap.categoryTeamCost)}</span>
        </>
      )}
    </div>
  );
};

const HistoryItemShell = ({ entry, asin, children }) => {
  const label = String(entry.snapshot?.modelNo ?? entry.modelNo ?? asin ?? 'Product');

  if (asin) {
    return (
      <Link
        to={`/product/${encodeURIComponent(asin)}`}
        className="history__card-link"
        aria-label={`View history for ${label}`}
      >
        <span className="history__avatar" aria-hidden="true" title={entry.updatedBy}>
          {initialOf(entry.updatedBy)}
        </span>
        <div className="history__content">{children}</div>
      </Link>
    );
  }

  return (
    <div className="history__card-link history__card-link--static">
      <span className="history__avatar" aria-hidden="true" title={entry.updatedBy}>
        {initialOf(entry.updatedBy)}
      </span>
      <div className="history__content">{children}</div>
    </div>
  );
};

const HistoryList = ({
  entries = [],
  emptyMessage = 'No price changes yet.',
}) => {
  if (!entries.length) {
    return <p className="history__empty">{emptyMessage}</p>;
  }

  return (
    <ul className="history__list">
      {entries.map((e) => {
        const asin = String(e.asin ?? '').trim();

        if (e.type === 'snapshot' && e.snapshot) {
          return (
            <li key={e.id} className="history__item history__item--snapshot">
              <HistoryItemShell entry={e} asin={asin}>
                <div className="history__row">
                  <ProductIdentity entry={e} />
                  {typeof e.updateNumber === 'number' && (
                    <span className="history__badge">#{e.updateNumber}</span>
                  )}
                </div>
                <span className="history__field">Full edit saved</span>
                <SnapshotSummary entry={e} />
                <div className="history__meta">
                  <span className="history__by" title={e.updatedBy}>
                    {e.updatedBy || '—'}
                  </span>
                  <time className="history__time">{e.timestamp}</time>
                </div>
              </HistoryItemShell>
            </li>
          );
        }

        const oldVal = e.oldValue ?? e.oldPrice;
        const newVal = e.newValue ?? e.newPrice;
        const numericPair = isNumericValue(oldVal) && isNumericValue(newVal);
        const isUp = numericPair && Number(newVal) > Number(oldVal);
        const fieldLabel = e.field || 'source_price_ex_gst';

        return (
          <li key={e.id} className="history__item">
            <HistoryItemShell entry={e} asin={asin}>
              <div className="history__row">
                <ProductIdentity entry={e} />
                {typeof e.updateNumber === 'number' && (
                  <span className="history__badge">#{e.updateNumber}</span>
                )}
              </div>
              <span className="history__field" title={fieldLabel}>
                {fieldLabel}
              </span>
              <div
                className={
                  numericPair
                    ? `history__delta history__delta--${isUp ? 'up' : 'down'}`
                    : 'history__delta history__delta--neutral'
                }
              >
                {numericPair && (
                  <span className="history__delta-arrow">
                    {isUp ? <ArrowUp /> : <ArrowDown />}
                  </span>
                )}
                <span className="history__delta-text">
                  {formatHistoryValue(oldVal, fieldLabel)} → {formatHistoryValue(newVal, fieldLabel)}
                </span>
              </div>
              <div className="history__meta">
                <span className="history__by" title={e.updatedBy}>
                  {e.updatedBy || '—'}
                </span>
                <time className="history__time">{e.timestamp}</time>
              </div>
            </HistoryItemShell>
          </li>
        );
      })}
    </ul>
  );
};

export default HistoryList;
