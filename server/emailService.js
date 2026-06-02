import nodemailer from 'nodemailer';

/** Normalize brand for routing (#N/A, empty → #n/a). */
const normalizeBrand = (brand) => {
  const raw = String(brand ?? '').trim();
  const lower = raw.toLowerCase();
  if (!raw || lower === '#n/a' || lower === 'n/a') return '#n/a';
  return lower;
};

/** Company owners — receive every Category Team Cost alert. */
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
 * Category Team Cost alert recipients by brand.
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

/** Union recipients when a batch spans multiple brands. */
export const getRecipientsForBatch = (items = []) => {
  const emails = [];
  for (const item of items) {
    const { emails: brandEmails } = getRecipientsForBrand(item?.brand);
    for (const email of brandEmails) {
      if (!emails.some((e) => e.toLowerCase() === email.toLowerCase())) {
        emails.push(email);
      }
    }
  }
  return { emails, greeting: 'team' };
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

const getTransporter = () => {
  const host = String(process.env.SMTP_HOST || '').trim();
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').trim();

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

/** Log-friendly status for server startup (never logs the password). */
export const getEmailConfigStatus = () => {
  const host = String(process.env.SMTP_HOST || '').trim();
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').trim();
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
      'CTC only · batch on multi-edit · Akshit+Anirudh+Mukul always · brand routing',
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
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#334155;">
            ${escapeHtml(formatItemLabel(item))}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;font-weight:700;color:#4338ca;font-variant-numeric:tabular-nums;">
            ${escapeHtml(formatMoney(item.oldValue))}
            <span style="color:#94a3b8;font-weight:500;"> → </span>
            ${escapeHtml(formatMoney(item.newValue))}
          </td>
        </tr>`,
    )
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
    ...items.map(
      (item) =>
        `- ${formatItemLabel(item)}: ${formatMoney(item.oldValue)} -> ${formatMoney(item.newValue)}`,
    ),
    '',
    `Updated by: ${updatedBy}`,
    `Time: ${timestamp}`,
  ];
  return lines.join('\n');
};

/**
 * Send one email with only Category Team Cost changes (single or batch).
 */
export const notifyCategoryTeamCostBatch = async ({
  items = [],
  updatedBy = 'unknown',
  timestamp = '',
}) => {
  if (process.env.EMAIL_ENABLED === 'false') {
    return { ok: false, skipped: true, reason: 'disabled' };
  }

  const clean = items.filter(
    (item) =>
      item &&
      Number.isFinite(Number(item.oldValue)) &&
      Number.isFinite(Number(item.newValue)),
  );

  if (!clean.length) {
    return { ok: false, skipped: true, reason: 'no_items' };
  }

  const { emails, greeting } = getRecipientsForBatch(clean);
  if (!emails.length) {
    return { ok: false, skipped: true, reason: 'no_recipients' };
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.warn(
      '[email] SMTP not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS in .env to send alerts.',
    );
    return { ok: false, skipped: true, reason: 'smtp_not_configured' };
  }

  const from =
    process.env.EMAIL_FROM || process.env.SMTP_USER || 'sourceprice@avaipl.com';
  const countLabel = clean.length === 1 ? '1 product' : `${clean.length} products`;
  const subject = `[SourcePrice] Category Team Cost updated — ${countLabel}`;

  const payload = { items: clean, updatedBy, timestamp, greeting };

  try {
    await transporter.sendMail({
      from,
      to: emails.join(', '),
      subject,
      text: buildBatchEmailText(payload),
      html: buildBatchEmailHtml(payload),
    });

    console.log(
      `[email] Category Team Cost alert sent to ${emails.join(', ')} (${clean.length} product${clean.length === 1 ? '' : 's'})`,
    );
    return { ok: true, to: emails, count: clean.length };
  } catch (err) {
    console.error('[email] Failed to send Category Team Cost alert:', err);
    return { ok: false, error: err.message || 'Email send failed.' };
  }
};

/** Single-product save — delegates to batch helper. */
export const notifyCategoryTeamCostChange = async ({
  product,
  changes = [],
  updatedBy,
  timestamp,
}) => {
  const ctc = changes.find((c) => c.key === 'categoryTeamCost');
  if (!ctc) {
    return { ok: false, skipped: true, reason: 'category_team_cost_unchanged' };
  }

  return notifyCategoryTeamCostBatch({
    items: [
      {
        asin: product?.asin,
        brand: product?.brand,
        modelNo: product?.modelNo,
        packSize: product?.packSize,
        oldValue: ctc.oldValue,
        newValue: ctc.newValue,
      },
    ],
    updatedBy,
    timestamp,
  });
};
