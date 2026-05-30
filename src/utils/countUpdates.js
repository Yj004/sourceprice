/**
 * Price_History: one snapshot row = one edit session (new format).
 * Legacy rows: multiple rows per save — de-dupe by (asin, timestamp).
 */
const editSessionKey = (entry) =>
  `${String(entry?.asin || '').trim()}|${String(entry?.timestamp || '').trim()}`;

export const countEditSessions = (history = []) => {
  let count = 0;
  const legacySeen = new Set();
  for (const entry of history) {
    const asin = String(entry?.asin || '').trim();
    if (!asin) continue;
    if (entry.type === 'snapshot') {
      count += 1;
      continue;
    }
    const key = editSessionKey(entry);
    if (legacySeen.has(key)) continue;
    legacySeen.add(key);
    count += 1;
  }
  return count;
};

export const buildUpdateCountByAsin = (history = []) => {
  const counts = new Map();
  const legacySeen = new Set();
  for (const entry of history) {
    const asin = String(entry?.asin || '').trim();
    if (!asin) continue;
    if (entry.type === 'snapshot') {
      counts.set(asin, (counts.get(asin) || 0) + 1);
      continue;
    }
    const key = editSessionKey(entry);
    if (legacySeen.has(key)) continue;
    legacySeen.add(key);
    counts.set(asin, (counts.get(asin) || 0) + 1);
  }
  return counts;
};

export const attachUpdateCounts = (products, history) => {
  const counts = buildUpdateCountByAsin(history);
  return products.map((p) => ({
    ...p,
    totalUpdates: counts.get(p.asin) ?? p.totalUpdates ?? 0,
  }));
};
