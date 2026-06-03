import { randomUUID } from 'crypto';
import nodemailer from 'nodemailer';

/** Strip quotes/whitespace from .env values (common copy-paste mistake). */
const stripEnv = (value) =>
  String(value ?? '')
    .trim()
    .replace(/^['"]|['"]$/g, '');

/** Normalize brand for routing (#N/A, empty → #n/a). */
const normalizeBrand = (brand) => {
  const raw = String(brand ?? '').trim();
  const lower = raw.toLowerCase();
  if (!raw || lower === '#n/a' || lower === 'n/a') return '#n/a';
  return lower;
};

/** Company owners — receive every product update alert. */
const ALWAYS_NOTIFY_EMAILS = [
  'akshit.mittal@avaipl.com',
  'anirudh.bansal@avaipl.com',
  'mukul.bansal@avaipl.com',
];

const dedupeEmails = (emails) => {
  const seen = new Set();
  return emails.filter((email) => {
    const key = String(email).trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Product update alert recipients by brand.
 *
 * - Aromahpure → Parag Suri + owners
 * - #N/A (missing brand) → Rohan Jain + owners
 * - Robustt + all other brands → Abhishek Ojha + Rohan Jain + owners
 */
export const getRecipientsForBrand = (brand) => {
  const norm = normalizeBrand(brand);

  if (norm === 'aromahpure') {
    return {
      emails: dedupeEmails([
        'parag.suri@avaipl.com',
        ...ALWAYS_NOTIFY_EMAILS,
      ]),
      greeting: 'team',
    };
  }

  if (norm === '#n/a') {
    return {
      emails: dedupeEmails([
        'rohan.jain@avaipl.com',
        ...ALWAYS_NOTIFY_EMAILS,
      ]),
      greeting: 'team',
    };
  }

  return {
    emails: dedupeEmails([
      'Abhishek.Ojha@avaipl.com',
      'rohan.jain@avaipl.com',
      ...ALWAYS_NOTIFY_EMAILS,
    ]),
    greeting: 'team',
  };
};

/** Union recipients when a batch spans multiple brands; optionally CC the editor. */
export const getRecipientsForBatch = (items = [], updatedBy = '') => {
  const emails = [];
  for (const item of items) {
    const { emails: brandEmails } = getRecipientsForBrand(item?.brand);
    for (const email of brandEmails) {
      if (!emails.some((e) => e.toLowerCase() === email.toLowerCase())) {
        emails.push(email);
      }
    }
  }

  const editor = stripEnv(updatedBy).toLowerCase();
  if (
    editor.includes('@') &&
    process.env.EMAIL_CC_UPDATER !== 'false' &&
    !emails.some((e) => e.toLowerCase() === editor)
  ) {
    emails.push(editor);
  }

  return { emails: dedupeEmails(emails), greeting: 'team' };
};

const formatMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? '—');
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n);
};

const MONEY_PATTERN =
  /price|cost|warehouse|transport|label|labour|poly|pouch|box|cartoon|manual|other/i;

const formatFieldValue = (value, field) => {
  const n = Number(value);
  if (Number.isFinite(n) && MONEY_PATTERN.test(String(field || ''))) {
    return formatMoney(n);
  }
  if (Number.isFinite(n)) {
    return new Intl.NumberFormat('en-IN').format(n);
  }
  return String(value ?? '—');
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const formatItemLabel = (item) => {
  const model = String(item.modelNo || item.asin || 'Product').trim();
  const pack = String(item.packSize ?? '').trim();
  return pack ? `${model} (Pack ${pack})` : model;
};

const truncateSubjectPart = (value, max = 42) => {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
};

const CTC_KEY = 'categoryTeamCost';

export const hasCtcChange = (changes = []) =>
  changes.some((c) => c?.key === CTC_KEY);

const extractCtcChange = (changes = []) =>
  changes.find((c) => c?.key === CTC_KEY) || null;

const formatSubjectTimestamp = (timestamp) =>
  truncateSubjectPart(timestamp, 28) ||
  new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

/**
 * Subject for a single CTC save — unique per product + ASIN + time
 * so Gmail does not merge separate notifications into one thread.
 */
const buildSingleEmailSubject = (item, timestamp) => {
  const name = truncateSubjectPart(formatItemLabel(item), 38);
  const asin = truncateSubjectPart(item.asin, 14);
  const ctc = item.changes.find((c) => c.key === CTC_KEY);
  const delta = ctc
    ? `${formatMoney(ctc.oldValue)} → ${formatMoney(ctc.newValue)}`
    : 'CTC changed';
  const ts = formatSubjectTimestamp(timestamp);

  return `[SourcePrice] CTC update: ${name} · ${asin} · ${delta} · ${ts}`;
};

/**
 * Subject for bulk CTC save — one email, one Gmail thread is intended.
 */
const buildBulkEmailSubject = (items, timestamp) => {
  const ts = formatSubjectTimestamp(timestamp);
  return `[SourcePrice] Bulk CTC update — ${items.length} product${items.length === 1 ? '' : 's'} · ${ts}`;
};

const buildEmailSubject = (items, timestamp) => {
  if (items.length === 1) {
    return buildSingleEmailSubject(items[0], timestamp);
  }
  return buildBulkEmailSubject(items, timestamp);
};

const buildUniqueMessageId = () => {
  const domain =
    stripEnv(process.env.SMTP_USER).split('@')[1] || 'sourceprice.local';
  return `<sourceprice-${randomUUID()}@${domain}>`;
};

/** Normalize batch item — supports legacy CTC-only { oldValue, newValue } or { changes: [] }. */
const normalizeBatchItem = (item) => {
  if (!item) return null;

  if (Array.isArray(item.changes) && item.changes.length > 0) {
    const isValid = (v) =>
      Number.isFinite(Number(v)) || String(v ?? '').trim() !== '';
    const changes = item.changes.filter(
      (c) => c && isValid(c.oldValue) && isValid(c.newValue),
    );
    if (!changes.length) return null;
    return { ...item, changes };
  }

  if (
    Number.isFinite(Number(item.oldValue)) &&
    Number.isFinite(Number(item.newValue))
  ) {
    return {
      ...item,
      changes: [
        {
          key: 'categoryTeamCost',
          label: 'CATAGORY TEAM COST',
          oldValue: item.oldValue,
          newValue: item.newValue,
        },
      ],
    };
  }

  return null;
};

const getTransporter = () => {
  const host = stripEnv(process.env.SMTP_HOST);
  const user = stripEnv(process.env.SMTP_USER);
  const pass = stripEnv(process.env.SMTP_PASS);

  if (!host || !user || !pass) {
    return null;
  }

  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    requireTLS: !secure,
    tls: {
      minVersion: 'TLSv1.2',
    },
  });
};

const getMailFrom = () => {
  const smtpUser = stripEnv(process.env.SMTP_USER);
  const displayFrom = stripEnv(process.env.EMAIL_FROM);
  return {
    from: `"SourcePrice" <${smtpUser}>`,
    replyTo: displayFrom && displayFrom.includes('@') ? displayFrom : smtpUser,
  };
};

/** Log-friendly status for server startup (never logs the password). */
export const getEmailConfigStatus = () => {
  const host = stripEnv(process.env.SMTP_HOST);
  const user = stripEnv(process.env.SMTP_USER);
  const pass = stripEnv(process.env.SMTP_PASS);
  const enabled = process.env.EMAIL_ENABLED !== 'false';

  if (!enabled) {
    return { ready: false, reason: 'EMAIL_ENABLED=false' };
  }
  if (!host || !user || !pass) {
    return {
      ready: false,
      reason: 'Missing SMTP_HOST, SMTP_USER, or SMTP_PASS in .env',
    };
  }

  return {
    ready: true,
    host,
    user,
    routing:
      'CTC changes only on save · single trigger · batch on multi-edit · CC editor',
  };
};

export const verifyEmailConnection = async () => {
  const transporter = getTransporter();
  if (!transporter) {
    return { ok: false, error: 'SMTP not configured' };
  }
  try {
    await transporter.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || 'SMTP verify failed' };
  }
};

const buildBatchEmailHtml = ({ items, updatedBy, timestamp, greeting }) => {
  const rows = items
    .map((item) => {
      const ctc = item.changes.find((c) => c.key === CTC_KEY);
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#334155;">
            ${escapeHtml(formatItemLabel(item))}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;font-weight:700;color:#4338ca;font-variant-numeric:tabular-nums;">
            ${escapeHtml(formatMoney(ctc?.oldValue))}
            <span style="color:#94a3b8;font-weight:500;"> → </span>
            ${escapeHtml(formatMoney(ctc?.newValue))}
          </td>
        </tr>`;
    })
    .join('');

  return `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;">
    <div style="max-width:560px;margin:24px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <div style="padding:20px 24px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;">
        <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;opacity:0.9;">
          SourcePrice Alert
        </div>
        <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;">
          Category Team Cost Updated
        </h1>
      </div>

      <div style="padding:24px;">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">
          Hi ${escapeHtml(greeting)},
        </p>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#475569;">
          <strong>CATAGORY TEAM COST</strong> was updated for
          ${items.length === 1 ? 'this product' : `${items.length} products`}.
        </p>

        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;">Product</th>
              <th style="padding:8px 12px;text-align:right;font-size:11px;color:#64748b;">CATAGORY TEAM COST</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <p style="margin:16px 0 0;font-size:12px;color:#64748b;">
          Updated by ${escapeHtml(updatedBy)} · ${escapeHtml(timestamp)}
        </p>
      </div>
    </div>
  </body>
</html>`;
};

const buildBatchEmailText = ({ items, updatedBy, timestamp, greeting }) => {
  const lines = [
    `Hi ${greeting},`,
    '',
    'CATAGORY TEAM COST updates:',
    '',
    ...items.map((item) => {
      const ctc = item.changes.find((c) => c.key === CTC_KEY);
      return `- ${formatItemLabel(item)}: ${formatMoney(ctc?.oldValue)} -> ${formatMoney(ctc?.newValue)}`;
    }),
    '',
    `Updated by: ${updatedBy}`,
    `Time: ${timestamp}`,
  ];
  return lines.join('\n');
};

/** Keep only Category Team Cost on each batch item. */
const toCtcOnlyItem = (item) => {
  const normalized = normalizeBatchItem(item);
  if (!normalized) return null;
  const ctcChanges = normalized.changes.filter((c) => c.key === CTC_KEY);
  if (!ctcChanges.length) return null;
  return { ...normalized, changes: ctcChanges };
};

const buildCtcItemsFromSave = ({ product, changes }) => {
  const ctc = extractCtcChange(changes);
  if (!ctc || !product) return [];
  return [
    {
      asin: product.asin,
      brand: product.brand,
      modelNo: product.modelNo,
      packSize: product.packSize,
      changes: [ctc],
    },
  ];
};

/**
 * Internal send — items must already be CTC-only (use sendCtcAlertIfNeeded).
 */
const sendCtcEmail = async ({
  items = [],
  updatedBy = 'unknown',
  timestamp = '',
}) => {
  if (process.env.EMAIL_ENABLED === 'false') {
    return { ok: false, skipped: true, reason: 'disabled' };
  }

  const clean = items.map(normalizeBatchItem).filter(Boolean);

  if (!clean.length) {
    return { ok: false, skipped: true, reason: 'no_items' };
  }

  const { emails, greeting } = getRecipientsForBatch(clean, updatedBy);
  if (!emails.length) {
    return { ok: false, skipped: true, reason: 'no_recipients' };
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.warn(
      '[email] SMTP not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS in .env',
    );
    return { ok: false, skipped: true, reason: 'smtp_not_configured' };
  }

  const subject = buildEmailSubject(clean, timestamp);
  const isBulk = clean.length > 1;

  const { from, replyTo } = getMailFrom();
  const payload = { items: clean, updatedBy, timestamp, greeting };

  try {
    await transporter.sendMail({
      from,
      replyTo,
      to: emails.join(', '),
      subject,
      messageId: buildUniqueMessageId(),
      headers: {
        'X-SourcePrice-Notification': isBulk ? 'bulk' : 'single',
        'X-SourcePrice-Product-Count': String(clean.length),
      },
      text: buildBatchEmailText(payload),
      html: buildBatchEmailHtml(payload),
    });

    const totalChanges = clean.reduce((n, i) => n + i.changes.length, 0);
    console.log(
      `[email] Alert sent (${isBulk ? 'bulk' : 'single'}) subject="${subject}" → ${emails.join(', ')} (${clean.length} product${clean.length === 1 ? '' : 's'}, ${totalChanges} change${totalChanges === 1 ? '' : 's'})`,
    );
    return {
      ok: true,
      to: emails,
      count: clean.length,
      fieldChanges: totalChanges,
      subject,
    };
  } catch (err) {
    console.error('[email] Failed to send alert:', err);
    return { ok: false, error: err.message || 'Email send failed.' };
  }
};

/**
 * Single trigger point for all CTC email alerts.
 *
 * Call after a successful save. Sends email only when Category Team Cost
 * actually changed. Use suppressEmail during bulk edit steps; flush once
 * at the end with items[].
 */
export const sendCtcAlertIfNeeded = async ({
  product,
  changes = [],
  items = null,
  updatedBy = 'unknown',
  timestamp = '',
  suppressEmail = false,
}) => {
  if (suppressEmail) {
    return { ok: false, skipped: true, reason: 'suppressed' };
  }

  const rawItems = Array.isArray(items) && items.length > 0
    ? items
    : buildCtcItemsFromSave({ product, changes });

  const clean = rawItems.map(toCtcOnlyItem).filter(Boolean);

  if (!clean.length) {
    return { ok: false, skipped: true, reason: 'category_team_cost_unchanged' };
  }

  return sendCtcEmail({
    items: clean,
    updatedBy,
    timestamp: timestamp || new Date().toLocaleString('en-IN'),
  });
};

/** Batch endpoint + client bulk flush — CTC items only. */
export const notifyCategoryTeamCostBatch = async (payload) =>
  sendCtcAlertIfNeeded({
    items: payload?.items,
    updatedBy: payload?.updatedBy,
    timestamp: payload?.timestamp,
  });

/** @deprecated — use sendCtcAlertIfNeeded */
export const notifyProductChanges = (args) => sendCtcAlertIfNeeded(args);
export const notifyCategoryTeamCostChange = (args) => sendCtcAlertIfNeeded(args);
export const notifyProductChangesBatch = (payload) =>
  sendCtcAlertIfNeeded({
    items: payload?.items,
    updatedBy: payload?.updatedBy,
    timestamp: payload?.timestamp,
  });
