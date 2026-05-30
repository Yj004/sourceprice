import HistoryList from './HistoryList.jsx';
import './HistoryPanel.css';

const HistoryPanel = ({ entries = [], loading = false }) => (
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
    ) : (
      <HistoryList entries={entries} />
    )}
  </aside>
);

export default HistoryPanel;
