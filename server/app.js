import cors from 'cors';
import express from 'express';
import { requireAuth, requireSuperAdmin, signToken } from './auth.js';
import {
  ensureHistorySheetReady,
  fetchHistory,
  fetchProducts,
  updateProduct,
  updateProductPrice,
} from './sheetsClient.js';
import {
  getEmailConfigStatus,
  sendCtcAlertIfNeeded,
  verifyEmailConnection,
} from './emailService.js';
import {
  createUser,
  deleteUser,
  ensureUsersReady,
  listUsers,
  loginUser,
} from './usersService.js';

const getCorsOrigins = () => {
  const list = (process.env.BACKEND_CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const key of ['VERCEL_URL', 'VERCEL_BRANCH_URL']) {
    const host = process.env[key];
    if (host) list.push(`https://${host}`);
  }

  return [...new Set(list)];
};

export const createApp = () => {
  const app = express();
  app.use(cors({ origin: getCorsOrigins() }));
  app.use(express.json());

  app.get('/api/health', async (_req, res) => {
    try {
      await ensureUsersReady();
      const email = getEmailConfigStatus();
      let smtp = { configured: email.ready };
      if (email.ready) {
        const verified = await verifyEmailConnection();
        smtp = { ...smtp, verified: verified.ok, error: verified.error };
      } else {
        smtp = { ...smtp, reason: email.reason };
      }
      res.json({ ok: true, sheet: Boolean(process.env.GOOGLE_SHEET_ID), email: smtp });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body || {};
      const result = await loginUser(email, password);
      if (!result.ok) {
        res.status(401).json(result);
        return;
      }

      const token = signToken(result.user);
      res.json({
        ok: true,
        token,
        user: {
          email: result.user.email,
          role: result.user.role,
          loggedInAt: new Date().toISOString(),
        },
      });
    } catch (e) {
      console.error('POST /api/auth/login', e);
      res.status(500).json({ ok: false, error: e.message || 'Login failed.' });
    }
  });

  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ ok: true, user: req.user });
  });

  app.get('/api/users', requireAuth, requireSuperAdmin, async (_req, res) => {
    try {
      const users = await listUsers();
      res.json(users);
    } catch (e) {
      console.error('GET /api/users', e);
      res.status(500).json({ error: e.message || 'Failed to load users.' });
    }
  });

  app.post('/api/users', requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { email, password } = req.body || {};
      const result = await createUser({
        email,
        password,
        createdBy: req.user.email,
      });
      if (!result.ok) {
        res.status(400).json(result);
        return;
      }
      res.status(201).json(result);
    } catch (e) {
      console.error('POST /api/users', e);
      res.status(500).json({ ok: false, error: e.message || 'Failed to create user.' });
    }
  });

  app.delete(
    '/api/users/:email',
    requireAuth,
    requireSuperAdmin,
    async (req, res) => {
      try {
        const email = decodeURIComponent(req.params.email || '');
        const result = await deleteUser({
          email,
          actorEmail: req.user.email,
        });
        if (!result.ok) {
          res.status(400).json(result);
          return;
        }
        res.json(result);
      } catch (e) {
        console.error('DELETE /api/users/:email', e);
        res.status(500).json({ ok: false, error: e.message || 'Failed to remove user.' });
      }
    },
  );

  app.get('/api/products', requireAuth, async (_req, res) => {
    try {
      const products = await fetchProducts();
      res.json(products);
    } catch (e) {
      console.error('GET /api/products', e);
      res.status(500).json({ error: e.message || 'Failed to load products.' });
    }
  });

  app.get('/api/history', requireAuth, async (_req, res) => {
    try {
      const history = await fetchHistory();
      res.json(history);
    } catch (e) {
      console.error('GET /api/history', e);
      res.status(500).json({ error: e.message || 'Failed to load history.' });
    }
  });

  app.patch('/api/products/:asin/price', requireAuth, async (req, res) => {
    try {
      const { asin } = req.params;
      const { newPrice, updatedBy } = req.body || {};
      const result = await updateProductPrice({
        asin,
        newPrice,
        updatedBy: updatedBy || req.user.email,
      });
      if (!result.ok) {
        res.status(400).json(result);
        return;
      }

      res.json({
        ...result,
        email: { ok: false, skipped: true, reason: 'category_team_cost_unchanged' },
      });
    } catch (e) {
      console.error('PATCH /api/products/:asin/price', e);
      res.status(500).json({ ok: false, error: e.message || 'Update failed.' });
    }
  });

  app.patch('/api/products/:asin', requireAuth, async (req, res) => {
    try {
      const { asin } = req.params;
      const { updates, updatedBy, suppressEmail } = req.body || {};
      if (!updates || typeof updates !== 'object') {
        res.status(400).json({ ok: false, error: 'No updates provided.' });
        return;
      }
      const result = await updateProduct({
        asin,
        updates,
        updatedBy: updatedBy || req.user.email,
      });
      if (!result.ok) {
        res.status(400).json(result);
        return;
      }

      let emailResult = { ok: false, skipped: true, reason: 'category_team_cost_unchanged' };
      try {
        emailResult = await sendCtcAlertIfNeeded({
          product: result.product,
          changes: (result.changes || []).map((c) => ({ ...c })),
          updatedBy: result.updatedBy,
          timestamp: result.timestamp,
          suppressEmail: Boolean(suppressEmail),
        });
        if (!emailResult.ok && !emailResult.skipped) {
          console.error('[email] CTC alert failed:', emailResult.error);
        }
      } catch (err) {
        emailResult = { ok: false, error: err.message || 'Email failed' };
        console.error('[email] CTC alert failed:', err);
      }

      res.json({ ...result, email: emailResult });
    } catch (e) {
      console.error('PATCH /api/products/:asin', e);
      res.status(500).json({ ok: false, error: e.message || 'Update failed.' });
    }
  });

  app.post('/api/notifications/category-team-cost', requireAuth, async (req, res) => {
    try {
      const { items, updatedBy, timestamp } = req.body || {};
      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ ok: false, error: 'No Category Team Cost changes provided.' });
        return;
      }

      const result = await sendCtcAlertIfNeeded({
        items,
        updatedBy: updatedBy || req.user.email,
        timestamp: timestamp || new Date().toLocaleString('en-IN'),
      });

      if (!result.ok && !result.skipped) {
        res.status(500).json(result);
        return;
      }

      res.json(result);
    } catch (e) {
      console.error('POST /api/notifications/category-team-cost', e);
      res.status(500).json({ ok: false, error: e.message || 'Notification failed.' });
    }
  });

  return app;
};

export const initApp = async () => {
  await Promise.all([ensureUsersReady(), ensureHistorySheetReady()]);
  return createApp();
};

