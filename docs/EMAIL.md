# SourcePrice — Email alerts (Gmail / SMTP)

This document explains **when** emails are sent, **who** receives them, and **how** the code triggers a message. Emails use **nodemailer** over SMTP (Gmail / Google Workspace in your setup).

---

## 1. What triggers an email?

**Only one rule:** an email is sent when **Category Team Cost (CTC)** actually changes and the user clicks **Save changes** in the Edit popup.

| Action | Email sent? |
|--------|-------------|
| Change **CATAGORY TEAM COST** and save | **Yes** |
| Change source price, warehouse, transport, etc. (CTC unchanged) | **No** |
| Open Edit and save with **no** field changes | **No** (save blocked in UI) |
| Save same CTC value as before | **No** (server: “No changes to save”) |

Other fields are still saved to Google Sheets and history; they simply **do not** trigger Gmail.

---

## 2. Single trigger in code

All CTC emails go through **one function** on the server:

```
server/emailService.js → sendCtcAlertIfNeeded(...)
```

Nothing else in the app should call nodemailer directly.

### When it runs

| Flow | How trigger is called |
|------|------------------------|
| **Single product edit** | After `PATCH /api/products/:asin` succeeds → `sendCtcAlertIfNeeded({ product, changes, suppressEmail: false })` |
| **Bulk edit (2+ products)** | Each save uses `suppressEmail: true` on the API. Only products where CTC changed are queued. When bulk finishes → **one** call to `POST /api/notifications/category-team-cost` → `sendCtcAlertIfNeeded({ items })` |
| **Manual test** | `npm run test:email` |

### When it does **not** send

`sendCtcAlertIfNeeded` returns `{ skipped: true, reason: '...' }` if:

- `category_team_cost_unchanged` — CTC not in the change list  
- `suppressed` — bulk step (`suppressEmail: true`)  
- `disabled` — `EMAIL_ENABLED=false`  
- `smtp_not_configured` — missing `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS`  

The API still returns `{ ok: true }` for the save; `email` on the response describes what happened.

---

## 3. End-to-end flow (single edit)

```
User edits CTC in EditProductModal
        ↓
Clicks "Save changes"
        ↓
DashboardPage → saveProductEdit() → PATCH /api/products/:asin
        ↓
server/sheetsClient.js → updateProduct()
  - Compares old vs new values
  - Writes Main_Data + Price_History
  - Returns changes[] (only fields that changed)
        ↓
server/app.js
  - await sendCtcAlertIfNeeded({ product, changes, suppressEmail })
        ↓
sendCtcAlertIfNeeded
  - If changes include key "categoryTeamCost" → build 1-item batch
  - Else → skip (no email)
        ↓
sendCtcEmail → nodemailer → Gmail SMTP
        ↓
Response JSON includes email: { ok, skipped, reason, subject, to, ... }
        ↓
ProductContext shows toast:
  - "CTC email alert sent to the team" (ok)
  - "Saved, but CTC email failed: …" (error)
```

Email is **awaited** on the server before the HTTP response finishes, so a failed SMTP login surfaces in the UI instead of failing silently in the background.

---

## 4. Bulk edit flow

```
User selects multiple products → Edit selected
        ↓
For each product: Save with suppressEmail: true
  - Sheet updates immediately per product
  - If CTC changed → push { asin, brand, oldValue, newValue } to bulkCtcPendingRef
        ↓
After last product (or Close / clear selection):
  flushBulkCtcEmail() → POST /api/notifications/category-team-cost
        ↓
sendCtcAlertIfNeeded({ items }) → **one** Gmail with all CTC rows
```

If **no** product had a CTC change in that bulk session, the queue is empty and **no** email is sent.

---

## 5. Who receives the email?

Recipients depend on **brand** (from the product row). These addresses are always included on every CTC alert:

- akshit.mittal@avaipl.com  
- anirudh.bansal@avaipl.com  
- mukul.bansal@avaipl.com  

| Brand | Additional recipients |
|-------|------------------------|
| **Aromahpure** | parag.suri@avaipl.com |
| **#N/A** (missing brand) | rohan.jain@avaipl.com |
| **Robustt** and all others | Abhishek.Ojha@avaipl.com, rohan.jain@avaipl.com |

**CC the person who saved:** by default the logged-in user’s email is added to the `To` list (`EMAIL_CC_UPDATER` is not set to `false`).

Alerts go to the **team inbox**, not only the person editing. Check spam for `[SourcePrice]` if you do not see messages.

---

## 6. Email format

### Body (HTML + plain text)

- Title: **Category Team Cost Updated**  
- Table: product name → old CTC → new CTC (INR)  
- Footer: updated by + timestamp  

Only CTC appears in the body (not source price or other fields).

### Subject line (Gmail threading)

Gmail groups messages with the same subject into one conversation. Subjects are built to avoid that for **single** saves:

**Single product example:**

```
[SourcePrice] CTC update: GLASS_CLEAN_TABLETS · B0DWFS9GH9 · ₹0.00 → ₹995.00 · 3 Jun 2026, 3:12:02 pm
```

**Bulk (one email for many products):**

```
[SourcePrice] Bulk CTC update — 9 products · 3 Jun 2026, 3:15:00 pm
```

Each send also gets a unique `Message-ID` header to reduce accidental threading.

---

## 7. Environment variables (`.env`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `EMAIL_ENABLED` | Yes | `true` to send; `false` disables all alerts |
| `SMTP_HOST` | Yes | e.g. `smtp.gmail.com` |
| `SMTP_PORT` | Yes | Usually `587` |
| `SMTP_SECURE` | Yes | `false` for STARTTLS on 587 |
| `SMTP_USER` | Yes | Login account (e.g. `devendra.singh@avaipl.com`) |
| `SMTP_PASS` | Yes | App password (no quotes needed) |
| `EMAIL_FROM` | Optional | Reply-To address (sender uses `SMTP_USER`) |
| `EMAIL_CC_UPDATER` | Optional | Set `false` to stop CC’ing the user who saved |

On **Vercel**, set the same variables in Project → Environment Variables. Use `GOOGLE_SERVICE_ACCOUNT_JSON` for Sheets; SMTP vars for email.

---

## 8. Testing and health checks

### Test SMTP + send a sample CTC mail

```bash
npm run test:email
npm run test:email Aromahpure
```

### API health (includes SMTP status)

```bash
GET /api/health
```

Response includes `email.configured` and `email.verified` when SMTP is set up.

### Server logs on startup

```
[email] SMTP configured → user@avaipl.com via smtp.gmail.com · CTC changes only ...
[email] SMTP connection verified OK
```

On each send:

```
[email] Alert sent (single) subject="[SourcePrice] CTC update: ..." → recipient@...
```

---

## 9. Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Save works, no email, no error toast | CTC value did not change (only other fields changed) |
| Toast: “CTC email failed” | Wrong SMTP password, Gmail blocked sign-in, or firewall |
| Toast: “SMTP not configured” | Missing env vars or API started without `.env` |
| Email in spam | Normal for automated mail; search `[SourcePrice]` |
| Many edits in one Gmail thread | Old behavior; subjects now include product + time per single save |
| Bulk: one email expected, got none | No product in that bulk session had a CTC change |

---

## 10. File reference

| File | Role |
|------|------|
| `server/emailService.js` | SMTP, recipients, `sendCtcAlertIfNeeded`, templates |
| `server/app.js` | Calls trigger after `PATCH` and batch `POST` |
| `server/sheetsClient.js` | Builds `changes[]` with `key: 'categoryTeamCost'` when CTC differs |
| `src/pages/DashboardPage.jsx` | Bulk queue + `flushBulkCtcEmail` |
| `src/context/ProductContext.jsx` | Toasts from `result.email` |
| `src/services/apiClient.js` | `notifyCategoryTeamCostBatch` → batch endpoint |
| `server/scripts/testEmail.js` | Manual SMTP test |

---

## 11. Summary

- **Gmail is only for CTC changes** after Save.  
- **One server function** (`sendCtcAlertIfNeeded`) decides and sends.  
- **Single edit** → one email per CTC save (unique subject).  
- **Bulk edit** → one combined email if any CTC changed.  
- **You** are CC’d on sends by default; the main recipients are the brand routing list above.
