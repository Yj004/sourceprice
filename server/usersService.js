import bcrypt from 'bcryptjs';
import {
  appendValues,
  batchUpdateValues,
  deleteSheetRows,
  ensureSheetTab,
  getValues,
} from './sheetsApi.js';

export const USER_TAB = 'user-manage';
const USER_RANGE = `${USER_TAB}!A2:E`;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const SUPER_ADMIN_EMAIL = normalizeEmail(process.env.SUPER_ADMIN_EMAIL);
const SUPER_ADMIN_BOOTSTRAP_PASSWORD = String(
  process.env.SUPER_ADMIN_BOOTSTRAP_PASSWORD || '',
);

const HEADERS = [
  'email',
  'password_hash',
  'role',
  'created_at',
  'created_by',
];

const canBootstrapSuperAdmin =
  Boolean(SUPER_ADMIN_EMAIL) && SUPER_ADMIN_BOOTSTRAP_PASSWORD.length >= 6;

const rowToUser = (row, rowIndex) => {
  const email = normalizeEmail(row[0]);
  if (!email) return null;

  return {
    rowIndex,
    email,
    passwordHash: String(row[1] || ''),
    role: String(row[2] || 'user').trim() || 'user',
    createdAt: String(row[3] || '').trim(),
    createdBy: String(row[4] || '').trim(),
  };
};

const loadUsers = async () => {
  const rows = await getValues(USER_RANGE);
  return rows
    .map((row, i) => rowToUser(row, i + 2))
    .filter(Boolean);
};

const toPublicUser = (user) => ({
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
  createdBy: user.createdBy,
});

let usersReadyPromise = null;

export const ensureUsersReady = () => {
  if (!usersReadyPromise) {
    usersReadyPromise = bootstrapUsersSheet();
  }
  return usersReadyPromise;
};

const bootstrapUsersSheet = async () => {
  await ensureSheetTab(USER_TAB);

  const header = await getValues(`${USER_TAB}!A1:E1`);
  if (!header.length || header[0]?.[0] !== 'email') {
    await batchUpdateValues([
      { range: `${USER_TAB}!A1:E1`, values: [HEADERS] },
    ]);
  }

  const users = await loadUsers();
  const hasSuperAdmin = users.some((u) => u.role === 'super_admin');
  if (hasSuperAdmin || !canBootstrapSuperAdmin) return;

  const hash = await bcrypt.hash(SUPER_ADMIN_BOOTSTRAP_PASSWORD, 10);
  await appendValues(`${USER_TAB}!A:E`, [[
    SUPER_ADMIN_EMAIL,
    hash,
    'super_admin',
    new Date().toISOString(),
    'system',
  ]]);
};

export const loginUser = async (email, password) => {
  await ensureUsersReady();

  const value = normalizeEmail(email);
  const pwd = String(password ?? '');
  if (!value || !pwd) {
    return { ok: false, error: 'Invalid email or password.' };
  }

  const users = await loadUsers();
  const user = users.find((u) => u.email === value);
  if (!user) {
    return { ok: false, error: 'Invalid email or password.' };
  }

  const match = await bcrypt.compare(pwd, user.passwordHash);
  if (!match) {
    return { ok: false, error: 'Invalid email or password.' };
  }

  return {
    ok: true,
    user: {
      email: user.email,
      role: user.role,
    },
  };
};

export const listUsers = async () => {
  await ensureUsersReady();
  const users = await loadUsers();
  return users.map(toPublicUser).sort((a, b) => a.email.localeCompare(b.email));
};

export const createUser = async ({
  email,
  password,
  createdBy,
  role = 'user',
}) => {
  await ensureUsersReady();

  const value = normalizeEmail(email);
  const pwd = String(password ?? '');

  if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  if (pwd.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters.' };
  }

  const safeRole = role === 'super_admin' ? 'user' : 'user';
  const users = await loadUsers();
  if (users.some((u) => u.email === value)) {
    return { ok: false, error: 'A user with this email already exists.' };
  }

  const hash = await bcrypt.hash(pwd, 10);
  await appendValues(`${USER_TAB}!A:E`, [
    [
      value,
      hash,
      safeRole,
      new Date().toISOString(),
      normalizeEmail(createdBy) || 'system',
    ],
  ]);

  return {
    ok: true,
    user: {
      email: value,
      role: safeRole,
      createdAt: new Date().toISOString(),
      createdBy: normalizeEmail(createdBy) || 'system',
    },
  };
};

export const deleteUser = async ({ email, actorEmail }) => {
  await ensureUsersReady();

  const target = normalizeEmail(email);
  const actor = normalizeEmail(actorEmail);
  if (!target) return { ok: false, error: 'Invalid email.' };

  if (target === actor) {
    return { ok: false, error: 'You cannot remove your own account.' };
  }

  const users = await loadUsers();
  const user = users.find((u) => u.email === target);
  if (!user) return { ok: false, error: 'User not found.' };
  if (user.role === 'super_admin') {
    return { ok: false, error: 'Super admin accounts cannot be removed.' };
  }

  await deleteSheetRows(USER_TAB, user.rowIndex - 1, user.rowIndex);
  return { ok: true };
};
