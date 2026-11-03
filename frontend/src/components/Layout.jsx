import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowLeftRight, CalendarDays, ChartColumnBig, ChevronLeft, ChevronRight, Flag, LayoutDashboard, LogOut, Moon, Plus,
  Settings, Sun, Target, Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { AppContext } from '../context/AppContext.js';
import { currentMonth, formatMonth, shiftMonth } from '../utils/format.js';
import TransactionModal from './TransactionModal.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import QuickAdd, { isTypingIn } from './QuickAdd.jsx';
import AlertsBell from './AlertsBell.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', short: 'Home', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', short: 'Activity', icon: ArrowLeftRight },
  { to: '/budgets', label: 'Budgets', short: 'Budgets', icon: Target },
  { to: '/goals', label: 'Savings goals', short: 'Goals', icon: Flag },
  { to: '/reports', label: 'Reports', short: 'Reports', icon: ChartColumnBig },
];
const TITLES = { '/settings': 'Settings' };

// The frame around every page: sidebar, top bar, and the shared pop-ups
export default function Layout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [theme, setTheme] = useTheme();

  const [month, setMonth] = useState(currentMonth());
  const [refreshKey, setRefreshKey] = useState(0); // pages reload their data when this changes
  const [modal, setModal] = useState(null); // { transaction, initial } while the add/edit pop-up is open
  const [confirmBox, setConfirmBox] = useState(null);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);
  const openTransaction = useCallback((transaction = null, initial = null) => setModal({ transaction, initial }), []);
  // askConfirm({ title, message }) shows a yes/no pop-up and resolves to true or false
  const askConfirm = useCallback((options) => new Promise((resolve) => setConfirmBox({ ...options, resolve })), []);

  const shared = useMemo(
    () => ({ month, setMonth, refreshKey, refresh, openTransaction, askConfirm, theme, setTheme }),
    [month, refreshKey, refresh, openTransaction, askConfirm, theme, setTheme]
  );

  // Keyboard shortcut: N = new transaction
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey && !isTypingIn(e.target) && !modal && !confirmBox) {
        e.preventDefault();
        openTransaction();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, confirmBox, openTransaction]);

  function handleSaved(saved, wasEdit) {
    setModal(null);
    toast.success(wasEdit ? 'Transaction updated' : `Added: ${saved.note || saved.category}`);
    const savedMonth = saved.date.slice(0, 7);
    if (savedMonth !== month) {
      setMonth(savedMonth); // jump to the month the transaction belongs to
      toast.info(`Showing ${formatMonth(savedMonth)}`);
    }
    refresh();
  }

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const title = NAV.find((item) => item.to === location.pathname)?.label || TITLES[location.pathname];
  const initials = user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <AppContext.Provider value={shared}>
      <div className="shell">
        <aside className="sidebar">
          <Brand />
          <nav className="side-nav">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'} className="side-link" title={label}>
                <Icon size={19} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-footer">
            <button className="side-link" onClick={toggleTheme} title="Switch theme">
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
              <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>
            <NavLink to="/settings" className="side-link" title="Settings">
              <Settings size={19} />
              <span>Settings</span>
            </NavLink>
            <div className="user-chip">
              <span className="avatar">{initials}</span>
              <div className="user-text">
                <b>{user.name}</b>
                <small>{user.email}</small>
              </div>
            </div>
            <button className="side-link" onClick={logout} title="Log out">
              <LogOut size={19} />
              <span>Log out</span>
            </button>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <div className="topbar-left">
              <div className="mobile-brand"><Brand /></div>
              <h1 className="page-title">{title}</h1>
            </div>
            <QuickAdd onSaved={(saved) => handleSaved(saved, false)} onOpenFull={(parsed) => openTransaction(null, parsed)} />
            <div className="mobile-tools">
              <button className="icon-btn" onClick={toggleTheme} aria-label="Switch theme">
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <NavLink to="/settings" className="icon-btn" aria-label="Settings"><Settings size={18} /></NavLink>
            </div>
            <div className="topbar-actions">
              <AlertsBell month={month} refreshKey={refreshKey} />
              <MonthPicker month={month} onChange={setMonth} />
              <button className="btn btn-primary" onClick={() => openTransaction()} title="Add transaction (N)">
                <Plus size={18} />
                <span className="hide-sm">Add</span>
                <kbd className="kbd kbd-light hide-sm">N</kbd>
              </button>
            </div>
          </header>

          <main className="content">
            {/* key restarts the fade-in animation on every page change */}
            <div key={location.pathname} className="page-enter">
              <Outlet />
            </div>
          </main>
        </div>

        <nav className="bottom-nav">
          {NAV.map(({ to, short, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className="bottom-link">
              <Icon size={20} />
              <span>{short}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {modal && (
        <TransactionModal
          transaction={modal.transaction}
          initial={modal.initial}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
      {confirmBox && (
        <ConfirmDialog
          {...confirmBox}
          onClose={(answer) => {
            confirmBox.resolve(answer);
            setConfirmBox(null);
          }}
        />
      )}
    </AppContext.Provider>
  );
}

export function Brand({ light = false }) {
  return (
    <div className={`brand ${light ? 'brand-light' : ''}`}>
      <span className="brand-mark"><Wallet size={18} /></span>
      <span className="brand-name">Expense<b>Pro</b></span>
    </div>
  );
}

// "‹ October 2026 ›" with a hidden month input that opens the browser's month picker
function MonthPicker({ month, onChange }) {
  const inputRef = useRef(null);

  function openPicker() {
    const input = inputRef.current;
    if (input?.showPicker) input.showPicker();
    else input?.focus();
  }

  return (
    <div className="month-picker">
      <button className="icon-btn" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Previous month">
        <ChevronLeft size={18} />
      </button>
      <button className="month-label" onClick={openPicker}>
        <CalendarDays size={16} />
        <span>{formatMonth(month)}</span>
      </button>
      <input
        ref={inputRef}
        className="visually-hidden"
        type="month"
        value={month}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
      />
      <button className="icon-btn" onClick={() => onChange(shiftMonth(month, 1))} aria-label="Next month">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

// Light/dark theme, remembered in the browser
export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // storage blocked: theme just isn't remembered
    }
  }, [theme]);
  return [theme, setTheme];
}
