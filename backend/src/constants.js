// Allowed values, shared by the models and routes
export const INCOME_CATEGORIES = ['Salary', 'Pocket Money', 'Freelance', 'Scholarship', 'Gift', 'Other'];

export const EXPENSE_CATEGORIES = [
  'Food', 'Groceries', 'Rent', 'Travel', 'Shopping', 'Bills', 'Education', 'Health', 'Entertainment', 'Other',
];

export const PAYMENT_METHODS = ['UPI', 'Cash', 'Card', 'Bank Transfer'];

// The special budget "category" that limits all spending in a month
export const OVERALL = 'Overall';

// Icons and colours a savings goal can use (the frontend has the matching icons)
export const GOAL_ICONS = ['laptop', 'plane', 'bike', 'phone', 'graduation', 'gift', 'home', 'car', 'camera', 'gamepad', 'heart', 'shield', 'piggy'];
export const GOAL_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#10b981', '#06b6d4', '#0ea5e9', '#64748b'];

// The demo account (created by "npm run seed"); its password can't be changed so the demo button always works
export const DEMO_EMAIL = 'demo@expensetracker.app';
