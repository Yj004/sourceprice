# sourcePrice

Price management dashboard backed by **Google Sheets** (2,200+ SKUs). React UI + small Node API that holds the service-account credentials.

## Stack

- React 19 + Vite 8
- Express API + `googleapis` (Google Sheets)
- react-router-dom, Context API, plain CSS

## Google Sheet

| Tab | Columns |
|-----|---------|
| **Main_Data** | ASIN, source_price_ex_gst, GST, Model_No, Master_Category, Brand |
| **Price_Update** | Date, ASIN, Brand, Model_No, RCM, Old_Price, New_Price |
| **Price_History** | Timestamp, ASIN, Brand, Master_Catagory, Model_No, Old_Price, New_Price |

Sheet ID: `1iA9NuSezDQW3U0He5s9I0IJvJ9rPwUu2w65GiXgb28A`

### One-time setup

1. Copy your service account JSON to `credentials/google-service-account.json` (this path is gitignored).
2. In Google Sheets → **Share**, add the service account email as **Editor**:
   `sourcedb@avaipl29dec.iam.gserviceaccount.com`
3. Copy `.env.example` → `.env` and set `GOOGLE_SHEET_ID` if needed.

## Scripts

```bash
npm install
npm run dev          # API (port 3002) + Vite (5173) together
npm run dev:web      # frontend only
npm run dev:server   # API only
npm run build
npm run lint
```

## How it works

1. **Login** — whitelist in `src/data/allowedUsers.js` (unchanged).
2. **Load** — `GET /api/products` reads `Main_Data`; `GET /api/history` reads `Price_History` (RCM from `Price_Update` when matched).
3. **Edit price** — updates `source_price_ex_gst` in `Main_Data`, appends a row to `Price_Update` and `Price_History`. Product `id` in the UI is the **ASIN**.

## Folder structure

```
server/           → Express + sheetsClient.js (Google Sheets I/O)
src/services/     → productService, historyService → fetch /api/*
src/context/      → Auth + Product state
src/components/   → UI
credentials/      → service account JSON (not committed)
```

## Auth (test accounts)

Edit `src/data/allowedUsers.js` — e.g. `admin@gmail.com` / `admin123`.
