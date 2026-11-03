// The 3 dashboard charts (made with Recharts)
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ChartPie } from 'lucide-react';
import { categoryStyle } from '../constants.js';
import { formatCompact, formatINR, formatMonth, shortMonth } from '../utils/format.js';
import { EmptyState } from './ui.jsx';

const axis = { tickLine: false, axisLine: false, tick: { fill: 'var(--muted)', fontSize: 12 } };

// The box that appears when you hover a chart
function ChartTooltip({ active, payload, label, labelFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{labelFormatter ? labelFormatter(label, payload) : label}</p>
      {payload.map((item) => (
        <p key={item.name} className="chart-tooltip-row">
          <span className="dot" style={{ background: item.payload?.fill || item.color }} />
          {item.name}
          <b>{formatINR(item.value)}</b>
        </p>
      ))}
    </div>
  );
}

// Income vs expense bars for the last few months
export function TrendChart({ data }) {
  const rows = data.map((point) => ({ ...point, label: shortMonth(point.month) }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={rows} barGap={6} margin={{ top: 8, right: 4, left: -6, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" strokeDasharray="4 4" />
        <XAxis dataKey="label" {...axis} />
        <YAxis tickFormatter={formatCompact} width={56} {...axis} />
        <Tooltip
          cursor={{ fill: 'var(--hover)' }}
          content={<ChartTooltip labelFormatter={(label, payload) => formatMonth(payload[0].payload.month)} />}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
        <Bar dataKey="income" name="Income" fill="var(--income)" radius={[6, 6, 0, 0]} maxBarSize={26} />
        <Bar dataKey="expense" name="Expenses" fill="var(--expense)" radius={[6, 6, 0, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Donut of spending per category, with the total in the middle and a legend beside it
export function CategoryDonut({ data, total }) {
  if (!data.length) {
    return <EmptyState icon={ChartPie} title="No spending yet" text="Expenses you add this month will show up here." />;
  }
  return (
    <div className="donut-wrap">
      <div className="donut">
        <ResponsiveContainer width="100%" height={210}>
          <PieChart>
            <Pie data={data} dataKey="total" nameKey="category" innerRadius={66} outerRadius={94} paddingAngle={2} stroke="none">
              {data.map((item) => (
                <Cell key={item.category} fill={categoryStyle(item.category).color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <small>Total spent</small>
          <b>{formatINR(total)}</b>
        </div>
      </div>
      <ul className="legend-list">
        {data.slice(0, 6).map((item) => (
          <li key={item.category}>
            <span className="dot" style={{ background: categoryStyle(item.category).color }} />
            <span className="legend-name">{item.category}</span>
            <span className="muted small">{Math.round((item.total / total) * 100)}%</span>
            <b>{formatINR(item.total)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Spending on each day of the month
export function DailyChart({ data, month }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -6, bottom: 0 }}>
        <defs>
          <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--expense)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--expense)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--grid)" strokeDasharray="4 4" />
        <XAxis dataKey="day" interval="preserveStartEnd" minTickGap={18} {...axis} />
        <YAxis tickFormatter={formatCompact} width={56} {...axis} />
        <Tooltip content={<ChartTooltip labelFormatter={(day) => `${day} ${shortMonth(month)}`} />} />
        <Area type="monotone" dataKey="expense" name="Spent" stroke="var(--expense)" strokeWidth={2.5} fill="url(#spendFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
