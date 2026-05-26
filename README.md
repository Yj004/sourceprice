# sourcePrice

Minimal, production-ready React + Vite scaffold for a price-tracking dashboard. Built so that swapping the dummy data layer for **Google Sheets** later is a one-file change.

## Stack

- React 19 + Vite 8
- react-router-dom (BrowserRouter + protected routes)
- Context API for auth state
- Plain CSS (custom properties for theming, mobile-first responsive)

## Folder structure

```
src/
├─ components/      → reusable UI primitives (Button, Input, Card, Navbar,
│                     ProtectedRoute, FiltersBar, ProductTable, HistoryPanel)
├─ pages/           → route-level screens (LoginPage, DashboardPage, NotFoundPage)
├─ context/         → AuthContext + useAuth hook (auth state, whitelist guard)
├─ services/        → I/O layer: authService + sheetsService (Google Sheets stub)
├─ data/            → local seed data (allowedUsers, products, history)
├─ App.jsx          → route tree (public + protected)
└─ main.jsx         → entry point
```

## Auth flow

1. `LoginPage` collects a Gmail address.
2. `authService.validateEmail` checks the format and looks it up in `data/allowedUsers.js`.
3. On success, `AuthContext` stores the user in state + `localStorage`.
4. `ProtectedRoute` blocks `/dashboard` unless `isAuthenticated === true`.

Allowed test accounts (edit `src/data/allowedUsers.js`):

- `admin@gmail.com`
- `demo@gmail.com`
- `owner@gmail.com`
- `team@gmail.com`

## Google Sheets integration points

All future remote calls funnel through **`src/services/sheetsService.js`**. The four exported functions already match the data shapes the UI consumes:

| Function              | Current source                  | Replace with                                  |
| --------------------- | ------------------------------- | --------------------------------------------- |
| `fetchAllowedUsers()` | `data/allowedUsers.js`          | `Users` tab of the Google Sheet               |
| `fetchProducts()`     | `data/products.js`              | `Products` tab                                |
| `fetchHistory()`      | `data/history.js`               | `History` tab                                 |
| `appendHistory(e)`    | no-op                           | append row to `History` tab                   |

Recommended path: deploy a small serverless proxy (Vercel / Cloudflare Workers) that holds the Sheets API key and exposes `/sheets/...` endpoints. Then change only `sheetsService.js`.

## Scripts

```bash
npm run dev      # start dev server
npm run build    # production build
npm run lint     # eslint
npm run preview  # preview production build
```
