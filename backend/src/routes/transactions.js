import express from 'express';
import Transaction from '../models/Transaction.js';
import { assertMonth, daysInMonth, escapeRegex, httpError, monthRange, shiftMonth } from '../utils.js';

// All routes here are behind requireAuth (see server.js), so req.user is the logged-in user
const router = express.Router();

const SORTS = {
  date_desc: { date: -1, createdAt: -1 },
  date_asc: { date: 1, createdAt: 1 },
  amount_desc: { amount: -1, date: -1 },
  amount_asc: { amount: 1, date: -1 },
};

// Builds the MongoDB filter from ?month=2026-10&type=expense&category=Food&search=pizza
function buildFilter(req) {
  const filter = { user: req.user._id };
  const { month, type, category, search } = req.query;

  if (month && month !== 'all') {
    assertMonth(month);
    const { start, end } = monthRange(month);
    filter.date = { $gte: start, $lt: end };
  }
  if (type === 'income' || type === 'expense') filter.type = type;
  if (category) filter.category = String(category);
  if (search && String(search).trim()) {
    const pattern = new RegExp(escapeRegex(String(search).trim()), 'i');
    filter.$or = [{ note: pattern }, { category: pattern }, { paymentMethod: pattern }];
  }
  return filter;
}

// Only these fields can come from the request; "user" always comes from the login token
function transactionFields(body) {
  const amount = Number(body.amount);
  if (body.amount === undefined || body.amount === '' || !Number.isFinite(amount)) {
    throw httpError(400, 'Amount must be a number');
  }
  if (!body.date || Number.isNaN(new Date(body.date).getTime())) throw httpError(400, 'Choose a valid date');

  const text = (value) => (typeof value === 'string' ? value : undefined);
  return {
    type: text(body.type),
    amount: Math.round(amount * 100) / 100,
    category: text(body.category),
    date: body.date,
    paymentMethod: text(body.paymentMethod) || 'UPI',
    note: text(body.note) || '',
  };
}

// Total income and expense between two dates (MongoDB aggregation)
async function totalsBetween(user, start, end) {
  const rows = await Transaction.aggregate([
    { $match: { user, date: { $gte: start, $lt: end } } },
    { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  const get = (type) => rows.find((row) => row._id === type);
  return {
    income: get('income')?.total || 0,
    expense: get('expense')?.total || 0,
    count: (get('income')?.count || 0) + (get('expense')?.count || 0),
  };
}

// GET /api/transactions?month=2026-10&type=&category=&search=&sort=date_desc&page=1&limit=10
router.get('/', async (req, res) => {
  const filter = buildFilter(req);
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit) || 10));
  const sort = SORTS[req.query.sort] || SORTS.date_desc;

  const [items, total] = await Promise.all([
    Transaction.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
    Transaction.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

// GET /api/transactions/summary?month=2026-10
// Totals, savings rate, last month's totals, spending per category, spending per day, biggest expense
router.get('/summary', async (req, res) => {
  const { month } = req.query;
  assertMonth(month);
  const user = req.user._id;
  const { start, end } = monthRange(month);
  const previous = monthRange(shiftMonth(month, -1));
  const inMonth = { user, date: { $gte: start, $lt: end } };

  const [totals, previousTotals, byCategory, perDay, biggest] = await Promise.all([
    totalsBetween(user, start, end),
    totalsBetween(user, previous.start, previous.end),
    Transaction.aggregate([
      { $match: { ...inMonth, type: 'expense' } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    Transaction.aggregate([
      { $match: inMonth },
      { $group: { _id: { day: { $dayOfMonth: '$date' }, type: '$type' }, total: { $sum: '$amount' } } },
    ]),
    Transaction.findOne({ ...inMonth, type: 'expense' }).sort({ amount: -1 }),
  ]);

  // One entry for every day of the month, so the chart has no gaps
  const daily = Array.from({ length: daysInMonth(month) }, (_, i) => ({ day: i + 1, income: 0, expense: 0 }));
  for (const row of perDay) daily[row._id.day - 1][row._id.type] = row.total;

  const { income, expense, count } = totals;
  res.json({
    month,
    income,
    expense,
    balance: income - expense,
    savingsRate: income > 0 ? Math.round(((income - expense) / income) * 100) : 0,
    transactionCount: count,
    previous: { income: previousTotals.income, expense: previousTotals.expense },
    byCategory: byCategory.map((row) => ({ category: row._id, total: row.total, count: row.count })),
    daily,
    biggestExpense: biggest,
  });
});

// GET /api/transactions/trend?end=2026-10&months=6  -> income and expense for each of the last N months
router.get('/trend', async (req, res) => {
  const endMonth = req.query.end;
  assertMonth(endMonth);
  const months = Math.min(12, Math.max(2, parseInt(req.query.months) || 6));
  const firstMonth = shiftMonth(endMonth, -(months - 1));

  const rows = await Transaction.aggregate([
    {
      $match: {
        user: req.user._id,
        date: { $gte: monthRange(firstMonth).start, $lt: monthRange(endMonth).end },
      },
    },
    {
      $group: {
        _id: { month: { $dateToString: { format: '%Y-%m', date: '$date' } }, type: '$type' },
        total: { $sum: '$amount' },
      },
    },
  ]);

  const series = Array.from({ length: months }, (_, i) => ({ month: shiftMonth(firstMonth, i), income: 0, expense: 0 }));
  for (const row of rows) {
    const point = series.find((p) => p.month === row._id.month);
    if (point) point[row._id.type] = row.total;
  }
  res.json(series);
});

// GET /api/transactions/category-trend?end=2026-10&months=6
// Spending per category for each of the last N months (for the stacked chart on the Reports page)
router.get('/category-trend', async (req, res) => {
  const endMonth = req.query.end;
  assertMonth(endMonth);
  const months = Math.min(12, Math.max(2, parseInt(req.query.months) || 6));
  const firstMonth = shiftMonth(endMonth, -(months - 1));

  const rows = await Transaction.aggregate([
    {
      $match: {
        user: req.user._id,
        type: 'expense',
        date: { $gte: monthRange(firstMonth).start, $lt: monthRange(endMonth).end },
      },
    },
    {
      $group: {
        _id: { month: { $dateToString: { format: '%Y-%m', date: '$date' } }, category: '$category' },
        total: { $sum: '$amount' },
      },
    },
  ]);

  // Categories ordered by total spending over the whole period
  const totals = {};
  for (const row of rows) totals[row._id.category] = (totals[row._id.category] || 0) + row.total;
  const categories = Object.keys(totals).sort((a, b) => totals[b] - totals[a]);

  const series = Array.from({ length: months }, (_, i) => {
    const point = { month: shiftMonth(firstMonth, i) };
    for (const category of categories) point[category] = 0;
    return point;
  });
  for (const row of rows) {
    const point = series.find((p) => p.month === row._id.month);
    if (point) point[row._id.category] = row.total;
  }
  res.json({ categories, series });
});

// POST /api/transactions  -> add a transaction
router.post('/', async (req, res) => {
  const transaction = await Transaction.create({ ...transactionFields(req.body), user: req.user._id });
  res.status(201).json(transaction);
});

// PUT /api/transactions/:id  -> edit one of your own transactions
router.put('/:id', async (req, res) => {
  const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
  if (!transaction) throw httpError(404, 'Transaction not found');

  Object.assign(transaction, transactionFields(req.body));
  await transaction.save(); // runs all the model's checks again
  res.json(transaction);
});

// DELETE /api/transactions/:id  -> delete one of your own transactions
router.delete('/:id', async (req, res) => {
  const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!transaction) throw httpError(404, 'Transaction not found');
  res.json({ message: 'Transaction deleted' });
});

export default router;
