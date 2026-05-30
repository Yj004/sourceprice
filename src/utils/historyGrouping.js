/**
 * Helpers for history UI.
 *
 * New Price_History rows: one full snapshot per popup save (type: 'snapshot').
 * Legacy rows: one row per changed field (type: 'legacy' or missing type).
 */

import { formatPrice } from './format.js';

const MONEY_PATTERN =
  /price|cost|warehouse|transport|label|labour|poly|pouch|box|cartoon|manual|other/i;

export const SNAPSHOT_FIELDS = [
  { key: 'sourcePrice', label: 'source_price_ex_gst' },
  { key: 'warehouse', label: 'Warehouse' },
  { key: 'transport', label: 'Transport' },
  { key: 'label', label: 'Label' },
  { key: 'labour', label: 'Labour' },
  { key: 'poly', label: 'Poly' },
  { key: 'pouch', label: 'Pouch' },
  { key: 'box', label: 'Box' },
  { key: 'masterCartoon', label: 'Master cartoon' },
  { key: 'manualsPamphlets', label: 'Manuals/Pamphlets' },
  { key: 'otherCost', label: 'Other Cost (if any)' },
  { key: 'totalCost', label: 'Total Cost' },
  { key: 'categoryTeamCost', label: 'CATAGORY TEAM COST' },
];

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const isMoneyField = (field) => MONEY_PATTERN.test(String(field || ''));

export const isNumericValue = (v) =>
  v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));

export const formatHistoryValue = (value, field) => {
  if (!isNumericValue(value)) return String(value ?? '—');
  const n = Number(value);
  if (isMoneyField(field)) return formatPrice(n);
  return new Intl.NumberFormat('en-IN').format(n);
};

/** Diff two snapshot objects → list of { field, oldValue, newValue, ... }. */
export const diffSnapshots = (older, newer) => {
  if (!older || !newer) return [];
  const changes = [];
  for (const { key, label } of SNAPSHOT_FIELDS) {
    const a = older[key];
    const b = newer[key];
    const bothNum = Number.isFinite(Number(a)) && Number.isFinite(Number(b));
    const changed = bothNum
      ? round2(a) !== round2(b)
      : String(a ?? '') !== String(b ?? '');
    if (!changed) continue;
    changes.push({
      id: `${label}-${a}-${b}`,
      field: label,
      oldValue: a,
      newValue: b,
      isNumeric: bothNum,
      oldPrice: bothNum ? Number(a) : undefined,
      newPrice: bothNum ? Number(b) : undefined,
    });
  }
  return changes;
};

const groupLegacyBySession = (entries) => {
  const map = new Map();
  for (const e of entries) {
    const asin = String(e?.asin || '').trim();
    if (!asin) continue;
    const ts = String(e?.timestamp || '').trim();
    const key = `${asin}|${ts}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        timestamp: ts,
        asin,
        brand: e.brand,
        modelNo: e.modelNo,
        masterCategory: e.masterCategory,
        updatedBy: e.updatedBy,
        updateNumber: e.updateNumber,
        changes: [],
        isSnapshot: false,
      });
    }
    map.get(key).changes.push(e);
  }
  return Array.from(map.values());
};

const groupSnapshotsBySession = (entries) => {
  const snapshots = entries.filter((e) => e.type === 'snapshot' && e.snapshot);
  const byAsin = new Map();
  for (const e of snapshots) {
    if (!byAsin.has(e.asin)) byAsin.set(e.asin, []);
    byAsin.get(e.asin).push(e);
  }

  return snapshots.map((e) => {
    const sameAsin = byAsin.get(e.asin) || [];
    const pos = sameAsin.findIndex((s) => s.id === e.id);
    const older = sameAsin[pos + 1];
    const changes = older
      ? diffSnapshots(older.snapshot, e.snapshot)
      : [];

    return {
      key: `${e.asin}|${e.timestamp}`,
      timestamp: e.timestamp,
      asin: e.asin,
      brand: e.brand ?? e.snapshot?.brand,
      modelNo: e.modelNo ?? e.snapshot?.modelNo,
      masterCategory: e.masterCategory ?? e.snapshot?.masterCategory,
      updatedBy: e.updatedBy,
      updateNumber: e.updateNumber,
      snapshot: e.snapshot,
      changes,
      isSnapshot: true,
    };
  });
};

/**
 * Bucket history into edit sessions (newest first).
 * Snapshot rows = one session each; legacy rows grouped by (asin, timestamp).
 */
export const groupBySession = (entries = []) => {
  const legacy = entries.filter((e) => e.type !== 'snapshot');
  const snapshots = entries.filter((e) => e.type === 'snapshot');

  const sessions = [
    ...groupSnapshotsBySession(snapshots),
    ...groupLegacyBySession(legacy),
  ];

  return sessions.sort((a, b) =>
    String(b.timestamp).localeCompare(String(a.timestamp)),
  );
};

/**
 * Per-field stats: diff consecutive snapshots; legacy rows counted per field.
 */
export const computeFieldStats = (entries = []) => {
  const map = new Map();

  const snapshots = entries.filter((e) => e.type === 'snapshot' && e.snapshot);
  const oldestFirst = [...snapshots].reverse();
  for (let i = 1; i < oldestFirst.length; i++) {
    const diffs = diffSnapshots(
      oldestFirst[i - 1].snapshot,
      oldestFirst[i].snapshot,
    );
    for (const d of diffs) {
      const field = d.field;
      if (!map.has(field)) {
        map.set(field, {
          field,
          count: 0,
          firstOldValue: d.oldValue,
          lastNewValue: d.newValue,
        });
      }
      const s = map.get(field);
      s.count += 1;
      s.lastNewValue = d.newValue;
    }
  }

  const legacyOldest = [...entries.filter((e) => e.type !== 'snapshot')].reverse();
  for (const e of legacyOldest) {
    const field = String(e.field || 'source_price_ex_gst').trim();
    if (!map.has(field)) {
      map.set(field, {
        field,
        count: 0,
        firstOldValue: e.oldValue ?? e.oldPrice,
        lastNewValue: e.newValue ?? e.newPrice,
      });
    }
    const s = map.get(field);
    s.count += 1;
    s.lastNewValue = e.newValue ?? e.newPrice;
  }

  return Array.from(map.values())
    .map((s) => {
      const oldN = Number(s.firstOldValue);
      const newN = Number(s.lastNewValue);
      const bothNumeric = Number.isFinite(oldN) && Number.isFinite(newN);
      const delta = bothNumeric ? newN - oldN : null;
      const deltaPercent =
        bothNumeric && oldN !== 0 ? (delta / Math.abs(oldN)) * 100 : null;
      return { ...s, delta, deltaPercent, isMoney: isMoneyField(s.field) };
    })
    .sort((a, b) => b.count - a.count || a.field.localeCompare(b.field));
};

/** Count field-level changes across sessions. */
export const countFieldChanges = (entries = []) =>
  groupBySession(entries).reduce((n, s) => n + s.changes.length, 0);
