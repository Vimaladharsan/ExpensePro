// Formatting helpers for money, months and dates

const rupeeFormat = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

// 15000 -> "₹15,000"
export const formatINR = (amount) => rupeeFormat.format(amount || 0);

// 15000 -> "₹15k", 250000 -> "₹2.5L" (short form for chart axes)
export function formatCompact(amount) {
  const value = Math.abs(amount);
  const trim = (n) => n.toFixed(1).replace(/\.0$/, '');
  if (value >= 100_000) return `₹${trim(amount / 100_000)}L`;
  if (value >= 1000) return `₹${trim(amount / 1000)}k`;
  return `₹${amount}`;
}

const pad = (n) => String(n).padStart(2, '0');

// This month as "2026-10" and today as "2026-10-23" (local time)
export function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}
export function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const monthDate = (month) => {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year, m - 1, 1));
};

// shiftMonth("2026-10", -1) -> "2026-09"
export function shiftMonth(month, offset) {
  const date = monthDate(month);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

// "2026-10" -> "October 2026" / "Oct"
export const formatMonth = (month) =>
  monthDate(month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
export const shortMonth = (month) => monthDate(month).toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' });

// "2026-10-22T00:00:00.000Z" -> "22 Oct" (or "22 Oct 2026")
export const formatDate = (iso, withYear = false) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(withYear && { year: 'numeric' }),
    timeZone: 'UTC',
  });

export function daysInMonth(month) {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year, m, 0)).getUTCDate();
}

// How many days of the month have passed (all of them for past months, none for future ones)
export function daysPassed(month) {
  const now = currentMonth();
  if (month < now) return daysInMonth(month);
  if (month > now) return 0;
  return new Date().getDate();
}

// % change from previous to current, or null when there's nothing to compare with
export function percentChange(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}
