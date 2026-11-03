import { useEffect, useRef, useState } from 'react';
import { Flag, LoaderCircle, Minus, PartyPopper, Pencil, Plus, Trash2, Trophy, X } from 'lucide-react';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.js';
import { useToast } from '../context/ToastContext.jsx';
import { GOAL_COLORS, GOAL_ICONS } from '../constants.js';
import { EmptyState, ProgressBar, ProgressRing, Skeleton } from '../components/ui.jsx';
import { formatINR, todayISO } from '../utils/format.js';

export default function Goals() {
  const { refreshKey, refresh, askConfirm } = useApp();
  const toast = useToast();
  const [goals, setGoals] = useState(null);
  const [editor, setEditor] = useState(null); // { goal } while creating/editing
  const [mover, setMover] = useState(null); // { goal, mode: 'add' | 'withdraw' } while adding/taking money
  const [celebrate, setCelebrate] = useState(null); // id of a goal that was just reached

  useEffect(() => {
    let ignore = false;
    api('/goals')
      .then((list) => !ignore && setGoals(list))
      .catch((err) => !ignore && toast.error(err.message));
    return () => {
      ignore = true;
    };
  }, [refreshKey, toast]);

  async function removeGoal(goal) {
    const ok = await askConfirm({ title: `Delete “${goal.name}”?`, message: 'The goal and its saved amount will be removed.' });
    if (!ok) return;
    try {
      await api(`/goals/${goal._id}`, { method: 'DELETE' });
      toast.success('Goal deleted');
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  }

  function handleMoved(updated, before) {
    setMover(null);
    if (updated.saved >= updated.target && before.saved < before.target) {
      setCelebrate(updated._id);
      toast.success(`🎉 You reached your “${updated.name}” goal!`);
      setTimeout(() => setCelebrate(null), 2200);
    } else {
      toast.success(updated.saved > before.saved ? `Added ${formatINR(updated.saved - before.saved)} to ${updated.name}` : `Took out ${formatINR(before.saved - updated.saved)}`);
    }
    refresh();
  }

  if (!goals) {
    return <div className="page"><div className="goal-grid">{[1, 2, 3].map((i) => <div key={i} className="card"><Skeleton height={220} /></div>)}</div></div>;
  }

  const totalSaved = goals.reduce((sum, g) => sum + g.saved, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.target, 0);
  const reached = goals.filter((g) => g.saved >= g.target).length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Savings goals</h2>
          <p className="muted">Save towards the things that matter to you</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setEditor({ goal: null })}><Plus size={16} /> New goal</button>
        </div>
      </div>

      {goals.length === 0 ? (
        <div className="card">
          <EmptyState icon={Flag} title="No goals yet" text="Create a goal like “New laptop” or “Goa trip” and start saving towards it."
            action={<button className="btn btn-primary btn-sm" onClick={() => setEditor({ goal: null })}><Plus size={16} /> Create your first goal</button>} />
        </div>
      ) : (
        <>
          <div className="card goals-summary">
            <div><small className="muted">Total saved</small><b>{formatINR(totalSaved)}</b></div>
            <div><small className="muted">Total of all targets</small><b>{formatINR(totalTarget)}</b></div>
            <div><small className="muted">Goals reached</small><b><Trophy size={18} className="text-warn" /> {reached} of {goals.length}</b></div>
            <div className="goals-summary-bar">
              <ProgressBar percent={totalTarget ? Math.round((totalSaved / totalTarget) * 100) : 0} status="ok" />
              <small className="muted">{totalTarget ? Math.round((totalSaved / totalTarget) * 100) : 0}% of all goals saved</small>
            </div>
          </div>

          <div className="goal-grid">
            {goals.map((goal) => (
              <GoalCard key={goal._id} goal={goal} celebrating={celebrate === goal._id}
                onAdd={() => setMover({ goal, mode: 'add' })}
                onWithdraw={() => setMover({ goal, mode: 'withdraw' })}
                onEdit={() => setEditor({ goal })}
                onDelete={() => removeGoal(goal)} />
            ))}
          </div>
        </>
      )}

      {editor && (
        <GoalEditor goal={editor.goal} onClose={() => setEditor(null)}
          onSaved={(saved, wasEdit) => { setEditor(null); toast.success(wasEdit ? 'Goal updated' : `Goal “${saved.name}” created`); refresh(); }} />
      )}
      {mover && <MoneyDialog {...mover} onClose={() => setMover(null)} onDone={handleMoved} />}
    </div>
  );
}

// Months (rounded up) from today until a date, at least 1
function monthsUntil(dateISO) {
  const now = new Date();
  const end = new Date(dateISO);
  const months = (end.getUTCFullYear() - now.getFullYear()) * 12 + (end.getUTCMonth() - now.getMonth()) + (end.getUTCDate() >= now.getDate() ? 0 : -1);
  return Math.max(1, months + 1);
}

function GoalCard({ goal, celebrating, onAdd, onWithdraw, onEdit, onDelete }) {
  const Icon = GOAL_ICONS[goal.icon] || GOAL_ICONS.piggy;
  const percent = Math.min(100, Math.round((goal.saved / goal.target) * 100));
  const left = Math.max(0, goal.target - goal.saved);
  const done = goal.saved >= goal.target;
  const deadlinePassed = goal.deadline && new Date(goal.deadline) < new Date(todayISO()) && !done;
  const months = goal.deadline ? monthsUntil(goal.deadline) : null;

  let plan = 'No deadline: save at your own pace';
  if (done) plan = 'Goal reached. Well done!';
  else if (deadlinePassed) plan = 'The deadline has passed';
  else if (months) plan = `Save ${formatINR(Math.ceil(left / months))}/month to reach it on time`;

  return (
    <div className={`card goal-card ${done ? 'is-done' : ''}`} style={{ '--goal': goal.color }}>
      {celebrating && <Confetti />}
      <div className="goal-top">
        <span className="goal-icon"><Icon size={20} /></span>
        <div className="goal-title">
          <b>{goal.name}</b>
          <small className="muted">
            {goal.deadline
              ? `by ${new Date(goal.deadline).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' })}${!done && !deadlinePassed ? ` · ${months} month${months === 1 ? '' : 's'} left` : ''}`
              : 'No deadline'}
          </small>
        </div>
        <div className="row-actions">
          <button className="icon-btn" onClick={onEdit} aria-label={`Edit ${goal.name}`}><Pencil size={15} /></button>
          <button className="icon-btn danger" onClick={onDelete} aria-label={`Delete ${goal.name}`}><Trash2 size={15} /></button>
        </div>
      </div>

      <div className="goal-middle">
        <ProgressRing percent={percent} color={goal.color} size={112} stroke={11} label="saved" />
        <div className="goal-amounts">
          <small className="muted">Saved</small>
          <b className="goal-saved">{formatINR(goal.saved)}</b>
          <small className="muted">of {formatINR(goal.target)}</small>
          {done ? <span className="goal-badge"><PartyPopper size={14} /> Reached</span> : <small className="goal-left">{formatINR(left)} to go</small>}
        </div>
      </div>

      <p className={`goal-plan ${deadlinePassed ? 'text-bad' : ''}`}>{plan}</p>

      <div className="goal-actions">
        <button className="btn btn-primary btn-sm" onClick={onAdd}><Plus size={15} /> Add money</button>
        <button className="btn btn-ghost btn-sm" onClick={onWithdraw} disabled={goal.saved <= 0}><Minus size={15} /> Withdraw</button>
      </div>
    </div>
  );
}

// Create or edit a goal
function GoalEditor({ goal, onClose, onSaved }) {
  const isEdit = Boolean(goal);
  const [form, setForm] = useState({
    name: goal?.name || '',
    target: goal ? String(goal.target) : '',
    deadline: goal?.deadline ? goal.deadline.slice(0, 10) : '',
    icon: goal?.icon || 'laptop',
    color: goal?.color || GOAL_COLORS[0],
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  useEscape(onClose);

  const update = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined, form: undefined }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const found = {};
    if (!form.name.trim()) found.name = 'Give your goal a name';
    if (!(Number(form.target) >= 1)) found.target = 'Enter a target of at least ₹1';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const body = { ...form, name: form.name.trim(), target: Number(form.target), deadline: form.deadline || null };
      const saved = isEdit
        ? await api(`/goals/${goal._id}`, { method: 'PUT', body })
        : await api('/goals', { method: 'POST', body });
      onSaved(saved, isEdit);
    } catch (err) {
      setErrors({ ...err.fields, form: err.message });
      setSaving(false);
    }
  }

  const Icon = GOAL_ICONS[form.icon];
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="goal-title" onSubmit={handleSubmit} noValidate>
        <div className="modal-head">
          <h2 id="goal-title">{isEdit ? 'Edit goal' : 'New savings goal'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="goal-editor-preview" style={{ '--goal': form.color }}>
          <span className="goal-icon goal-icon-lg"><Icon size={26} /></span>
          <div>
            <b>{form.name || 'Your goal'}</b>
            <small className="muted">{form.target ? `Target ${formatINR(Number(form.target) || 0)}` : 'Set a target amount'}</small>
          </div>
        </div>

        <label className="field">
          <span className="field-label">Goal name</span>
          <input type="text" maxLength={40} placeholder="e.g. New laptop" value={form.name} onChange={(e) => update('name', e.target.value)} className={errors.name ? 'invalid' : ''} autoFocus />
          {errors.name && <small className="field-error">{errors.name}</small>}
        </label>
        <div className="field-row">
          <label className="field">
            <span className="field-label">Target amount</span>
            <div className={`amount-input amount-input-sm ${errors.target ? 'invalid' : ''}`}>
              <span>₹</span>
              <input type="number" min="1" step="any" placeholder="50000" value={form.target} onChange={(e) => update('target', e.target.value)} />
            </div>
            {errors.target && <small className="field-error">{errors.target}</small>}
          </label>
          <label className="field">
            <span className="field-label">Deadline <em>(optional)</em></span>
            <input type="date" value={form.deadline} min={todayISO()} onChange={(e) => update('deadline', e.target.value)} />
          </label>
        </div>
        <div className="field">
          <span className="field-label">Icon</span>
          <div className="icon-picker">
            {Object.entries(GOAL_ICONS).map(([key, PickIcon]) => (
              <button type="button" key={key} className={form.icon === key ? 'selected' : ''} onClick={() => update('icon', key)} aria-label={key}>
                <PickIcon size={18} />
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field-label">Colour</span>
          <div className="color-picker">
            {GOAL_COLORS.map((color) => (
              <button type="button" key={color} className={form.color === color ? 'selected' : ''} style={{ background: color }}
                onClick={() => update('color', color)} aria-label={`Colour ${color}`} />
            ))}
          </div>
        </div>

        {errors.form && <p className="form-error">{errors.form}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <LoaderCircle size={16} className="spin" />} {isEdit ? 'Save changes' : 'Create goal'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Add money to a goal, or take some out
function MoneyDialog({ goal, mode, onClose, onDone }) {
  const adding = mode === 'add';
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  useEscape(onClose);
  useEffect(() => inputRef.current?.focus(), []);

  const left = Math.max(0, goal.target - goal.saved);
  const chips = adding ? [500, 1000, 2000, left].filter((v, i, list) => v > 0 && list.indexOf(v) === i) : [500, 1000, goal.saved].filter((v, i, list) => v > 0 && v <= goal.saved && list.indexOf(v) === i);

  async function handleSubmit(e) {
    e.preventDefault();
    const value = Number(amount);
    if (!(value > 0)) return setError('Enter an amount');
    if (!adding && value > goal.saved) return setError(`You can take out at most ${formatINR(goal.saved)}`);
    setSaving(true);
    try {
      const updated = await api(`/goals/${goal._id}/contribute`, { method: 'POST', body: { amount: adding ? value : -value } });
      onDone(updated, goal);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal modal-md" role="dialog" aria-modal="true" aria-labelledby="money-title" onSubmit={handleSubmit} noValidate>
        <div className="modal-head">
          <h2 id="money-title">{adding ? `Add money to “${goal.name}”` : `Withdraw from “${goal.name}”`}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <p className="muted">
          Saved {formatINR(goal.saved)} of {formatINR(goal.target)}{adding && left > 0 ? ` · ${formatINR(left)} to go` : ''}
        </p>
        <div className={`amount-input ${error ? 'invalid' : ''}`}>
          <span>₹</span>
          <input ref={inputRef} type="number" min="1" step="any" placeholder="0" value={amount}
            onChange={(e) => { setAmount(e.target.value); setError(''); }} />
        </div>
        <div className="pill-select">
          {chips.map((value) => (
            <button type="button" key={value} onClick={() => { setAmount(String(value)); setError(''); }}>
              {value === left && adding ? `Complete it (${formatINR(value)})` : value === goal.saved && !adding ? `All (${formatINR(value)})` : formatINR(value)}
            </button>
          ))}
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className={`btn ${adding ? 'btn-primary' : 'btn-danger'}`} disabled={saving}>
            {saving && <LoaderCircle size={16} className="spin" />} {adding ? 'Add money' : 'Withdraw'}
          </button>
        </div>
      </form>
    </div>
  );
}

function useEscape(onClose) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
}

// A short burst of confetti when a goal is reached
function Confetti() {
  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#0ea5e9', '#f43f5e'];
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => (
        <span key={i} style={{
          '--x': `${Math.round((Math.random() - 0.5) * 320)}px`,
          '--y': `${Math.round(-60 - Math.random() * 160)}px`,
          '--r': `${Math.round(Math.random() * 720)}deg`,
          background: colors[i % colors.length],
          animationDelay: `${Math.random() * 0.15}s`,
        }} />
      ))}
    </div>
  );
}
