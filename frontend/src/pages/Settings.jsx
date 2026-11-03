import { useState } from 'react';
import { Database, Download, KeyRound, Keyboard, LoaderCircle, Moon, Palette, Sun, UserRound } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.js';
import { useToast } from '../context/ToastContext.jsx';
import { DEMO_LOGIN } from '../constants.js';
import { CardHead } from '../components/ui.jsx';
import { downloadTransactionsCsv } from '../utils/csv.js';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useApp();
  const toast = useToast();
  const isDemo = user.email === DEMO_LOGIN.email;

  const [name, setName] = useState(user.name);
  const [savingName, setSavingName] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function saveName(e) {
    e.preventDefault();
    if (!name.trim()) return toast.error('Please enter your name');
    setSavingName(true);
    try {
      const updated = await api('/auth/me', { method: 'PUT', body: { name: name.trim() } });
      updateUser(updated);
      toast.success('Name updated');
    } catch (err) {
      toast.error(err.message);
    }
    setSavingName(false);
  }

  async function changePassword(e) {
    e.preventDefault();
    if (passwords.next.length < 6) return setPasswordError('New password must be at least 6 characters');
    if (passwords.next !== passwords.confirm) return setPasswordError('New passwords do not match');
    setSavingPassword(true);
    setPasswordError('');
    try {
      await api('/auth/password', { method: 'PUT', body: { currentPassword: passwords.current, newPassword: passwords.next } });
      setPasswords({ current: '', next: '', confirm: '' });
      toast.success('Password changed');
    } catch (err) {
      setPasswordError(err.message);
    }
    setSavingPassword(false);
  }

  async function exportAll() {
    setExporting(true);
    try {
      const data = await api('/transactions?month=all&limit=1000');
      if (data.items.length === 0) toast.info('No transactions to export yet');
      else toast.success(`Exported ${downloadTransactionsCsv(data.items, 'expensepro-all-transactions.csv')} transactions`);
    } catch (err) {
      toast.error(err.message);
    }
    setExporting(false);
  }

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : null;
  const initials = user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="page settings">
      <div className="page-head">
        <div>
          <h2>Settings</h2>
          <p className="muted">Manage your profile, security and preferences</p>
        </div>
      </div>

      <section className="settings-grid">
        <form className="card settings-card" onSubmit={saveName}>
          <CardHead title={<span className="title-with-icon"><UserRound size={17} /> Profile</span>} />
          <div className="profile-row">
            <span className="avatar avatar-lg">{initials}</span>
            <div>
              <b>{user.name}</b>
              <small className="muted">{user.email}</small>
              {memberSince && <small className="muted">Member since {memberSince}</small>}
            </div>
          </div>
          <label className="field">
            <span className="field-label">Display name</span>
            <input type="text" value={name} maxLength={50} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Email</span>
            <input type="email" value={user.email} disabled />
          </label>
          <button type="submit" className="btn btn-primary" disabled={savingName || name.trim() === user.name}>
            {savingName && <LoaderCircle size={16} className="spin" />} Save profile
          </button>
        </form>

        <form className="card settings-card" onSubmit={changePassword}>
          <CardHead title={<span className="title-with-icon"><KeyRound size={17} /> Password</span>} />
          {isDemo && <p className="info-note">Password changes are turned off for the shared demo account.</p>}
          <label className="field">
            <span className="field-label">Current password</span>
            <input type="password" autoComplete="current-password" value={passwords.current} disabled={isDemo}
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} />
          </label>
          <label className="field">
            <span className="field-label">New password</span>
            <input type="password" autoComplete="new-password" value={passwords.next} disabled={isDemo}
              onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} />
          </label>
          <label className="field">
            <span className="field-label">Confirm new password</span>
            <input type="password" autoComplete="new-password" value={passwords.confirm} disabled={isDemo}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} />
          </label>
          {passwordError && <p className="form-error">{passwordError}</p>}
          <button type="submit" className="btn btn-primary" disabled={isDemo || savingPassword || !passwords.current}>
            {savingPassword && <LoaderCircle size={16} className="spin" />} Change password
          </button>
        </form>

        <div className="card settings-card">
          <CardHead title={<span className="title-with-icon"><Palette size={17} /> Appearance</span>} />
          <div className="theme-choice">
            {[['light', 'Light', Sun], ['dark', 'Dark', Moon]].map(([value, label, Icon]) => (
              <button key={value} className={`theme-option theme-${value} ${theme === value ? 'selected' : ''}`} onClick={() => setTheme(value)}>
                <span className="theme-swatch"><span /><span /><span /></span>
                <span className="theme-label"><Icon size={15} /> {label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card settings-card">
          <CardHead title={<span className="title-with-icon"><Database size={17} /> Your data</span>} />
          <p className="muted small">Download every transaction you’ve ever added as a spreadsheet (CSV).</p>
          <button className="btn btn-ghost" onClick={exportAll} disabled={exporting}>
            {exporting ? <LoaderCircle size={16} className="spin" /> : <Download size={16} />} Export all transactions
          </button>
          <CardHead title={<span className="title-with-icon"><Keyboard size={17} /> Keyboard shortcuts</span>} />
          <ul className="shortcuts">
            <li><kbd className="kbd">N</kbd> Add a transaction</li>
            <li><kbd className="kbd">/</kbd> Quick Add (type it in words)</li>
            <li><kbd className="kbd">Esc</kbd> Close a pop-up</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
