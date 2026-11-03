import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarDays, Printer } from 'lucide-react';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { categoryStyle } from '../constants.js';
import { CardHead, CategoryIcon, Skeleton } from '../components/ui.jsx';
import {
  currentMonth, daysInMonth, daysPassed, formatCompact, formatDate, formatINR, formatMonth, percentChange, shortMonth,
} from '../utils/format.js';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const axis = { tickLine: false, axisLine: false, tick: { fill: 'var(--muted)', fontSize: 12 } };

export default function Reports() {
  const { month, refreshKey, openTransaction } = useApp();
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      api(`/transactions/summary?month=${month}`),
      api(`/transactions?month=${month}&limit=1000`),
      api(`/transactions/category-trend?end=${month}&months=6`),
    ])
      .then(([summary, list, trend]) => {
        if (ignore) return;
        setData({ summary, transactions: list.items, trend });
        // Start with the day with the most spending selected
        const busiest = summary.daily.reduce((best, d) => (d.expense > best.expense ? d : best), { day: null, expense: 0 });
        setSelectedDay(busiest.day);
      })
      .catch((err) => !ignore && toast.error(err.message));
    return () => {
      ignore = true;
    };
  }, [month, refreshKey, toast]);

  const stats = useMemo(() => (data ? buildStats(data.transactions) : null), [data]);

  if (!data) {
    return <div className="page"><div className="card"><Skeleton height={140} /></div><div className="grid-2-1"><div className="card"><Skeleton height={320} /></div><div className="card"><Skeleton height={320} /></div></div></div>;
  }

  const { summary, transactions, trend } = data;
  const days = daysPassed(month);
  const change = percentChange(summary.expense, summary.previous.expense);
  const dayList = transactions.filter((t) => Number(t.date.slice(8, 10)) === selectedDay);

  return (
    <div className="page report">
      <div className="print-only report-print-head">
        <h1>ExpensePro: Monthly report</h1>
        <p>{formatMonth(month)} · {user.name} · Generated {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="page-head no-print">
        <div>
          <h2>Monthly report</h2>
          <p className="muted">{formatMonth(month)} · {summary.transactionCount} transactions</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost" onClick={() => window.print()}><Printer size={16} /> Print / Save as PDF</button>
        </div>
      </div>

      <div className="card statement">
        <Metric label="Income" value={formatINR(summary.income)} tone="good" />
        <Metric label="Expenses" value={formatINR(summary.expense)} tone="bad" />
        <Metric label="Net savings" value={formatINR(summary.balance)} tone={summary.balance >= 0 ? 'good' : 'bad'} />
        <Metric label="Savings rate" value={`${summary.savingsRate}%`} />
        <Metric label="Average spend per day" value={days ? formatINR(Math.round(summary.expense / days)) : '—'} />
        <Metric label="Spending vs last month" value={change === null ? '—' : `${change > 0 ? '+' : ''}${change}%`} tone={change === null ? '' : change > 0 ? 'bad' : 'good'} />
        <Metric label="Biggest expense" value={summary.biggestExpense ? formatINR(summary.biggestExpense.amount) : '—'}
          hint={summary.biggestExpense ? summary.biggestExpense.note || summary.biggestExpense.category : ''} />
        <Metric label="Busiest day" value={stats.busiestWeekday ? stats.busiestWeekday.name : '—'}
          hint={stats.busiestWeekday ? `${formatINR(stats.busiestWeekday.total)} spent on ${stats.busiestWeekday.name}s` : ''} />
      </div>

      <section className="grid-2-1">
        <div className="card">
          <CardHead title={<span className="title-with-icon"><CalendarDays size={17} /> Spending calendar</span>}
            subtitle="Darker days = more spending. Click a day to see what you spent." />
          <SpendingCalendar month={month} daily={summary.daily} selected={selectedDay} onSelect={setSelectedDay} />
        </div>
        <div className="card day-panel">
          <CardHead title={selectedDay ? formatDate(`${month}-${String(selectedDay).padStart(2, '0')}T00:00:00Z`, true) : 'Pick a day'}
            subtitle={selectedDay ? `${dayList.length} transaction${dayList.length === 1 ? '' : 's'}` : 'Click any day in the calendar'} />
          {selectedDay && dayList.length === 0 && <p className="muted small">Nothing recorded on this day.</p>}
          <ul className="recent-list">
            {dayList.map((t) => (
              <li key={t._id}>
                <button className="recent-row" onClick={() => openTransaction(t)}>
                  <CategoryIcon category={t.category} size={34} />
                  <span className="recent-text"><b>{t.note || t.category}</b><small className="muted">{t.category} · {t.paymentMethod}</small></span>
                  <span className={`amount ${t.type}`}>{t.type === 'income' ? '+' : '−'}{formatINR(t.amount)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="card">
        <CardHead title="Category trends" subtitle={`Spending per category, ${shortMonth(trend.series[0].month)}–${shortMonth(month)}`} />
        <CategoryTrend trend={trend} />
      </div>

      <section className="grid-3">
        <div className="card">
          <CardHead title="Payment methods" subtitle="How you paid for expenses" />
          <BarList rows={stats.payments} total={stats.expenseTotal} />
        </div>
        <div className="card">
          <CardHead title="Spending by weekday" subtitle="Total spent on each day of the week" />
          <BarList rows={stats.weekdays} total={stats.weekdayMax} relative />
        </div>
        <div className="card">
          <CardHead title="Top 5 expenses" />
          <ol className="top-list">
            {stats.top.map((t) => (
              <li key={t._id}>
                <CategoryIcon category={t.category} size={32} />
                <span className="recent-text"><b>{t.note || t.category}</b><small className="muted">{formatDate(t.date)} · {t.category}</small></span>
                <b className="amount expense">{formatINR(t.amount)}</b>
              </li>
            ))}
            {stats.top.length === 0 && <p className="muted small">No expenses this month.</p>}
          </ol>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, tone = '', hint }) {
  return (
    <div className="metric">
      <small className="muted">{label}</small>
      <b className={tone ? `text-${tone}` : ''}>{value}</b>
      {hint && <small className="muted metric-hint">{hint}</small>}
    </div>
  );
}

// Totals per payment method and weekday, and the 5 biggest expenses
function buildStats(transactions) {
  const expenses = transactions.filter((t) => t.type === 'expense');
  const expenseTotal = expenses.reduce((sum, t) => sum + t.amount, 0);

  const byPayment = {};
  for (const t of expenses) byPayment[t.paymentMethod] = (byPayment[t.paymentMethod] || 0) + t.amount;
  const payments = Object.entries(byPayment).map(([label, total]) => ({ label, total })).sort((a, b) => b.total - a.total);

  const byWeekday = Array(7).fill(0);
  for (const t of expenses) byWeekday[(new Date(t.date).getUTCDay() + 6) % 7] += t.amount; // Monday first
  const weekdays = WEEKDAYS.map((label, i) => ({ label, total: byWeekday[i] }));
  const weekdayMax = Math.max(...byWeekday, 0);
  const busiestIndex = byWeekday.indexOf(weekdayMax);
  const busiestWeekday = weekdayMax > 0
    ? { name: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][busiestIndex], total: weekdayMax }
    : null;

  const top = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5);
  return { expenseTotal, payments, weekdays, weekdayMax, busiestWeekday, top };
}

// Horizontal bars with labels and amounts
function BarList({ rows, total, relative = false }) {
  if (!total) return <p className="muted small">No expenses this month.</p>;
  return (
    <ul className="bar-list">
      {rows.map((row) => {
        const percent = Math.round((row.total / total) * 100);
        return (
          <li key={row.label}>
            <div className="bar-list-top">
              <span>{row.label}</span>
              <span><b>{formatINR(row.total)}</b>{!relative && <span className="muted small"> · {percent}%</span>}</span>
            </div>
            <div className="progress"><div className="progress-fill bar-fill" style={{ width: `${percent}%` }} /></div>
          </li>
        );
      })}
    </ul>
  );
}

// Month grid (Monday first); each day is coloured by how much was spent
function SpendingCalendar({ month, daily, selected, onSelect }) {
  const [year, m] = month.split('-').map(Number);
  const offset = (new Date(Date.UTC(year, m - 1, 1)).getUTCDay() + 6) % 7;
  const max = Math.max(...daily.map((d) => d.expense), 0);
  const today = month === currentMonth() ? new Date().getDate() : null;
  const futureFrom = month > currentMonth() ? 1 : month === currentMonth() ? today + 1 : daysInMonth(month) + 1;
  const level = (value) => (value <= 0 || !max ? 0 : Math.max(1, Math.ceil((value / max) * 4)));

  return (
    <div className="calendar">
      <div className="calendar-grid">
        {WEEKDAYS.map((d) => <span key={d} className="calendar-weekday">{d}</span>)}
        {Array.from({ length: offset }, (_, i) => <span key={`blank-${i}`} />)}
        {daily.map((d) => (
          <button
            key={d.day}
            className={`calendar-day level-${level(d.expense)} ${selected === d.day ? 'selected' : ''} ${today === d.day ? 'today' : ''} ${d.day >= futureFrom ? 'future' : ''}`}
            onClick={() => onSelect(d.day)}
            title={`${d.day} ${shortMonth(month)}: ${formatINR(d.expense)} spent`}
          >
            <span className="calendar-date">{d.day}</span>
            {d.expense > 0 && <span className="calendar-amount">{formatCompact(Math.round(d.expense))}</span>}
          </button>
        ))}
      </div>
      <div className="calendar-legend">
        <span className="muted small">Less</span>
        {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`legend-box level-${l}`} />)}
        <span className="muted small">More</span>
      </div>
    </div>
  );
}

// Stacked bars: each month split by category (top 6 categories, the rest grouped as "Others")
function CategoryTrend({ trend }) {
  const top = trend.categories.slice(0, 6);
  const rest = trend.categories.slice(6);
  const rows = trend.series.map((point) => {
    const row = { label: shortMonth(point.month), month: point.month };
    for (const c of top) row[c] = point[c];
    if (rest.length) row.Others = rest.reduce((sum, c) => sum + point[c], 0);
    return row;
  });
  const keys = rest.length ? [...top, 'Others'] : top;
  if (keys.length === 0) return <p className="muted small">No spending in these months.</p>;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={rows} margin={{ top: 8, right: 4, left: -6, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" strokeDasharray="4 4" />
        <XAxis dataKey="label" {...axis} />
        <YAxis tickFormatter={formatCompact} width={56} {...axis} />
        <Tooltip
          cursor={{ fill: 'var(--hover)' }}
          formatter={(value, name) => [formatINR(value), name]}
          labelFormatter={(label, payload) => (payload?.[0] ? formatMonth(payload[0].payload.month) : label)}
          contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 13 }}
          labelStyle={{ fontWeight: 600, color: 'var(--text)' }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
        {keys.map((key, i) => (
          <Bar key={key} dataKey={key} stackId="spend" fill={key === 'Others' ? '#94a3b8' : categoryStyle(key).color}
            radius={i === keys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]} maxBarSize={44} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
