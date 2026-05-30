/**
 * historyService — Google Sheets via backend API
 *
 * History rows are written by the server when a price is updated.
 * addHistoryRecord is a no-op kept for ProductContext compatibility.
 */

import api from './apiClient.js';

export const getHistory = async () => api.getHistory();

export const addHistoryRecord = async (entry) => {
  if (!entry) return { ok: false, error: 'Invalid history entry.' };
  return { ok: true, entry };
};
