import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CircleCheckBig, Target } from 'lucide-react';
import { api } from '../api.js';
import { formatINR, formatMonth } from '../utils/format.js';
import { CategoryIcon, budgetStatus } from './ui.jsx';

// Bell in the top bar: lists budgets that are close to (80%+) or over their limit
export default function AlertsBell({ month, refreshKey }) {
  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    let ignore = false;
    api(`/budgets?month=${month}`)
      .then((data) => {
        if (ignore) return;
        const budgets = [...(data.overall ? [{ ...data.overall, category: 'Overall' }] : []), ...data.categories];
        const list = budgets
          .map((b) => ({ ...b, ...budgetStatus(b.spent, b.amount) }))
          .filter((b) => b.status !== 'ok')
          .sort((a, b) => b.percent - a.percent);
        setAlerts(list);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [month, refreshKey]);

  // Close when clicking anywhere else
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => !boxRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="bell" ref={boxRef}>
      <button className="icon-btn" onClick={() => setOpen(!open)} aria-label={`Budget alerts (${alerts.length})`} aria-expanded={open}>
        <Bell size={18} />
        {alerts.length > 0 && <span className="bell-badge">{alerts.length}</span>}
      </button>

      {open && (
        <div className="bell-panel">
          <div className="bell-head">
            <b>Budget alerts</b>
            <small className="muted">{formatMonth(month)}</small>
          </div>
          {alerts.length === 0 ? (
            <p className="bell-empty"><CircleCheckBig size={18} /> All budgets are on track</p>
          ) : (
            <ul className="bell-list">
              {alerts.map((a) => (
                <li key={a._id}>
                  {a.category === 'Overall' ? (
                    <span className="cat-icon" style={{ '--cat': '#6366f1', width: 34, height: 34 }}><Target size={16} /></span>
                  ) : (
                    <CategoryIcon category={a.category} size={34} />
                  )}
                  <p>
                    <b>{a.category === 'Overall' ? 'Overall budget' : a.category}</b>
                    {a.status === 'over'
                      ? <> is <span className="text-bad">{formatINR(a.spent - a.amount)} over</span> its limit</>
                      : <> has used <span className="text-warn">{a.percent}%</span> ({formatINR(a.amount - a.spent)} left)</>}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link to="/budgets" className="bell-footer" onClick={() => setOpen(false)}>Manage budgets →</Link>
        </div>
      )}
    </div>
  );
}
