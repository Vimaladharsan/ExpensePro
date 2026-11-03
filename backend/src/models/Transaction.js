import mongoose from 'mongoose';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '../constants.js';

const transactionSchema = new mongoose.Schema(
  {
    // Every transaction belongs to one user, so users never see each other's data
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      required: [true, 'Choose income or expense'],
      enum: { values: ['income', 'expense'], message: 'Type must be income or expense' },
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be at least ₹1'],
      max: [10_000_000, 'Amount is too large'],
    },
    category: {
      type: String,
      required: [true, 'Choose a category'],
      validate: {
        // The category must match the type (e.g. "Salary" is only for income)
        validator(value) {
          const allowed = this.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
          return allowed.includes(value);
        },
        message: 'Choose a valid category',
      },
    },
    date: { type: Date, required: [true, 'Choose a date'] },
    paymentMethod: {
      type: String,
      enum: { values: PAYMENT_METHODS, message: 'Choose a valid payment method' },
      default: 'UPI',
    },
    note: { type: String, trim: true, maxlength: [120, 'Note is too long (max 120 characters)'], default: '' },
  },
  { timestamps: true }
);

// Makes "this user's transactions, newest first" queries fast
transactionSchema.index({ user: 1, date: -1 });

export default mongoose.model('Transaction', transactionSchema);
