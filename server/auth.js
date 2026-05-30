import jwt from 'jsonwebtoken';

const JWT_SECRET =
  process.env.JWT_SECRET_KEY || 'dev-only-change-me-in-production';
const EXPIRES_IN = `${Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES) || 60}m`;

export const signToken = (user) =>
  jwt.sign(
    { email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: EXPIRES_IN },
  );

export const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      email: String(payload.email || '').toLowerCase(),
      role: payload.role || 'user',
    };
    next();
  } catch {
    res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }
};

export const requireSuperAdmin = (req, res, next) => {
  if (req.user?.role !== 'super_admin') {
    res.status(403).json({ error: 'Super admin access required.' });
    return;
  }
  next();
};
