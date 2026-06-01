import cors from 'cors';
import express from 'express';
import { requireAuth, requireSuperAdmin, signToken } from './auth.js';
import {
  fetchHistory,
  fetchProducts,
  updateProduct,
  updateProductPrice,
} from './sheetsClient.js';
import { notifyCategoryTeamCostChange } from './emailService.js';
import {
  createUser,
  deleteUser,
  ensureUsersReady,
  listUsers,
  loginUser,
} from './usersService.js';

const origins = (process.env.BACKEND_CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const createApp = () => {
  const app = express();
  app.use(cors({ origin: origins }));
  app.use(express.json());

  app.get('/api/health', async (_req, res) => {
    try {
      await ensureUsersReady();
      res.json({ ok: true, sheet: Boolean(process.env.GOOGLE_SHEET_ID) });
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
      res.json(result);
    } catch (e) {
      console.error('PATCH /api/products/:asin/price', e);
      res.status(500).json({ ok: false, error: e.message || 'Update failed.' });
    }
  });

  app.patch('/api/products/:asin', requireAuth, async (req, res) => {
    try {
      const { asin } = req.params;
      const { updates, updatedBy } = req.body || {};
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

      notifyCategoryTeamCostChange({
        product: result.product,
        changes: result.changes,
        updatedBy: result.updatedBy,
        timestamp: result.timestamp,
        totalChanged: result.totalChanged,
        oldTotalCost: result.oldTotalCost,
        newTotalCost: result.newTotalCost,
      }).catch((err) => {
        console.error('Category Team Cost email notification failed:', err);
      });

      res.json(result);
    } catch (e) {
      console.error('PATCH /api/products/:asin', e);
      res.status(500).json({ ok: false, error: e.message || 'Update failed.' });
    }
  });

  return app;
};

export const initApp = async () => {
  await ensureUsersReady();
  return createApp();
};

