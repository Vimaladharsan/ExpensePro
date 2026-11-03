import express from 'express';
import Goal from '../models/Goal.js';
import { httpError } from '../utils.js';

// All routes here are behind requireAuth (see server.js)
const router = express.Router();

// Only these fields can come from the request
function goalFields(body) {
  const fields = {};
  if (body.name !== undefined) fields.name = String(body.name);
  if (body.target !== undefined) {
    const target = Number(body.target);
    if (!Number.isFinite(target)) throw httpError(400, 'Target must be a number');
    fields.target = target;
  }
  if (body.deadline !== undefined) {
    if (body.deadline && Number.isNaN(new Date(body.deadline).getTime())) throw httpError(400, 'Choose a valid deadline');
    fields.deadline = body.deadline || null;
  }
  if (body.icon !== undefined) fields.icon = String(body.icon);
  if (body.color !== undefined) fields.color = String(body.color);
  return fields;
}

// GET /api/goals  -> your goals, oldest first
router.get('/', async (req, res) => {
  const goals = await Goal.find({ user: req.user._id }).sort({ createdAt: 1 });
  res.json(goals);
});

// POST /api/goals  { name, target, deadline?, icon?, color? }
router.post('/', async (req, res) => {
  const goal = await Goal.create({ ...goalFields(req.body), user: req.user._id });
  res.status(201).json(goal);
});

// PUT /api/goals/:id  -> edit a goal's name, target, deadline, icon or colour
router.put('/:id', async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
  if (!goal) throw httpError(404, 'Goal not found');
  Object.assign(goal, goalFields(req.body));
  await goal.save();
  res.json(goal);
});

// POST /api/goals/:id/contribute  { amount }  -> add money (positive) or take money out (negative)
router.post('/:id/contribute', async (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount === 0) throw httpError(400, 'Enter an amount');

  const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
  if (!goal) throw httpError(404, 'Goal not found');
  if (goal.saved + amount < 0) throw httpError(400, `You can take out at most ₹${goal.saved.toLocaleString('en-IN')}`);

  goal.saved = Math.round((goal.saved + amount) * 100) / 100;
  await goal.save();
  res.json(goal);
});

// DELETE /api/goals/:id
router.delete('/:id', async (req, res) => {
  const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!goal) throw httpError(404, 'Goal not found');
  res.json({ message: 'Goal deleted' });
});

export default router;
