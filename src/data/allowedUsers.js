/**
 * Allowed Users (Whitelist)
 * ----------------------------------------------------------------
 * Only the email addresses listed here can log in. Any valid email
 * domain is supported (Gmail, company, etc.) — domain restriction
 * belongs in this list, not in the auth service.
 *
 * Important: keep every entry lowercase. The auth service
 * lowercases the user's input before comparing.
 *
 * FUTURE GOOGLE OAUTH FLOW:
 *   - After a user signs in with "Sign in with Google", verify the
 *     email returned by Google Identity Services against this array.
 *   - The check stays exactly the same — only the input source changes.
 *
 * FUTURE GOOGLE SHEETS INTEGRATION:
 *   - Replace this static array with a `fetchAllowedUsers()` call
 *     in a sheets service that reads a "Users" tab from a Google
 *     Sheet. Keep the shape identical (lowercase strings).
 */

const allowedUsers = [
  'admin@gmail.com',
  'devendra.singh@avaipl.com',
];

export default allowedUsers;
