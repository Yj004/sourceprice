/**
 * StatsCards
 * ----------------------------------------------------------------
 * 4 KPI cards. Each has its own tonal accent (icon background +
 * left edge stripe) so the row scans quickly. Skeletons cover the
 * initial async load from the services layer.
 */

import './StatsCards.css';

const ICONS = {
  products: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="M3.27 6.96 12 12.01l8.73-5.05" />
      <path d="M12 22.08V12" />
    </svg>
  ),
  updates: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  ),
  today: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  activity: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
};

const StatCard = ({ label, value, hint, tone, icon, loading }) => (
  <div className={`stat stat--${tone}`}>
    <div className="stat__icon" aria-hidden="true">{icon}</div>
    <div className="stat__body">
      <div className="stat__label">{label}</div>
      <div className="stat__value">
        {loading ? <span className="stat__skel" /> : value}
      </div>
      {hint && <div className="stat__hint">{hint}</div>}
    </div>
  </div>
);

const StatsCards = ({ stats, loading = false }) => (
  <div className="stats">
    <StatCard tone="indigo"  icon={ICONS.products} label="Total Products"         value={stats.totalProducts}        loading={loading} />
    <StatCard tone="violet"  icon={ICONS.updates}  label="Total Updates"          value={stats.totalUpdates}         hint="All-time" loading={loading} />
    <StatCard tone="pink"    icon={ICONS.today}    label="Updated Today"          value={stats.productsUpdatedToday} hint="Unique ASINs" loading={loading} />
    <StatCard tone="emerald" icon={ICONS.activity} label="Recent Activity"        value={stats.recentActivity}       hint="Last 24h" loading={loading} />
  </div>
);

export default StatsCards;
