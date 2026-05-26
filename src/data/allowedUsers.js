/**
 * Allowed Users (Whitelist + Passwords)
 * ----------------------------------------------------------------
 * The single source of truth for who can sign in. Each entry pairs
 * an email with a password. The auth service checks BOTH fields.
 *
 * IMPORTANT (security):
 *   - Storing plain-text passwords on the client is fine ONLY for
 *     this dummy/learning project. In production this list MUST
 *     move server-side, and passwords must be hashed (bcrypt/argon2).
 *   - When you migrate to Google OAuth, you can delete the
 *     `password` field entirely — Google verifies identity for you,
 *     and this file becomes a pure whitelist again.
 *
 * To add a user:
 *   1. Append a new { email, password } object below.
 *   2. Keep `email` lowercase.
 *   3. Password is case-sensitive; spaces are allowed.
 *
 * FUTURE GOOGLE SHEETS INTEGRATION:
 *   - Replace this static array with a `fetchAllowedUsers()` call
 *     that reads a "Users" tab (columns: email, password) from
 *     a Google Sheet. The consumers don't need to change.
 */

const allowedUsers = [
  { email: 'admin@gmail.com',              password: 'admin123' },
  { email: 'devendra.singh@avaipl.com',    password: 'devendra123' },
];

export default allowedUsers;
