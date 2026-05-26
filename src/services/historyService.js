/**
 * historyService — Phase 4
 * ----------------------------------------------------------------
 * Domain service for the price-change audit log.
 *
 * Architectural flow:
 *   UI -> ProductContext -> historyService -> storage (localStorage)
 *                                                ^
 *                              SWAP POINT for future Google Sheets API
 *
 * Public API:
 *   getHistory()                Promise<HistoryEntry[]>  // newest first
 *   addHistoryRecord(entry)     Promise<{ ok, entry }>
 *
 * History entry shape:
 *   {
 *     id: string,              // unique
 *     asin: string,
 *     oldPrice: number,
 *     newPrice: number,
 *     updatedBy: string,       // gmail of the acting user
 *     timestamp: string,       // "YYYY-MM-DD HH:MM AM/PM"
 *     updateNumber: number,    // post-update count for this product
 *   }
 *
 * FUTURE GOOGLE SHEETS INTEGRATION POINTS:
 *   - getHistory():
 *       fetch(`${API_BASE}/sheets/history`)
 *   - addHistoryRecord():
 *       fetch(`${API_BASE}/sheets/history`, {
 *         method: 'POST', body: JSON.stringify(entry)
 *       })
 *       (Or POST to an Apps Script Webhook that appends a row.)
 */

import { priceHistory } from '../data/dummyData.js';
import storage, { storageKeys } from './storage.js';

const ARTIFICIAL_DELAY_MS = 180;
const delay = (ms = ARTIFICIAL_DELAY_MS) => new Promise((r) => setTimeout(r, ms));

const loadFromStorage = () => {
  const stored = storage.get(storageKeys.HISTORY);
  if (Array.isArray(stored)) return stored;

  storage.set(storageKeys.HISTORY, priceHistory);
  return [...priceHistory];
};

export const getHistory = async () => {
  await delay();
  return loadFromStorage();
};

export const addHistoryRecord = async (entry) => {
  await delay(80);

  if (!entry || !entry.asin) {
    return { ok: false, error: 'Invalid history entry.' };
  }

  const next = [entry, ...loadFromStorage()];
  storage.set(storageKeys.HISTORY, next);

  return { ok: true, entry };
};

export const resetHistory = async () => {
  storage.remove(storageKeys.HISTORY);
  return getHistory();
};
