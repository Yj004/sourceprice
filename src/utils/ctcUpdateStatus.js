/**
 * Category Team Cost (CTC) update status from Price_History.
 * "Updated" = CTC changed at least once in history (1× or more).
 */

import { groupBySession } from './historyGrouping.js';

const CTC_FIELD_RE = /catagory\s*team\s*cost|category\s*team\s*cost/i;

const isCtcChange = (change) => CTC_FIELD_RE.test(String(change?.field || ''));

/** Count how many edit sessions changed CTC per ASIN. */
export const buildCtcUpdateCountByAsin = (history = []) => {
  const counts = new Map();

  for (const session of groupBySession(history)) {
    const asin = String(session?.asin || '').trim();
    if (!asin) continue;

    const ctcChanges = (session.changes || []).filter(isCtcChange);
    if (!ctcChanges.length) continue;

    counts.set(asin, (counts.get(asin) || 0) + ctcChanges.length);
  }

  return counts;
};

export const attachCtcUpdateStatus = (products, history) => {
  const counts = buildCtcUpdateCountByAsin(history);
  return products.map((p) => {
    const ctcUpdateCount = counts.get(p.asin) || 0;
    return {
      ...p,
      ctcUpdateCount,
      ctcEverUpdated: ctcUpdateCount > 0,
    };
  });
};

export const CTC_STATUS = {
  ALL: '',
  NOT_UPDATED: 'notupdated',
  UPDATED: 'updated',
};

export const CTC_STATUS_LABELS = {
  [CTC_STATUS.ALL]: 'All',
  [CTC_STATUS.NOT_UPDATED]: 'Not updated',
  [CTC_STATUS.UPDATED]: 'Updated',
};

export const CTC_STATUS_OPTIONS = [
  CTC_STATUS.NOT_UPDATED,
  CTC_STATUS.UPDATED,
];
