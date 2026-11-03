import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Sparkles, TrendingDown, TrendingUp, X } from 'lucide-react';
import { api } from '../api.js';
import { CATEGORIES, PAYMENT_METHODS, categoryStyle } from '../constants.js';
import { todayISO } from '../utils/format.js';
import { parseQuickAdd } from '../utils/quickParse.js';

const emptyForm = () => ({ type: 'expense', amount: '', category: '', date: todayISO(), paymentMethod: 'UPI', note: '' });
const toForm = (t) => ({ ...t, amount: String(t.amount), date: t.date.slice(0, 10), note: t.note || '' });

// Pop-up form to add a new transaction, or edit one when "transaction" is given.
// "initial" pre-fills a new transaction (used by Quick Add's "Edit details").
export default function TransactionModal({ transaction, initial, onClose, onSaved }) {
  const isEdit = Boolean(transaction);
  const [form, setForm] = useState(() => {
    if (isEdit) {
      const { type, amount, category, date, paymentMethod, note } = transaction;
      return toForm({ type, amount, category, date, paymentMethod, note });
    }
    return initial ? toForm({ ...emptyForm(), ...initial }) : emptyForm();
  });
  const [describe, setDescribe] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const amountRef = useRef(null);

  // Focus the amount box, and close on the Escape key
  useEffect(() => {
    amountRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // "Describe it" box: fill every field from a sentence like "250 pizza yesterday upi"
  function handleDescribe(value) {
    setDescribe(value);
    const parsed = value.trim() ? parseQuickAdd(value) : null;
    if (parsed) {
      setForm(toForm(parsed));
      setErrors({});
    }
  }

  function update(field, value) {
    // Switching income/expense clears the category, because the list of categories changes
    setForm((f) => ({ ...f, [field]: value, ...(field === 'type' && { category: '' }) }));
    setErrors((e) => ({ ...e, [field]: undefined, form: undefined }));
  }

  // Form validation (the backend checks everything again)
  function validate() {
    const found = {};
    const amount = Number(form.amount);
    if (!form.amount || !Number.isFinite(amount) || amount < 1) found.amount = 'Enter an amount of at least ₹1';
    else if (amount > 10_000_000) found.amount = 'That amount is too large';
    if (!form.category) found.category = 'Choose a category';
    if (!form.date) found.date = 'Choose a date';
    if (form.note.length > 120) found.note = 'Keep the note under 120 characters';
    return found;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const body = { ...form, amount: Number(form.amount), note: form.note.trim() };
      const saved = isEdit
        ? await api(`/transactions/${transaction._id}`, { method: 'PUT', body })
        : await api('/transactions', { method: 'POST', body });
      onSaved(saved, isEdit);
    } catch (err) {
      setErrors({ ...err.fields, form: err.message });
      setSaving(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="tx-title" onSubmit={handleSubmit} noValidate>
        <div className="modal-head">
          <h2 id="tx-title">{isEdit ? 'Edit transaction' : 'Add transaction'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {!isEdit && (
          <label className="describe-box">
            <Sparkles size={16} />
            <input
              type="text"
              placeholder="Describe it: “250 pizza yesterday upi”"
              value={describe}
              onChange={(e) => handleDescribe(e.target.value)}
              aria-label="Describe the transaction in words"
            />
          </label>
        )}

        <div className="segmented" role="group" aria-label="Type">
          <button type="button" className={form.type === 'expense' ? 'active expense' : ''} onClick={() => update('type', 'expense')}>
            <TrendingDown size={16} /> Expense
          </button>
          <button type="button" className={form.type === 'income' ? 'active income' : ''} onClick={() => update('type', 'income')}>
            <TrendingUp size={16} /> Income
          </button>
        </div>

        <label className="field">
          <span className="field-label">Amount</span>
          <div className={`amount-input ${errors.amount ? 'invalid' : ''}`}>
            <span>₹</span>
            <input
              ref={amountRef}
              type="number"
              inputMode="decimal"
              min="1"
              step="any"
              placeholder="0"
              value={form.amount}
              onChange={(e) => update('amount', e.target.value)}
            />
          </div>
          {errors.amount && <small className="field-error">{errors.amount}</small>}
        </label>

        <div className="field">
          <span className="field-label">Category</span>
          <div className="chip-grid">
            {CATEGORIES[form.type].map((name) => {
              const { icon: Icon, color } = categoryStyle(name);
              return (
                <button
                  type="button"
                  key={name}
                  className={`chip ${form.category === name ? 'selected' : ''}`}
                  style={{ '--chip': color }}
                  onClick={() => update('category', name)}
                >
                  <Icon size={15} /> {name}
                </button>
              );
            })}
          </div>
          {errors.category && <small className="field-error">{errors.category}</small>}
        </div>

        <div className="field-row">
          <label className="field">
            <span className="field-label">Date</span>
            <input
              type="date"
              className={errors.date ? 'invalid' : ''}
              value={form.date}
              onChange={(e) => update('date', e.target.value)}
            />
            {errors.date && <small className="field-error">{errors.date}</small>}
          </label>
          <div className="field">
            <span className="field-label">Paid with</span>
            <div className="pill-select">
              {PAYMENT_METHODS.map((method) => (
                <button
                  type="button"
                  key={method}
                  className={form.paymentMethod === method ? 'selected' : ''}
                  onClick={() => update('paymentMethod', method)}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="field">
          <span className="field-label">Note <em>(optional)</em></span>
          <input
            type="text"
            maxLength={120}
            placeholder="e.g. Lunch with friends"
            value={form.note}
            onChange={(e) => update('note', e.target.value)}
          />
          {errors.note && <small className="field-error">{errors.note}</small>}
        </label>

        {errors.form && <p className="form-error">{errors.form}</p>}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <LoaderCircle size={16} className="spin" />}
            {isEdit ? 'Save changes' : 'Add transaction'}
          </button>
        </div>
      </form>
    </div>
  );
}
