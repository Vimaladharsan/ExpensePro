import express from 'express';
import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';
import { EXPENSE_CATEGORIES, OVERALL } from '../constants.js';
import { assertMonth, httpError, monthRange } from '../utils.js';

// All routes here are behind requireAuth (see server.js)
const router = express.Router();

// GET /api/budgets?month=2026-10
// The month's budgets, each with how much has been spent against it
router.get('/', async (req, res) => {
  const { month } = req.query;
  assertMonth(month);
  const { start, end } = monthRange(month);

  const [budgets, spending] = await Promise.all([
    Budget.find({ user: req.user._id, month }),
    Transaction.aggregate([
      { $match: { user: req.user._id, type: 'expense', date: { $gte: start, $lt: end } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]),
  ]);

  const spentOn = Object.fromEntries(spending.map((row) => [row._id, row.total]));
  const totalSpent = spending.reduce((sum, row) => sum + row.total, 0);
  const overall = budgets.find((b) => b.category === OVERALL);

  res.json({
    month,
    totalSpent,
    overall: overall ? { _id: overall._id, amount: overall.amount, spent: totalSpent } : null,
    categories: budgets
      .filter((b) => b.category !== OVERALL)
      .map((b) => ({ _id: b._id, category: b.category, amount: b.amount, spent: spentOn[b.category] || 0 }))
      .sort((a, b) => b.spent / b.amount - a.spent / a.amount), // closest to the limit first
    spending: spending.map((row) => ({ category: row._id, total: row.total })),
  });
});

// PUT /api/budgets  { month, category, amount }  -> set or change a budget
router.put('/', async (req, res) => {
  const { month, category } = req.body;
  assertMonth(month);
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount < 1) throw httpError(400, 'Budget must be at least ₹1');
  if (![OVERALL, ...EXPENSE_CATEGORIES].includes(category)) throw httpError(400, 'Choose a valid category');

  const budget = await Budget.findOneAndUpdate(
    { user: req.user._id, month, category },
    { amount },
    { upsert: true, returnDocument: 'after', runValidators: true } // upsert: create it if it doesn't exist
  );
  res.json(budget);
});

// DELETE /api/budgets/:id  -> remove one of your budgets
router.delete('/:id', async (req, res) => {
  const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!budget) throw httpError(404, 'Budget not found');
  res.json({ message: 'Budget removed' });
});

export default router;
