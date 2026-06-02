/**
 * One-time / manual: ensure Price_History has the correct header row.
 * Run: npm run setup:history
 */
import 'dotenv/config';
import { ensureHistorySheetReady, HISTORY_HEADERS } from '../sheetsClient.js';

await ensureHistorySheetReady();
console.log('Price_History ready. Header columns:');
HISTORY_HEADERS.forEach((h, i) => {
  console.log(`  ${String.fromCharCode(65 + i)}: ${h}`);
});
