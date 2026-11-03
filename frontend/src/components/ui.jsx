// Small building blocks used across the pages
import { useEffect, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { categoryStyle } from '../constants.js';

// Animates a number from its previous value to the new one ("count-up" effect)
export function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setValue(target);
      from.current = target;
      return undefined;
    }
    const start = performance.now();
    const begin = from.current;
    let frame;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setValue(progress < 1 ? Math.round(begin + (target - begin) * eased) : target);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      from.current = target;
    };
  }, [target, duration]);

  return value;
}

// Coloured rounded icon for a category
export function CategoryIcon({ category, size = 40 }) {
  const { icon: Icon, color } = categoryStyle(category);
  return (
    <span className="cat-icon" style={{ '--cat': color, width: size, height: size }}>
      <Icon size={Math.round(size * 0.46)} />
    </span>
  );
}

// Card header: title, optional subtitle, optional action on the right
export function CardHead({ title, subtitle, action }) {
  return (
    <div className="card-head">
      <div>
        <h3>{title}</h3>
        {subtitle && <p className="muted small">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// One of the 4 numbers at the top of the dashboard (counts up), with the change from last month
export function StatCard({ label, value, format, icon: Icon, tone, change, goodWhenUp = true, hint }) {
  const shown = useCountUp(value);
  const hasChange = change !== null && change !== undefined;
  const mood = !hasChange || change === 0 ? 'neutral' : change > 0 === goodWhenUp ? 'good' : 'bad';
  return (
    <div className={`card stat stat-${tone}`}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className="stat-icon"><Icon size={18} /></span>
      </div>
      <div className="stat-value">{format(shown)}</div>
      <div className="stat-foot">
        {hasChange && (
          <span className={`delta delta-${mood}`}>
            {change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(change)}%
          </span>
        )}
        <span className="muted small">{hint}</span>
      </div>
    </div>
  );
}

// How much of a budget is used: { percent, status: 'ok' | 'warning' | 'over' }
export function budgetStatus(spent, amount) {
  const percent = amount > 0 ? Math.round((spent / amount) * 100) : 0;
  return { percent, status: percent >= 100 ? 'over' : percent >= 80 ? 'warning' : 'ok' };
}

export function ProgressBar({ percent, status }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className={`progress-fill ${status}`} style={{ width: `${Math.min(percent, 100)}%` }} />
    </div>
  );
}

// Circular progress (budgets use the status colour, goals pass their own colour)
export function ProgressRing({ percent, status, color, size = 132, stroke = 12, label = 'used' }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(percent, 100) / 100);
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} className="ring-track" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={`ring-fill ${status || ''}`}
          style={color ? { stroke: color } : undefined}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-label">
        <b>{percent}%</b>
        <small>{label}</small>
      </div>
    </div>
  );
}

// Friendly message when there's nothing to show
export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="empty">
      <span className="empty-icon"><Icon size={26} /></span>
      <b>{title}</b>
      {text && <p className="muted small">{text}</p>}
      {action}
    </div>
  );
}

// Grey placeholder blocks shown while data loads
export function Skeleton({ height = 16, width = '100%', radius = 8 }) {
  return <span className="skeleton" style={{ height, width, borderRadius: radius }} />;
}
