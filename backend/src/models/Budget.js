import mongoose from 'mongoose';
import { EXPENSE_CATEGORIES, OVERALL } from '../constants.js';

// A spending limit for one month: either "Overall" (all spending) or one expense category
const budgetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: String, required: true }, // e.g. "2026-10"
    category: { type: String, required: true, enum: [OVERALL, ...EXPENSE_CATEGORIES] },
    amount: {
      type: Number,
      required: true,
      min: [1, 'Budget must be at least ₹1'],
      max: [10_000_000, 'Budget is too large'],
    },
  },
  { timestamps: true }
);

// One budget per user, per month, per category
budgetSchema.index({ user: 1, month: 1, category: 1 }, { unique: true });

export default mongoose.model('Budget', budgetSchema);
