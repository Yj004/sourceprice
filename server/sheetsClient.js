import {
  appendValues,
  batchUpdateValues,
  ensureSheetTab,
  getValues,
} from './sheetsApi.js';

const TABS = {
  MAIN: 'Main_Data',
  UPDATE: 'Price_Update',
  HISTORY: 'Price_History',
};

/** Price_Update tab: one row per source-price change. */
export const PRICE_UPDATE_HEADERS = [
  'Date',
  'ASIN',
  'Brand',
  'Model_No',
  'RCM',
  'Old_Price',
  'New_Price',
];

const PRICE_UPDATE_RANGE = `${TABS.UPDATE}!A2:G`;

/** Main_Data column layout (A..T). */
const COLS = {
  ASIN: 0,
  SOURCE_PRICE: 1,
  GST: 2,
  MODEL_NO: 3,
  PLC: 4,
  MASTER_CATEGORY: 5,
  BRAND: 6,
  PACK_SIZE: 7,
  WAREHOUSE: 8,
  TRANSPORT: 9,
  LABEL: 10,
  LABOUR: 11,
  POLY: 12,
  POUCH: 13,
  BOX: 14,
  MASTER_CARTOON: 15,
  MANUALS: 16,
  OTHER_COST: 17,
  TOTAL_COST: 18,
  CATEGORY_TEAM_COST: 19,
};

const COL_LETTERS = {
  [COLS.SOURCE_PRICE]: 'B',
  [COLS.WAREHOUSE]: 'I',
  [COLS.TRANSPORT]: 'J',
  [COLS.LABEL]: 'K',
  [COLS.LABOUR]: 'L',
  [COLS.POLY]: 'M',
  [COLS.POUCH]: 'N',
  [COLS.BOX]: 'O',
  [COLS.MASTER_CARTOON]: 'P',
  [COLS.MANUALS]: 'Q',
  [COLS.OTHER_COST]: 'R',
  [COLS.TOTAL_COST]: 'S',
  [COLS.CATEGORY_TEAM_COST]: 'T',
};

/**
 * Price_History mirrors Main_Data + Timestamp (A) + Updated_By (V).
 * One row per popup save — full snapshot after the edit.
 */
export const HISTORY_HEADERS = [
  'Timestamp',
  'ASIN',
  'source_price_ex_gst',
  'GST',
  'Model_No',
  'PLC',
  'Master_Category',
  'Brand',
  'Pack_size',
  'Warehouse',
  'Transport',
  'Label',
  'Labour',
  'Poly',
  'Pouch',
  'Box',
  'Master cartoon',
  'Manuals/Pamphlets',
  'Other Cost (if any)',
  'Total Cost',
  'CATAGORY TEAM COST',
  'Updated_By',
];

const HISTORY_COLS = {
  TIMESTAMP: 0,
  ASIN: 1,
  SOURCE_PRICE: 2,
  GST: 3,
  MODEL_NO: 4,
  PLC: 5,
  MASTER_CATEGORY: 6,
  BRAND: 7,
  PACK_SIZE: 8,
  WAREHOUSE: 9,
  TRANSPORT: 10,
  LABEL: 11,
  LABOUR: 12,
  POLY: 13,
  POUCH: 14,
  BOX: 15,
  MASTER_CARTOON: 16,
  MANUALS: 17,
  OTHER_COST: 18,
  TOTAL_COST: 19,
  CATEGORY_TEAM_COST: 20,
  UPDATED_BY: 21,
};

const HISTORY_RANGE = `${TABS.HISTORY}!A2:V`;

const EDITABLE_FIELDS = [
  { key: 'sourcePrice', col: COLS.SOURCE_PRICE, label: 'source_price_ex_gst', composeTotal: true },
  { key: 'warehouse', col: COLS.WAREHOUSE, label: 'Warehouse', composeTotal: true },
  { key: 'transport', col: COLS.TRANSPORT, label: 'Transport', composeTotal: true },
  { key: 'label', col: COLS.LABEL, label: 'Label', composeTotal: true },
  { key: 'labour', col: COLS.LABOUR, label: 'Labour', composeTotal: true },
  { key: 'poly', col: COLS.POLY, label: 'Poly', composeTotal: true },
  { key: 'pouch', col: COLS.POUCH, label: 'Pouch', composeTotal: true },
  { key: 'box', col: COLS.BOX, label: 'Box', composeTotal: true },
  { key: 'masterCartoon', col: COLS.MASTER_CARTOON, label: 'Master cartoon', composeTotal: true },
  { key: 'manualsPamphlets', col: COLS.MANUALS, label: 'Manuals/Pamphlets', composeTotal: true },
  { key: 'otherCost', col: COLS.OTHER_COST, label: 'Other Cost (if any)', composeTotal: true },
  { key: 'categoryTeamCost', col: COLS.CATEGORY_TEAM_COST, label: 'CATAGORY TEAM COST', composeTotal: false },
];

const LEGACY_FIELD_LABELS = new Set([
  ...EDITABLE_FIELDS.map((f) => f.label),
  'Total Cost',
]);

export const EDITABLE_FIELD_KEYS = EDITABLE_FIELDS.map((f) => f.key);

const parseGst = (raw) => {
  const s = String(raw ?? '').replace('%', '').trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const parseNumber = (raw) => {
  if (raw === undefined || raw === null || raw === '') return 0;
  const n = Number(String(raw).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const formatUpdateDate = (date = new Date()) => {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const d = date.getDate();
  const m = months[date.getMonth()];
  const y = String(date.getFullYear()).slice(-2);
  return `${d}-${m}-${y}`;
};

const formatHistoryTimestamp = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const h24 = date.getHours();
  const hh = pad(h24 % 12 || 12);
  const mins = pad(date.getMinutes());
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  return `${yyyy}-${mm}-${dd} ${hh}:${mins} ${ampm}`;
};

/** Google Sheets serial → local Date. */
const sheetsSerialToDate = (serial) => {
  const n = Number(serial);
  if (!Number.isFinite(n) || n < 30000 || n > 60000) return null;
  const whole = Math.floor(n);
  const fraction = n - whole;
  const ms = (whole - 25569) * 86400000 + Math.round(fraction * 86400000);
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Normalize stored timestamp (text or Sheets serial) for API + UI. */
const normalizeHistoryTimestamp = (raw) => {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2} \d{1,2}:\d{2} (AM|PM)$/.test(s)) return s;
  const serialDate = sheetsSerialToDate(s);
  if (serialDate) return formatHistoryTimestamp(serialDate);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : formatHistoryTimestamp(d);
};

/** Leading apostrophe forces Google Sheets to store as plain text. */
const asSheetTextTimestamp = (timestamp) => `'${timestamp}`;

const asSheetTextDate = (dateStr) => `'${dateStr}`;

/**
 * Append one row to Price_Update when source_price_ex_gst changes.
 * Other field edits do not write here (only Price_History).
 */
const appendPriceUpdate = async ({
  asin,
  brand,
  modelNo,
  updatedBy,
  oldPrice,
  newPrice,
  date = new Date(),
}) => {
  await ensureSheetTab(TABS.UPDATE);
  const dateStr = formatUpdateDate(date);
  await appendValues(PRICE_UPDATE_RANGE, [
    [
      asSheetTextDate(dateStr),
      asin,
      brand || '',
      modelNo || '',
      updatedBy || '',
      round2(oldPrice),
      round2(newPrice),
    ],
  ]);
};

const computeTotalCost = (values) => {
  let total = 0;
  for (const f of EDITABLE_FIELDS) {
    if (f.composeTotal) total += parseNumber(values[f.key]);
  }
  return round2(total);
};

const rowToProduct = (row, rowIndex, updateCounts) => {
  const asin = String(row[COLS.ASIN] || '').trim();
  if (!asin || asin === 'ASIN') return null;

  const modelNo = String(row[COLS.MODEL_NO] || '').trim();
  const masterCategory = String(row[COLS.MASTER_CATEGORY] || '').trim();
  const brand = String(row[COLS.BRAND] || '').trim();
  const plc = String(row[COLS.PLC] || '').trim();
  const packSize = String(row[COLS.PACK_SIZE] || '').trim();

  const sourcePrice = parseNumber(row[COLS.SOURCE_PRICE]);
  const warehouse = parseNumber(row[COLS.WAREHOUSE]);
  const transport = parseNumber(row[COLS.TRANSPORT]);
  const label = parseNumber(row[COLS.LABEL]);
  const labour = parseNumber(row[COLS.LABOUR]);
  const poly = parseNumber(row[COLS.POLY]);
  const pouch = parseNumber(row[COLS.POUCH]);
  const box = parseNumber(row[COLS.BOX]);
  const masterCartoon = parseNumber(row[COLS.MASTER_CARTOON]);
  const manualsPamphlets = parseNumber(row[COLS.MANUALS]);
  const otherCost = parseNumber(row[COLS.OTHER_COST]);
  const categoryTeamCost = parseNumber(row[COLS.CATEGORY_TEAM_COST]);

  const totalCost = round2(
    sourcePrice +
      warehouse +
      transport +
      label +
      labour +
      poly +
      pouch +
      box +
      masterCartoon +
      manualsPamphlets +
      otherCost,
  );

  return {
    id: asin,
    rowIndex,
    asin,
    sourcePrice,
    currentPrice: sourcePrice,
    gst: parseGst(row[COLS.GST]),
    modelNo: modelNo === '#N/A' ? '' : modelNo,
    plc: plc === '#N/A' ? '' : plc,
    masterCategory,
    brand: brand || (modelNo.startsWith('RB-') ? 'Robustt' : ''),
    packSize,
    warehouse,
    transport,
    label,
    labour,
    poly,
    pouch,
    box,
    masterCartoon,
    manualsPamphlets,
    otherCost,
    totalCost,
    categoryTeamCost,
    totalUpdates: updateCounts.get(asin) || 0,
  };
};

/** One history row = one edit (new schema). */
const countUpdatesByAsin = (historyRows) => {
  const counts = new Map();
  const asinSeq = new Map();
  historyRows.forEach((row, idx) => {
    const entry = parseHistoryRow(row, idx, asinSeq);
    if (!entry) return;
    counts.set(entry.asin, (counts.get(entry.asin) || 0) + 1);
  });
  return counts;
};

const isLegacyHistoryRow = (row) => {
  if (!row || row.length < 8) return false;
  if (row.length >= 15) return false;
  const field = String(row[7] || '').trim();
  return LEGACY_FIELD_LABELS.has(field);
};

const rowToSnapshot = (row) => ({
  sourcePrice: parseNumber(row[HISTORY_COLS.SOURCE_PRICE]),
  gst: parseGst(row[HISTORY_COLS.GST]),
  modelNo: String(row[HISTORY_COLS.MODEL_NO] || '').trim(),
  plc: String(row[HISTORY_COLS.PLC] || '').trim(),
  masterCategory: String(row[HISTORY_COLS.MASTER_CATEGORY] || '').trim(),
  brand: String(row[HISTORY_COLS.BRAND] || '').trim(),
  packSize: String(row[HISTORY_COLS.PACK_SIZE] || '').trim(),
  warehouse: parseNumber(row[HISTORY_COLS.WAREHOUSE]),
  transport: parseNumber(row[HISTORY_COLS.TRANSPORT]),
  label: parseNumber(row[HISTORY_COLS.LABEL]),
  labour: parseNumber(row[HISTORY_COLS.LABOUR]),
  poly: parseNumber(row[HISTORY_COLS.POLY]),
  pouch: parseNumber(row[HISTORY_COLS.POUCH]),
  box: parseNumber(row[HISTORY_COLS.BOX]),
  masterCartoon: parseNumber(row[HISTORY_COLS.MASTER_CARTOON]),
  manualsPamphlets: parseNumber(row[HISTORY_COLS.MANUALS]),
  otherCost: parseNumber(row[HISTORY_COLS.OTHER_COST]),
  totalCost: parseNumber(row[HISTORY_COLS.TOTAL_COST]),
  categoryTeamCost: parseNumber(row[HISTORY_COLS.CATEGORY_TEAM_COST]),
});

const productToHistoryRow = (product, timestamp, updatedBy) => [
  asSheetTextTimestamp(timestamp),
  product.asin,
  product.sourcePrice,
  product.gst,
  product.modelNo,
  product.plc,
  product.masterCategory,
  product.brand,
  product.packSize,
  product.warehouse,
  product.transport,
  product.label,
  product.labour,
  product.poly,
  product.pouch,
  product.box,
  product.masterCartoon,
  product.manualsPamphlets,
  product.otherCost,
  product.totalCost,
  product.categoryTeamCost,
  updatedBy,
];

const parseLegacyHistoryRow = (row, idx, asinSeq) => {
  const asin = String(row[1] || '').trim();
  if (!asin) return null;

  const oldRaw = String(row[5] ?? '').trim();
  const newRaw = String(row[6] ?? '').trim();
  const oldNumeric = parseNumber(row[5]);
  const newNumeric = parseNumber(row[6]);
  const oldNumericValid =
    oldRaw !== '' && Number.isFinite(Number(oldRaw.replace(/,/g, '')));
  const newNumericValid =
    newRaw !== '' && Number.isFinite(Number(newRaw.replace(/,/g, '')));

  const timestamp = normalizeHistoryTimestamp(String(row[0] || '').trim());
  const field = String(row[7] || '').trim() || 'source_price_ex_gst';
  const updatedBy = String(row[8] || '').trim();

  const updateNumber = (asinSeq.get(asin) || 0) + 1;
  asinSeq.set(asin, updateNumber);

  return {
    id: `hist-legacy-${idx}-${asin}`,
    type: 'legacy',
    asin,
    brand: String(row[2] || '').trim(),
    masterCategory: String(row[3] || '').trim(),
    modelNo: String(row[4] || '').trim(),
    field,
    oldValue: oldNumericValid ? oldNumeric : oldRaw,
    newValue: newNumericValid ? newNumeric : newRaw,
    isNumeric: oldNumericValid && newNumericValid,
    oldPrice: oldNumeric,
    newPrice: newNumeric,
    timestamp,
    updatedBy,
    updateNumber,
  };
};

const parseSnapshotHistoryRow = (row, idx, asinSeq) => {
  const asin = String(row[HISTORY_COLS.ASIN] || '').trim();
  if (!asin) return null;

  const timestamp = normalizeHistoryTimestamp(
    String(row[HISTORY_COLS.TIMESTAMP] || '').trim(),
  );
  const updatedBy = String(row[HISTORY_COLS.UPDATED_BY] || '').trim();
  const snapshot = rowToSnapshot(row);

  const updateNumber = (asinSeq.get(asin) || 0) + 1;
  asinSeq.set(asin, updateNumber);

  return {
    id: `hist-${idx}-${asin}`,
    type: 'snapshot',
    asin,
    brand: snapshot.brand,
    masterCategory: snapshot.masterCategory,
    modelNo: snapshot.modelNo,
    timestamp,
    updatedBy,
    updateNumber,
    snapshot,
    field: 'Edit record',
    oldPrice: snapshot.sourcePrice,
    newPrice: snapshot.sourcePrice,
    isNumeric: true,
  };
};

const parseHistoryRow = (row, idx, asinSeq) => {
  if (isLegacyHistoryRow(row)) {
    return parseLegacyHistoryRow(row, idx, asinSeq);
  }
  if (String(row[HISTORY_COLS.ASIN] || '').trim()) {
    return parseSnapshotHistoryRow(row, idx, asinSeq);
  }
  return null;
};

export const fetchProducts = async () => {
  const [mainRows, historyRows] = await Promise.all([
    getValues(`${TABS.MAIN}!A2:T`),
    getValues(HISTORY_RANGE),
  ]);

  const updateCounts = countUpdatesByAsin(historyRows);

  const products = [];
  mainRows.forEach((row, i) => {
    const product = rowToProduct(row, i + 2, updateCounts);
    if (product) products.push(product);
  });

  return products;
};

const buildRcmLookup = (updateRows) => {
  const map = new Map();
  for (let i = 0; i < updateRows.length; i++) {
    const row = updateRows[i];
    const asin = String(row[1] || '').trim();
    const oldP = parseNumber(row[5]);
    const newP = parseNumber(row[6]);
    const rcm = String(row[4] || '').trim();
    if (asin) map.set(`${asin}|${oldP}|${newP}`, rcm);
  }
  return map;
};

export const fetchHistory = async () => {
  const [historyRows, updateRows] = await Promise.all([
    getValues(HISTORY_RANGE),
    getValues(`${TABS.UPDATE}!A2:G`),
  ]);

  const rcmByKey = buildRcmLookup(updateRows);
  const asinSeq = new Map();

  const entries = historyRows
    .map((row, idx) => {
      const entry = parseHistoryRow(row, idx, asinSeq);
      if (!entry) return null;

      if (entry.type === 'legacy' && !entry.updatedBy) {
        const oldP = entry.oldPrice;
        const newP = entry.newPrice;
        entry.updatedBy =
          rcmByKey.get(`${entry.asin}|${oldP}|${newP}`) || '';
      }

      return entry;
    })
    .filter(Boolean)
    .reverse();

  return entries;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const findMainDataProduct = async (asin) => {
  const colA = await getValues(`${TABS.MAIN}!A:A`);
  const rowIndex = colA.findIndex((r) => String(r[0] || '').trim() === asin);
  if (rowIndex < 1) return null;

  const sheetRow = rowIndex + 1;
  const row = await getValues(`${TABS.MAIN}!A${sheetRow}:T${sheetRow}`);
  const cells = row[0] || [];
  return rowToProduct(cells, sheetRow, new Map());
};

/**
 * Read product row twice with a short gap so Google Sheets values settle.
 * Stale reads caused emails one save behind and duplicate CTC alerts.
 */
const findMainDataProductStable = async (asin) => {
  const first = await findMainDataProduct(asin);
  if (!first) return null;

  await sleep(120);
  const second = await findMainDataProduct(asin);
  if (!second) return first;

  for (const f of EDITABLE_FIELDS) {
    if (round2(first[f.key]) !== round2(second[f.key])) {
      return second;
    }
  }
  return first;
};

/** Canonical post-save product — use written values, not a possibly stale re-read. */
const applyUpdatesToProduct = (product, next, newTotalCost) => ({
  ...product,
  sourcePrice: next.sourcePrice,
  currentPrice: next.sourcePrice,
  warehouse: next.warehouse,
  transport: next.transport,
  label: next.label,
  labour: next.labour,
  poly: next.poly,
  pouch: next.pouch,
  box: next.box,
  masterCartoon: next.masterCartoon,
  manualsPamphlets: next.manualsPamphlets,
  otherCost: next.otherCost,
  categoryTeamCost: next.categoryTeamCost,
  totalCost: newTotalCost,
});

const mapChangesForClient = (changed) =>
  changed.map((c) => ({
    key: c.field.key,
    label: c.field.label,
    oldValue: c.oldValue,
    newValue: c.newValue,
  }));

export const updateProduct = async ({ asin, updates = {}, updatedBy = 'unknown' }) => {
  const product = await findMainDataProductStable(asin);
  if (!product) {
    return { ok: false, error: 'Product not found.' };
  }

  const next = {};
  for (const f of EDITABLE_FIELDS) {
    const incoming = updates[f.key];
    if (incoming === undefined) {
      next[f.key] = product[f.key];
      continue;
    }
    const n = Number(incoming);
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, error: `Invalid value for ${f.label}.` };
    }
    next[f.key] = round2(n);
  }

  const changed = [];
  for (const f of EDITABLE_FIELDS) {
    const prev = round2(product[f.key]);
    const now = round2(next[f.key]);
    if (prev !== now) {
      changed.push({ field: f, oldValue: prev, newValue: now });
    }
  }

  const prevTotalCostStored = round2(product.totalCost);
  const newTotalCost = computeTotalCost(next);
  const totalChanged = prevTotalCostStored !== newTotalCost;

  if (changed.length === 0 && !totalChanged) {
    return { ok: false, error: 'No changes to save.' };
  }

  const data = changed.map(({ field, newValue }) => ({
    range: `${TABS.MAIN}!${COL_LETTERS[field.col]}${product.rowIndex}`,
    values: [[newValue]],
  }));

  if (totalChanged) {
    data.push({
      range: `${TABS.MAIN}!${COL_LETTERS[COLS.TOTAL_COST]}${product.rowIndex}`,
      values: [[newTotalCost]],
    });
  }

  await batchUpdateValues(data);

  const now = new Date();
  const timestamp = formatHistoryTimestamp(now);
  const merged = applyUpdatesToProduct(product, next, newTotalCost);
  const clientChanges = mapChangesForClient(changed);

  const priceChange = changed.find((c) => c.field.key === 'sourcePrice');
  if (priceChange) {
    await appendPriceUpdate({
      asin,
      brand: product.brand,
      modelNo: product.modelNo,
      updatedBy,
      oldPrice: priceChange.oldValue,
      newPrice: priceChange.newValue,
      date: now,
    });
  }

  await appendValues(`${TABS.HISTORY}!A:V`, [
    productToHistoryRow(merged, timestamp, updatedBy),
  ]);

  const allHistoryRows = await getValues(HISTORY_RANGE);
  const counts = countUpdatesByAsin(allHistoryRows);
  const updated = { ...merged, totalUpdates: counts.get(asin) || 0 };

  const entry = {
    id: `h-${Date.now()}-${asin}`,
    type: 'snapshot',
    asin,
    timestamp,
    updatedBy,
    updateNumber: updated.totalUpdates,
    snapshot: {
      sourcePrice: merged.sourcePrice,
      gst: merged.gst,
      modelNo: merged.modelNo,
      plc: merged.plc,
      masterCategory: merged.masterCategory,
      brand: merged.brand,
      packSize: merged.packSize,
      warehouse: merged.warehouse,
      transport: merged.transport,
      label: merged.label,
      labour: merged.labour,
      poly: merged.poly,
      pouch: merged.pouch,
      box: merged.box,
      masterCartoon: merged.masterCartoon,
      manualsPamphlets: merged.manualsPamphlets,
      otherCost: merged.otherCost,
      totalCost: merged.totalCost,
      categoryTeamCost: merged.categoryTeamCost,
    },
    field: 'Edit record',
    oldPrice: priceChange ? priceChange.oldValue : merged.sourcePrice,
    newPrice: merged.sourcePrice,
    changedFields: changed.map((c) => c.field.key),
  };

  return {
    ok: true,
    product: updated,
    oldPrice: priceChange ? priceChange.oldValue : product.sourcePrice,
    entry,
    changedFields: changed.map((c) => c.field.key),
    changes: clientChanges,
    totalChanged,
    oldTotalCost: prevTotalCostStored,
    newTotalCost,
    priceUpdateLogged: Boolean(priceChange),
    timestamp,
    updatedBy,
  };
};

export const updateProductPrice = async ({ asin, newPrice, updatedBy }) =>
  updateProduct({
    asin,
    updates: { sourcePrice: newPrice },
    updatedBy,
  });
