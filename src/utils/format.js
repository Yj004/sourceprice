/**
 * Formatting helpers — small, dependency-free utilities used across
 * the dashboard. Kept in /utils so they stay easy to test in isolation.
 */

const priceFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export const formatPrice = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return priceFormatter.format(n);
};

/**
 * Returns a timestamp in the exact shape stored in priceHistory:
 *   "YYYY-MM-DD HH:MM AM/PM"
 */
export const formatTimestamp = (date = new Date()) => {
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

/**
 * Google Sheets stores datetimes as serial numbers (days since 1899-12-30).
 * Converts that serial back to a local Date.
 */
export const sheetsSerialToDate = (serial) => {
  const n = Number(serial);
  if (!Number.isFinite(n) || n < 30000 || n > 60000) return null;
  const whole = Math.floor(n);
  const fraction = n - whole;
  const ms = (whole - 25569) * 86400000 + Math.round(fraction * 86400000);
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Parses a timestamp produced by `formatTimestamp` back into a Date.
 * Also accepts Google Sheets serial numbers (e.g. "46171.76319").
 * Returns `null` if the value cannot be parsed.
 */
export const parseTimestamp = (str) => {
  const s = String(str ?? '').trim();
  if (!s) return null;

  const m = s.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2}) (AM|PM)$/);
  if (m) {
    const [, y, mo, d, h, mins, ap] = m;
    let hh = Number(h) % 12;
    if (ap === 'PM') hh += 12;
    return new Date(Number(y), Number(mo) - 1, Number(d), hh, Number(mins));
  }

  const serial = sheetsSerialToDate(s);
  if (serial) return serial;

  const sheet = new Date(s);
  return Number.isNaN(sheet.getTime()) ? null : sheet;
};

/** Normalize any stored history timestamp to the display string shape. */
export const normalizeHistoryTimestamp = (raw) => {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2} \d{1,2}:\d{2} (AM|PM)$/.test(s)) return s;
  const d = parseTimestamp(s);
  return d ? formatTimestamp(d) : s;
};

/** True when `timestamp` falls on the same local calendar day as `refDate`. */
export const isSameLocalDay = (timestamp, refDate = new Date()) => {
  const ts = parseTimestamp(timestamp);
  if (!ts) return false;
  return toDateKey(ts) === toDateKey(refDate);
};

/** "YYYY-MM-DD" for the local calendar date of `date`. */
export const toDateKey = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
