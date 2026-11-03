import { useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, LoaderCircle, SlidersHorizontal, Sparkles } from 'lucide-react';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import { parseQuickAdd } from '../utils/quickParse.js';
import { formatDate, formatINR } from '../utils/format.js';
import { CategoryIcon } from './ui.jsx';

const EXAMPLES = ['250 pizza yesterday upi', '1.2k shoes amazon card', 'salary 25000', 'uber 180 cash', '599 wifi bill 5 oct'];

// True when the user is typing in a form field (so keyboard shortcuts don't fire)
export const isTypingIn = (target) => Boolean(target.closest?.('input, textarea, select, [contenteditable="true"]'));

// Top-bar box: type a sentence, see what it understood, press Enter to save
export default function QuickAdd({ onSaved, onOpenFull }) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  const parsed = useMemo(() => (text.trim() ? parseQuickAdd(text) : null), [text]);

  // Press "/" anywhere to jump to Quick Add
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !isTypingIn(e.target) && !document.querySelector('.overlay')) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function save() {
    if (!parsed || saving) return;
    setSaving(true);
    try {
      const saved = await api('/transactions', { method: 'POST', body: parsed });
      setText('');
      inputRef.current?.blur();
      onSaved(saved);
    } catch (err) {
      toast.error(err.message);
    }
    setSaving(false);
  }

  function handleKey(e) {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') {
      setText('');
      e.currentTarget.blur();
    }
  }

  // Clicking inside the dropdown shouldn't take focus away from the input
  const keepFocus = (e) => e.preventDefault();

  return (
    <div className={`quick-add ${open ? 'is-open' : ''}`}>
      <Sparkles size={16} className="quick-add-icon" />
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKey}
        placeholder="Quick add: 250 pizza yesterday upi"
        aria-label="Quick add a transaction"
      />
      {!open && <kbd className="kbd">/</kbd>}

      {open && (
        <div className="quick-panel" onMouseDown={keepFocus}>
          {!text.trim() && (
            <>
              <p className="quick-panel-title">Describe a transaction in your own words</p>
              <div className="quick-examples">
                {EXAMPLES.map((example) => (
                  <button key={example} onClick={() => setText(example)}>{example}</button>
                ))}
              </div>
            </>
          )}

          {text.trim() && !parsed && <p className="quick-panel-title">Add an amount, e.g. “250 lunch”</p>}

          {parsed && (
            <>
              <div className="quick-preview">
                <CategoryIcon category={parsed.category} size={42} />
                <div className="quick-preview-text">
                  <b>{parsed.note || parsed.category}</b>
                  <small className="muted">
                    {parsed.category} · {formatDate(`${parsed.date}T00:00:00Z`)} · {parsed.paymentMethod}
                  </small>
                </div>
                <span className={`amount ${parsed.type}`}>
                  {parsed.type === 'income' ? '+' : '−'}{formatINR(parsed.amount)}
                </span>
              </div>
              <div className="quick-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => { onOpenFull(parsed); setText(''); inputRef.current?.blur(); }}>
                  <SlidersHorizontal size={14} /> Edit details
                </button>
                <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
                  {saving ? <LoaderCircle size={14} className="spin" /> : <CornerDownLeft size={14} />} Save
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
