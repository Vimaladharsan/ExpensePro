// Small helpers used by the routes

// An error with an HTTP status code. The error handler turns it into a JSON reply.
export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

// Throws a 400 error unless month looks like "2026-10"
export function assertMonth(month) {
  if (!MONTH_PATTERN.test(String(month))) throw httpError(400, 'Month must look like 2026-10');
}

// "2026-10" -> the first moment of October and the first moment of November (dates are stored in UTC)
export function monthRange(month) {
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
}

// shiftMonth("2026-10", -1) -> "2026-09"
export function shiftMonth(month, offset) {
  const date = new Date(`${month}-01T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

export function daysInMonth(month) {
  const { start, end } = monthRange(month);
  return Math.round((end - start) / 86_400_000);
}

// Makes user text safe to use inside a search pattern
export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
