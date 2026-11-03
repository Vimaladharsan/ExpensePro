import { useEffect, useRef, useState } from 'react';
import { Copy, LoaderCircle, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.js';
import { useToast } from '../context/ToastContext.jsx';
import { CATEGORIES, OVERALL } from '../constants.js';
import {
  CardHead, CategoryIcon, EmptyState, ProgressBar, ProgressRing, Skeleton, budgetStatus,
} from '../components/ui.jsx';
import { currentMonth, daysInMonth, formatINR, formatMonth, shiftMonth } from '../utils/format.js';

export default function Budgets() {
  const { month, refreshKey, refresh, askConfirm } = useApp();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ category: OVERALL, amount: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const formRef = useRef(null);

  useEffect(() => {
    let ignore = false;
    api(`/budgets?month=${month}`)
      .then((result) => !ignore && setData(result))
      .catch((err) => !ignore && toast.error(err.message));
    return () => {
      ignore = true;
    };
  }, [month, refreshKey, toast]);

  // Whenever the budgets load or change, start the form on the first budget that isn't set yet
  useEffect(() => {
    if (!data) return;
    const set = new Set(data.categories.map((b) => b.category));
    const next = !data.overall ? OVERALL : CATEGORIES.expense.find((c) => !set.has(c)) || OVERALL;
    setForm(formFor(data, next));
    setFormError('');
  }, [data]);

  // Fill the form to change a budget (or set one for a category), and scroll to it
  function editBudget(category, amount) {
    setForm({ category, amount: amount ? String(amount) : '' });
    setFormError('');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    formRef.current?.querySelector('input')?.focus({ preventScroll: true });
  }

  async function saveBudget(e) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.amount || !Number.isFinite(amount) || amount < 1) return setFormError('Enter a budget of at least ₹1');
    setSaving(true);
    setFormError('');
    try {
      await api('/budgets', { method: 'PUT', body: { month, category: form.category, amount } });
      toast.success(`${form.category === OVERALL ? 'Overall' : form.category} budget saved`);
      refresh();
    } catch (err) {
      setFormError(err.message);
    }
    setSaving(false);
  }

  async function removeBudget(budget, label) {
    const ok = await askConfirm({ title: `Remove the ${label} budget?`, message: 'Your transactions are not affected.', confirmLabel: 'Remove' });
    if (!ok) return;
    try {
      await api(`/budgets/${budget._id}`, { method: 'DELETE' });
      toast.success('Budget removed');
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // Copy every budget from the previous month into this month
  async function copyLastMonth() {
    setCopying(true);
    try {
      const previous = await api(`/budgets?month=${shiftMonth(month, -1)}`);
      const list = [...(previous.overall ? [{ category: OVERALL, amount: previous.overall.amount }] : []), ...previous.categories];
      if (list.length === 0) {
        toast.info(`No budgets in ${formatMonth(shiftMonth(month, -1))} to copy`);
      } else {
        await Promise.all(list.map((b) => api('/budgets', { method: 'PUT', body: { month, category: b.category, amount: b.amount } })));
        toast.success(`Copied ${list.length} budgets from last month`);
        refresh();
      }
    } catch (err) {
      toast.error(err.message);
    }
    setCopying(false);
  }

  if (!data) {
    return (
      <div className="page">
        <div className="grid-2-1"><div className="card"><Skeleton height={200} /></div><div className="card"><Skeleton height={200} /></div></div>
      </div>
    );
  }

  const isEmpty = !data.overall && data.categories.length === 0;
  const budgeted = new Set(data.categories.map((b) => b.category));
  const unbudgeted = data.spending.filter((s) => !budgeted.has(s.category));
  const existing = form.category === OVERALL ? data.overall : data.categories.find((b) => b.category === form.category);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Budgets</h2>
          <p className="muted">Spending limits for {formatMonth(month)}</p>
        </div>
        {isEmpty && (
          <div className="page-actions">
            <button className="btn btn-ghost" onClick={copyLastMonth} disabled={copying}>
              {copying ? <LoaderCircle size={16} className="spin" /> : <Copy size={16} />} Copy last month’s budgets
            </button>
          </div>
        )}
      </div>

      <section className="grid-2-1">
        <div className="card">
          <CardHead title="Overall budget" subtitle="Limit for all spending this month" />
          {data.overall ? (
            <OverallCard overall={data.overall} month={month}
              onEdit={() => editBudget(OVERALL, data.overall.amount)}
              onRemove={() => removeBudget(data.overall, 'overall')} />
          ) : (
            <EmptyState icon={Target} title="No overall budget yet"
              text={`You’ve spent ${formatINR(data.totalSpent)} so far this month.`}
              action={<button className="btn btn-primary btn-sm" onClick={() => editBudget(OVERALL, '')}><Plus size={16} /> Set overall budget</button>} />
          )}
        </div>

        <form className="card budget-form" onSubmit={saveBudget} ref={formRef} noValidate>
          <CardHead title={existing ? 'Change budget' : 'Set a budget'} subtitle="Choose overall or a category" />
          <label className="field">
            <span className="field-label">Category</span>
            <select value={form.category} onChange={(e) => {
              setForm(formFor(data, e.target.value));
              setFormError('');
            }}>
              <option value={OVERALL}>Overall (all spending)</option>
              {CATEGORIES.expense.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Monthly limit</span>
            <div className={`amount-input amount-input-sm ${formError ? 'invalid' : ''}`}>
              <span>₹</span>
              <input type="number" min="1" step="any" placeholder="e.g. 5000" value={form.amount}
                onChange={(e) => { setForm({ ...form, amount: e.target.value }); setFormError(''); }} />
            </div>
          </label>
          {formError && <p className="form-error">{formError}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {saving && <LoaderCircle size={16} className="spin" />} {existing ? 'Update budget' : 'Save budget'}
          </button>
        </form>
      </section>

      <div className="card">
        <CardHead title="Category budgets" subtitle="Closest to the limit first" />
        {data.categories.length === 0 ? (
          <EmptyState icon={Target} title="No category budgets" text="Limit categories like Food or Shopping to control spending." />
        ) : (
          <div className="category-budgets">
            {data.categories.map((b) => {
              const { percent, status } = budgetStatus(b.spent, b.amount);
              const left = b.amount - b.spent;
              return (
                <div key={b._id} className={`category-budget status-${status}`}>
                  <div className="category-budget-top">
                    <CategoryIcon category={b.category} size={38} />
                    <div className="category-budget-name">
                      <b>{b.category}</b>
                      <small className="muted">{formatINR(b.spent)} of {formatINR(b.amount)}</small>
                    </div>
                    <div className="row-actions">
                      <button className="icon-btn" onClick={() => editBudget(b.category, b.amount)} aria-label={`Edit ${b.category} budget`}><Pencil size={15} /></button>
                      <button className="icon-btn danger" onClick={() => removeBudget(b, b.category)} aria-label={`Remove ${b.category} budget`}><Trash2 size={15} /></button>
                    </div>
                  </div>
                  <ProgressBar percent={percent} status={status} />
                  <div className="category-budget-foot">
                    <span className={`budget-note ${status}`}>
                      {status === 'over' ? `${formatINR(-left)} over` : status === 'warning' ? `Only ${formatINR(left)} left` : `${formatINR(left)} left`}
                    </span>
                    <span className="muted small">{percent}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {unbudgeted.length > 0 && (
        <div className="card">
          <CardHead title="Spending without a budget" subtitle="Set a limit to keep these in check" />
          <ul className="unbudgeted">
            {unbudgeted.map((s) => (
              <li key={s.category}>
                <CategoryIcon category={s.category} size={34} />
                <span className="unbudgeted-name">{s.category}</span>
                <b>{formatINR(s.total)}</b>
                <button className="btn btn-ghost btn-sm" onClick={() => editBudget(s.category, Math.ceil((s.total * 1.2) / 500) * 500)}>
                  Set limit
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Form values for a category: its current amount if it already has a budget, otherwise empty
function formFor(data, category) {
  const found = category === OVERALL ? data.overall : data.categories.find((b) => b.category === category);
  return { category, amount: found ? String(found.amount) : '' };
}

// Big ring for the overall budget, plus how much can be spent per day for the rest of the month
function OverallCard({ overall, month, onEdit, onRemove }) {
  const { percent, status } = budgetStatus(overall.spent, overall.amount);
  const left = overall.amount - overall.spent;
  const today = currentMonth();
  const daysLeft = month === today ? daysInMonth(month) - new Date().getDate() + 1 : month > today ? daysInMonth(month) : 0;

  return (
    <div className="overall-card">
      <ProgressRing percent={percent} status={status} size={148} stroke={13} />
      <div className="overall-numbers">
        <div><small className="muted">Budget</small><b>{formatINR(overall.amount)}</b></div>
        <div><small className="muted">Spent</small><b>{formatINR(overall.spent)}</b></div>
        <div>
          <small className="muted">{left >= 0 ? 'Left to spend' : 'Over budget'}</small>
          <b className={`budget-note ${status}`}>{formatINR(Math.abs(left))}</b>
        </div>
        <div>
          <small className="muted">Safe daily spend</small>
          <b>{left > 0 && daysLeft > 0 ? formatINR(Math.floor(left / daysLeft)) : '—'}</b>
        </div>
      </div>
      <div className="row-actions overall-actions">
        <button className="btn btn-ghost btn-sm" onClick={onEdit}><Pencil size={15} /> Change</button>
        <button className="btn btn-ghost btn-sm danger" onClick={onRemove}><Trash2 size={15} /> Remove</button>
      </div>
    </div>
  );
}
