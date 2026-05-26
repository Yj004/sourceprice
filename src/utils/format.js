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
 * Parses a timestamp produced by `formatTimestamp` back into a Date.
 * Returns `null` if the string does not match the expected shape.
 */
export const parseTimestamp = (str) => {
  const m = String(str || '').match(
    /^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2}) (AM|PM)$/,
  );
  if (!m) return null;
  const [, y, mo, d, h, mins, ap] = m;
  let hh = Number(h) % 12;
  if (ap === 'PM') hh += 12;
  return new Date(Number(y), Number(mo) - 1, Number(d), hh, Number(mins));
};

/** "YYYY-MM-DD" for the local calendar date of `date`. */
export const toDateKey = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
