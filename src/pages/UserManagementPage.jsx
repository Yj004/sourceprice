import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Button from '../components/Button.jsx';
import Input from '../components/Input.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import Loader from '../components/Loader.jsx';
import { useToast } from '../context/useToast.js';
import {
  addUser,
  fetchUsers,
  removeUser,
} from '../services/userAdminService.js';
import './UserManagementPage.css';

const UserManagementPage = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [removingEmail, setRemovingEmail] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchUsers();
      setUsers(list);
    } catch (e) {
      showToast(e.message || 'Failed to load users.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await addUser(email, password);
      showToast(`User ${email.trim().toLowerCase()} created.`, 'success');
      setEmail('');
      setPassword('');
      await loadUsers();
    } catch (err) {
      showToast(err.message || 'Could not create user.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (targetEmail) => {
    if (removingEmail) return;
    const ok = window.confirm(`Remove user ${targetEmail}?`);
    if (!ok) return;

    setRemovingEmail(targetEmail);
    try {
      await removeUser(targetEmail);
      showToast(`Removed ${targetEmail}.`, 'success');
      await loadUsers();
    } catch (err) {
      showToast(err.message || 'Could not remove user.', 'error');
    } finally {
      setRemovingEmail('');
    }
  };

  return (
    <>
      <Navbar />
      <main className="umgmt">
        <Link to="/dashboard" className="umgmt__back">
          ← Back to dashboard
        </Link>

        <header className="umgmt__head">
          <div>
            <p className="umgmt__eyebrow">Super admin</p>
            <h1 className="umgmt__title">User management</h1>
            <p className="umgmt__sub">
              Users are stored in the Google Sheet tab{' '}
              <strong>user-manage</strong> with hashed passwords.
            </p>
          </div>
        </header>

        <section className="umgmt__card">
          <h2 className="umgmt__section-title">Add user</h2>
          <form className="umgmt__form" onSubmit={handleCreate}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@company.com"
              autoComplete="off"
            />
            <PasswordInput
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              autoComplete="new-password"
            />
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create user'}
            </Button>
          </form>
        </section>

        <section className="umgmt__card">
          <h2 className="umgmt__section-title">All users</h2>
          {loading ? (
            <Loader label="Loading users…" />
          ) : users.length === 0 ? (
            <p className="umgmt__empty">No users yet.</p>
          ) : (
            <div className="umgmt__table-wrap">
              <table className="umgmt__table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th>Created by</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.email}>
                      <td className="umgmt__email">{u.email}</td>
                      <td>
                        <span
                          className={`umgmt__role umgmt__role--${u.role === 'super_admin' ? 'admin' : 'user'}`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="umgmt__muted">
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleString('en-IN')
                          : '—'}
                      </td>
                      <td className="umgmt__muted">{u.createdBy || '—'}</td>
                      <td className="umgmt__actions">
                        {u.role !== 'super_admin' ? (
                          <button
                            type="button"
                            className="umgmt__remove"
                            disabled={removingEmail === u.email}
                            onClick={() => handleRemove(u.email)}
                          >
                            {removingEmail === u.email ? '…' : 'Remove'}
                          </button>
                        ) : (
                          <span className="umgmt__protected">Protected</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
};

export default UserManagementPage;
