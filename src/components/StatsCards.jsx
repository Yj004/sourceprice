/**
 * StatsCards — Phase 4
 * ----------------------------------------------------------------
 * 4 KPI cards shown above the table:
 *   - Total Products
 *   - Total Updates
 *   - Products Updated Today (unique ASINs)
 *   - Recent Activity (history entries in the last 24h)
 *
 * Calculations are memoized in the parent (DashboardPage) so this
 * component stays cheap to render.
 */

import './StatsCards.css';

const StatCard = ({ label, value, hint, loading }) => (
  <div className="stat">
    <div className="stat__label">{label}</div>
    <div className="stat__value">
      {loading ? <span className="stat__skel" /> : value}
    </div>
    {hint && <div className="stat__hint">{hint}</div>}
  </div>
);

const StatsCards = ({ stats, loading = false }) => (
  <div className="stats">
    <StatCard label="Total Products"          value={stats.totalProducts}        loading={loading} />
    <StatCard label="Total Updates"           value={stats.totalUpdates}         loading={loading} hint="All-time price changes" />
    <StatCard label="Products Updated Today"  value={stats.productsUpdatedToday} loading={loading} hint="Unique ASINs" />
    <StatCard label="Recent Activity"         value={stats.recentActivity}       loading={loading} hint="Last 24 hours" />
  </div>
);

export default StatsCards;
