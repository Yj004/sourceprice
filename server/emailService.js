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
      greeting: 'Parag, Akshit, Anirudh, and Mukul',
    };
  }

  if (norm === '#n/a') {
    return {
      emails: dedupeEmails([
        'rohan.jain@avaipl.com',
        ...ALWAYS_NOTIFY_EMAILS,
      ]),
      greeting: 'Rohan, Akshit, Anirudh, and Mukul',
    };
  }

  return {
    emails: dedupeEmails([
      'Abhishek.Ojha@avaipl.com',
      'rohan.jain@avaipl.com',
      ...ALWAYS_NOTIFY_EMAILS,
    ]),
    greeting: 'Abhishek, Rohan, Akshit, Anirudh, and Mukul',
  };
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
      'Every CTC change → Akshit + Anirudh + Mukul · Aromahpure→Parag · #N/A→Rohan · Others→Abhishek+Rohan',
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

const buildEmailHtml = ({
  product,
  changes,
  updatedBy,
  timestamp,
  totalChanged,
  oldTotalCost,
  newTotalCost,
  greeting,
}) => {
  const ctcChange = changes.find((c) => c.key === 'categoryTeamCost');
  const otherChanges = changes.filter((c) => c.key !== 'categoryTeamCost');

  const changeRows = [
    ...changes.map(
      (c) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">
            ${escapeHtml(c.label)}
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">
            ${escapeHtml(formatMoney(c.oldValue))}
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">→</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;color:#4338ca;">
            ${escapeHtml(formatMoney(c.newValue))}
          </td>
        </tr>`,
    ),
    ...(totalChanged
      ? [
          `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">
            Total Cost (auto)
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">
            ${escapeHtml(formatMoney(oldTotalCost))}
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">→</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;color:#4338ca;">
            ${escapeHtml(formatMoney(newTotalCost))}
          </td>
        </tr>`,
        ]
      : []),
  ].join('');

  return `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;">
    <div style="max-width:640px;margin:24px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
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
        <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569;">
          A <strong>${escapeHtml(product.brand || '#N/A')}</strong> product had its
          <strong>Category Team Cost</strong> updated. Full change details are below.
        </p>

        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="padding:10px 12px;font-size:12px;color:#64748b;width:140px;">ASIN</td>
            <td style="padding:10px 12px;font-size:13px;font-weight:700;font-family:Consolas,monospace;">
              ${escapeHtml(product.asin)}
            </td>
          </tr>
          <tr>
            <td style="padding:10px 12px;font-size:12px;color:#64748b;">Brand</td>
            <td style="padding:10px 12px;font-size:13px;font-weight:600;">${escapeHtml(product.brand || '#N/A')}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;font-size:12px;color:#64748b;">Model No</td>
            <td style="padding:10px 12px;font-size:13px;font-weight:600;font-family:Consolas,monospace;">
              ${escapeHtml(product.modelNo)}
            </td>
          </tr>
          <tr>
            <td style="padding:10px 12px;font-size:12px;color:#64748b;">PLC</td>
            <td style="padding:10px 12px;font-size:13px;">${escapeHtml(product.plc || '—')}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;font-size:12px;color:#64748b;">Pack size</td>
            <td style="padding:10px 12px;font-size:13px;">${escapeHtml(product.packSize || '—')}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;font-size:12px;color:#64748b;">Updated by</td>
            <td style="padding:10px 12px;font-size:13px;">${escapeHtml(updatedBy)}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;font-size:12px;color:#64748b;">Timestamp</td>
            <td style="padding:10px 12px;font-size:13px;">${escapeHtml(timestamp)}</td>
          </tr>
        </table>

        ${
          ctcChange
            ? `<div style="margin-bottom:16px;padding:12px 14px;border-radius:10px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);">
          <div style="font-size:12px;font-weight:700;color:#4338ca;text-transform:uppercase;letter-spacing:0.05em;">
            Category Team Cost
          </div>
          <div style="margin-top:6px;font-size:18px;font-weight:700;">
            ${escapeHtml(formatMoney(ctcChange.oldValue))}
            <span style="color:#94a3b8;font-weight:500;"> → </span>
            ${escapeHtml(formatMoney(ctcChange.newValue))}
          </div>
        </div>`
            : ''
        }

        <h2 style="margin:0 0 10px;font-size:14px;color:#334155;">
          All changes in this save
        </h2>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;">Field</th>
              <th style="padding:8px 12px;text-align:right;font-size:11px;color:#64748b;">Old</th>
              <th style="padding:8px 12px;text-align:center;font-size:11px;color:#64748b;"></th>
              <th style="padding:8px 12px;text-align:right;font-size:11px;color:#64748b;">New</th>
            </tr>
          </thead>
          <tbody>
            ${changeRows || `<tr><td colspan="4" style="padding:12px;color:#64748b;">No field changes recorded.</td></tr>`}
          </tbody>
        </table>

        ${
          otherChanges.length > 0
            ? `<p style="margin:16px 0 0;font-size:12px;color:#64748b;">
          Other fields updated along with Category Team Cost:
          ${escapeHtml(otherChanges.map((c) => c.label).join(', '))}.
        </p>`
            : ''
        }
      </div>
    </div>
  </body>
</html>`;
};

const buildEmailText = ({
  product,
  changes,
  updatedBy,
  timestamp,
  totalChanged,
  oldTotalCost,
  newTotalCost,
  greeting,
}) => {
  const lines = [
    `Hi ${greeting},`,
    '',
    `Category Team Cost was updated for a ${product.brand || '#N/A'} product.`,
    '',
    `ASIN: ${product.asin}`,
    `Brand: ${product.brand || '#N/A'}`,
    `Model No: ${product.modelNo}`,
    `PLC: ${product.plc || '—'}`,
    `Pack size: ${product.packSize || '—'}`,
    `Updated by: ${updatedBy}`,
    `Timestamp: ${timestamp}`,
    '',
    'Changes:',
    ...changes.map(
      (c) => `- ${c.label}: ${formatMoney(c.oldValue)} -> ${formatMoney(c.newValue)}`,
    ),
  ];

  if (totalChanged) {
    lines.push(
      `- Total Cost (auto): ${formatMoney(oldTotalCost)} -> ${formatMoney(newTotalCost)}`,
    );
  }

  return lines.join('\n');
};

/**
 * Send alert when Category Team Cost changes. Recipients depend on brand.
 */
export const notifyCategoryTeamCostChange = async ({
  product,
  changes = [],
  updatedBy,
  timestamp,
  totalChanged = false,
  oldTotalCost,
  newTotalCost,
}) => {
  if (process.env.EMAIL_ENABLED === 'false') {
    return { ok: false, skipped: true, reason: 'disabled' };
  }

  const ctcChanged = changes.some((c) => c.key === 'categoryTeamCost');
  if (!ctcChanged) {
    return { ok: false, skipped: true, reason: 'category_team_cost_unchanged' };
  }

  const { emails, greeting } = getRecipientsForBrand(product?.brand);
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
  const subject = `[SourcePrice] Category Team Cost updated — ${product.modelNo || product.asin} (${product.asin})`;

  const payload = {
    product,
    changes,
    updatedBy,
    timestamp,
    totalChanged,
    oldTotalCost,
    newTotalCost,
    greeting,
  };

  try {
    await transporter.sendMail({
      from,
      to: emails.join(', '),
      subject,
      text: buildEmailText(payload),
      html: buildEmailHtml(payload),
    });

    console.log(
      `[email] Category Team Cost alert sent to ${emails.join(', ')} for ${product.asin} (${product.brand || '#N/A'})`,
    );
    return { ok: true, to: emails };
  } catch (err) {
    console.error('[email] Failed to send Category Team Cost alert:', err);
    return { ok: false, error: err.message || 'Email send failed.' };
  }
};
