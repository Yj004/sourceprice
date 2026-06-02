/**
 * Category Team Cost update detection (server-side, mirrors client utils).
 */

const CTC_FIELD_RE = /catagory\s*team\s*cost|category\s*team\s*cost/i;
const CTC_KEY = 'categoryTeamCost';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const isCtcFieldLabel = (field) => CTC_FIELD_RE.test(String(field || ''));

const sessionKey = (asin, timestamp) =>
  `${String(asin || '').trim()}|${String(timestamp || '').trim()}`;

export const buildCtcUpdateSessionsByAsin = (history = []) => {
  const sessions = new Map();

  const mark = (asin, timestamp) => {
    const a = String(asin || '').trim();
    if (!a) return;
    if (!sessions.has(a)) sessions.set(a, new Set());
    sessions.get(a).add(sessionKey(a, timestamp));
  };

  for (const entry of history) {
    const asin = String(entry?.asin || '').trim();
    if (!asin) continue;

    if (entry.type === 'snapshot') {
      if (Array.isArray(entry.changedFields) && entry.changedFields.includes(CTC_KEY)) {
        mark(asin, entry.timestamp);
      }
      continue;
    }

    if (isCtcFieldLabel(entry.field)) {
      mark(asin, entry.timestamp);
    }
  }

  const byAsin = new Map();
  for (const entry of history) {
    if (entry.type !== 'snapshot' || !entry.snapshot) continue;
    const asin = String(entry.asin || '').trim();
    if (!asin) continue;
    if (!byAsin.has(asin)) byAsin.set(asin, []);
    byAsin.get(asin).push(entry);
  }

  for (const [asin, rows] of byAsin) {
    const sorted = [...rows].sort((a, b) =>
      String(a.timestamp || '').localeCompare(String(b.timestamp || '')),
    );
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1].snapshot?.categoryTeamCost;
      const next = sorted[i].snapshot?.categoryTeamCost;
      if (round2(prev) !== round2(next)) {
        mark(asin, sorted[i].timestamp);
      }
    }
  }

  return sessions;
};

export const buildCtcUpdateCountByAsin = (history = []) => {
  const sessions = buildCtcUpdateSessionsByAsin(history);
  const counts = new Map();
  for (const [asin, keys] of sessions) {
    counts.set(asin, keys.size);
  }
  return counts;
};
