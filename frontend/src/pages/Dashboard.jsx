import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Flag, Flame, Gauge, Inbox, Info, PiggyBank, Plus, Receipt, Sparkles, Target, TrendingDown, TrendingUp,
  TriangleAlert, Wallet,
} from 'lucide-react';
import { GOAL_ICONS } from '../constants.js';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.js';
import { useToast } from '../context/ToastContext.jsx';
import { CategoryDonut, DailyChart, TrendChart } from '../components/Charts.jsx';
import {
  CardHead, CategoryIcon, EmptyState, ProgressBar, ProgressRing, Skeleton, StatCard, budgetStatus,
} from '../components/ui.jsx';
import {
  currentMonth, daysInMonth, daysPassed, formatDate, formatINR, formatMonth, percentChange,
} from '../utils/format.js';

export default function Dashboard() {
  const { user } = useAuth();
  const { month, refreshKey, openTransaction } = useApp();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load everything the dashboard needs for the selected month, all at once
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    Promise.all([
      api(`/transactions/summary?month=${month}`),
      api(`/transactions/trend?end=${month}&months=6`),
      api(`/budgets?month=${month}`),
      api(`/transactions?month=${month}&limit=6`),
      api('/goals'),
    ])
      .then(([summary, trend, budgets, recent, goals]) => {
        if (!ignore) setData({ summary, trend, budgets, recent: recent.items, goals });
      })
      .catch((err) => !ignore && toast.error(err.message))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [month, refreshKey, toast]);

  const firstName = user.name.split(' ')[0];

  if (!data) return <DashboardSkeleton />;
  const { summary, trend, budgets, recent, goals } = data;
  const previousBalance = summary.previous.income - summary.previous.expense;
  // For the current month, stop the daily chart at today instead of showing empty future days
  const daily = month === currentMonth() ? summary.daily.slice(0, new Date().getDate()) : summary.daily;

  return (
    <div className={`page ${loading ? 'is-loading' : ''}`}>
      <div className="page-head">
        <div>
          <h2 className="greeting">{greeting()}, {firstName} 👋</h2>
          <p className="muted">Here’s your money summary for {formatMonth(month)}.</p>
        </div>
      </div>

      <section className="stats-grid">
        <StatCard label="Income" value={summary.income} format={formatINR} icon={TrendingUp} tone="income"
          change={percentChange(summary.income, summary.previous.income)} hint="vs last month" />
        <StatCard label="Expenses" value={summary.expense} format={formatINR} icon={TrendingDown} tone="expense"
          change={percentChange(summary.expense, summary.previous.expense)} goodWhenUp={false} hint="vs last month" />
        <StatCard label="Balance" value={summary.balance} format={formatINR} icon={Wallet} tone="balance"
          change={previousBalance > 0 ? percentChange(summary.balance, previousBalance) : null} hint="income − expenses" />
        <StatCard label="Savings rate" value={summary.savingsRate} format={(v) => `${v}%`} icon={PiggyBank} tone="savings"
          hint={`${summary.transactionCount} transactions this month`} />
      </section>

      <section className="grid-2-1">
        <div className="card">
          <CardHead title="Income vs expenses" subtitle="Last 6 months" />
          <TrendChart data={trend} />
        </div>
        <div className="card">
          <CardHead title="Spending by category" subtitle={formatMonth(month)} />
          <CategoryDonut data={summary.byCategory} total={summary.expense} />
        </div>
      </section>

      <section className="grid-2-1">
        <div className="card">
          <CardHead title="Daily spending" subtitle={`How much you spent each day in ${formatMonth(month)}`} />
          <DailyChart data={daily} month={month} />
        </div>
        <div className="card">
          <CardHead title="Budget" subtitle={formatMonth(month)} action={<Link className="link" to="/budgets">Manage <ArrowRight size={14} /></Link>} />
          <BudgetOverview budgets={budgets} month={month} />
        </div>
      </section>

      <section className="grid-2-1">
        <div className="card">
          <CardHead title="Recent transactions" action={<Link className="link" to="/transactions">View all <ArrowRight size={14} /></Link>} />
          {recent.length === 0 ? (
            <EmptyState icon={Inbox} title="No transactions yet" text="Add your first income or expense for this month."
              action={<button className="btn btn-primary btn-sm" onClick={() => openTransaction()}><Plus size={16} /> Add transaction</button>} />
          ) : (
            <ul className="recent-list">
              {recent.map((t) => (
                <li key={t._id}>
                  <button className="recent-row" onClick={() => openTransaction(t)} title="Edit">
                    <CategoryIcon category={t.category} size={38} />
                    <span className="recent-text">
                      <b>{t.note || t.category}</b>
                      <small className="muted">{t.category} · {formatDate(t.date)} · {t.paymentMethod}</small>
                    </span>
                    <span className={`amount ${t.type}`}>{t.type === 'income' ? '+' : '−'}{formatINR(t.amount)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card insights-card">
          <CardHead title={<span className="title-with-icon"><Sparkles size={17} /> Smart insights</span>} />
          <ul className="insights">
            {buildInsights(summary, month).map((item, i) => (
              <li key={i} className={`insight insight-${item.tone}`}>
                <span className="insight-icon"><item.icon size={16} /></span>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="card">
        <CardHead title="Savings goals" action={<Link className="link" to="/goals">View all <ArrowRight size={14} /></Link>} />
        {goals.length === 0 ? (
          <EmptyState icon={Flag} title="No savings goals yet" text="Save towards a laptop, a trip or an emergency fund."
            action={<Link className="btn btn-primary btn-sm" to="/goals"><Plus size={16} /> Create a goal</Link>} />
        ) : (
          <div className="mini-goals">
            {goals.slice(0, 4).map((goal) => {
              const Icon = GOAL_ICONS[goal.icon] || GOAL_ICONS.piggy;
              const percent = Math.min(100, Math.round((goal.saved / goal.target) * 100));
              return (
                <Link to="/goals" key={goal._id} className="mini-goal" style={{ '--goal': goal.color }}>
                  <div className="mini-goal-top">
                    <span className="goal-icon"><Icon size={17} /></span>
                    <b>{goal.name}</b>
                    <span className="mini-goal-percent">{percent}%</span>
                  </div>
                  <div className="progress"><div className="progress-fill goal-fill" style={{ width: `${percent}%` }} /></div>
                  <small className="muted">{formatINR(goal.saved)} of {formatINR(goal.target)}</small>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Overall budget ring + the 3 category budgets closest to their limit
function BudgetOverview({ budgets, month }) {
  if (!budgets.overall && budgets.categories.length === 0) {
    return (
      <EmptyState icon={Target} title="No budget for this month" text="Set a spending limit to track it here."
        action={<Link className="btn btn-primary btn-sm" to="/budgets">Set a budget</Link>} />
    );
  }

  const daysLeft = month === currentMonth() ? daysInMonth(month) - new Date().getDate() + 1 : month > currentMonth() ? daysInMonth(month) : 0;
  return (
    <div className="budget-overview">
      {budgets.overall && <OverallBudget overall={budgets.overall} daysLeft={daysLeft} />}
      <ul className="mini-budgets">
        {budgets.categories.slice(0, 3).map((b) => {
          const { percent, status } = budgetStatus(b.spent, b.amount);
          return (
            <li key={b._id}>
              <div className="mini-budget-top">
                <span>{b.category}</span>
                <span className="muted small">{formatINR(b.spent)} / {formatINR(b.amount)}</span>
              </div>
              <ProgressBar percent={percent} status={status} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function OverallBudget({ overall, daysLeft }) {
  const { percent, status } = budgetStatus(overall.spent, overall.amount);
  const left = overall.amount - overall.spent;
  return (
    <div className="overall-budget">
      <ProgressRing percent={percent} status={status} size={116} stroke={11} />
      <div className="overall-text">
        <small className="muted">Spent</small>
        <b>{formatINR(overall.spent)} <span className="muted">of {formatINR(overall.amount)}</span></b>
        <span className={`budget-note ${status}`}>
          {left >= 0 ? `${formatINR(left)} left` : `${formatINR(-left)} over budget`}
        </span>
        {left > 0 && daysLeft > 0 && (
          <small className="muted">≈ {formatINR(Math.floor(left / daysLeft))}/day for {daysLeft} days</small>
        )}
      </div>
    </div>
  );
}

// Short sentences that explain the numbers
function buildInsights(summary, month) {
  const { income, expense, previous, byCategory, savingsRate, biggestExpense } = summary;
  if (!income && !expense) {
    return [{ icon: Info, tone: 'info', text: 'No transactions this month yet. Add one to see insights here.' }];
  }

  const list = [];
  const top = byCategory[0];
  if (top) {
    list.push({
      icon: Flame,
      tone: 'warning',
      text: <>Your top spending is <b>{top.category}</b>: <b>{formatINR(top.total)}</b> ({Math.round((top.total / expense) * 100)}% of expenses).</>,
    });
  }

  const change = percentChange(expense, previous.expense);
  if (change !== null && change !== 0) {
    list.push(
      change > 0
        ? { icon: TrendingUp, tone: 'bad', text: <>You’ve spent <b>{change}% more</b> than last month.</> }
        : { icon: TrendingDown, tone: 'good', text: <>You’ve spent <b>{Math.abs(change)}% less</b> than last month. Nice!</> }
    );
  }

  if (income > 0) {
    if (savingsRate >= 20) list.push({ icon: PiggyBank, tone: 'good', text: <>You saved <b>{savingsRate}%</b> of your income. Great job!</> });
    else if (savingsRate >= 0) list.push({ icon: PiggyBank, tone: 'warning', text: <>You saved <b>{savingsRate}%</b> of your income. Try to reach 20%.</> });
    else list.push({ icon: TriangleAlert, tone: 'bad', text: <>You spent <b>{formatINR(expense - income)}</b> more than you earned.</> });
  }

  const days = daysPassed(month);
  if (days > 0 && expense > 0) {
    list.push({ icon: Gauge, tone: 'info', text: <>On average you spend <b>{formatINR(Math.round(expense / days))}</b> per day.</> });
  }

  if (biggestExpense) {
    list.push({
      icon: Receipt,
      tone: 'info',
      text: <>Biggest expense: <b>{formatINR(biggestExpense.amount)}</b> on {biggestExpense.category}{biggestExpense.note ? ` (${biggestExpense.note})` : ''}.</>,
    });
  }
  return list.slice(0, 5);
}

function DashboardSkeleton() {
  return (
    <div className="page">
      <div className="page-head"><div><Skeleton height={28} width={260} /><Skeleton height={16} width={200} /></div></div>
      <section className="stats-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card stat"><Skeleton width="40%" /><Skeleton height={30} width="70%" /><Skeleton width="50%" /></div>
        ))}
      </section>
      <section className="grid-2-1">
        <div className="card"><Skeleton height={290} /></div>
        <div className="card"><Skeleton height={290} /></div>
      </section>
    </div>
  );
}
