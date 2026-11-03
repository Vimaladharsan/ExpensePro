// Creates (or resets) the demo account with 6 months of realistic transactions and budgets.
// Run with: npm run seed   (only the demo account's data is touched)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from './models/User.js';
import Transaction from './models/Transaction.js';
import Budget from './models/Budget.js';
import Goal from './models/Goal.js';
import { shiftMonth, daysInMonth } from './utils.js';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const DEMO_USER ={ name: 'Arjun Kumar', email: 'demo@expensetracker.app', password: 'demo1234' };

// A tiny random number generator with a fixed seed, so the demo data is the same every time
let seed = 2026;
function random() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
const between = (min, max, step = 10) => Math.round((min + random() * (max - min)) / step) * step;
const pick = (list) => list[Math.floor(random() * list.length)];

const NOTES = {
  Food: ['Canteen lunch', 'Swiggy dinner', 'Coffee with friends', 'Zomato order', 'Street food', 'Bakery', 'Pizza night', 'Tea & snacks', 'Biryani treat', 'Juice bar'],
  Groceries: ['Supermarket', 'Vegetables & fruits', 'Monthly groceries', 'Milk & bread', 'BigBasket order'],
  Travel: ['Auto to college', 'Metro card recharge', 'Cab home', 'Bike fuel', 'Train ticket', 'Bus to city'],
  Shopping: ['New shoes', 'T-shirts', 'Headphones', 'Backpack', 'Amazon order', 'Jeans', 'Watch'],
  Entertainment: ['Movie tickets', 'Netflix', 'Spotify', 'Concert pass', 'Bowling with friends', 'Gaming top-up'],
  Education: ['Books', 'Online course', 'Exam fee', 'Stationery', 'Lab manual', 'Printouts'],
  Health: ['Medicines', 'Doctor visit', 'Gym membership', 'Eye check-up'],
  Freelance: ['Website project', 'Logo design', 'Tutoring sessions', 'App UI design', 'Content writing'],
};

// All transactions for one month, up to lastDay (the current month stops at today)
function monthTransactions(month, lastDay) {
  const list = [];
  const add = (type, category, amount, day, paymentMethod, note) => {
    if (day <= lastDay) list.push({ type, category, amount, date: `${month}-${String(day).padStart(2, '0')}`, paymentMethod, note });
  };
  const days = daysInMonth(month);
  const anyDay = () => 1 + Math.floor(random() * days);

  // Income
  add('income', 'Pocket Money', 16000, 1, 'Bank Transfer', 'Monthly allowance from home');
  if (random() < 0.75) add('income', 'Freelance', between(2500, 6500, 100), between(8, 22, 1), 'UPI', pick(NOTES.Freelance));
  if (random() < 0.35) add('income', 'Freelance', between(1000, 3000, 100), between(18, 28, 1), 'UPI', pick(NOTES.Freelance));
  if (month.endsWith('-07')) add('income', 'Scholarship', 15000, 15, 'Bank Transfer', 'Merit scholarship');
  if (month.endsWith('-08')) add('income', 'Gift', 2000, 12, 'UPI', 'Birthday gift');

  // Fixed monthly costs
  add('expense', 'Rent', 5000, 3, 'Bank Transfer', 'Hostel rent');
  add('expense', 'Bills', 299, 5, 'UPI', 'Mobile recharge');
  add('expense', 'Bills', 599, 8, 'UPI', 'Wi-Fi bill');
  add('expense', 'Bills', between(350, 750), 12, 'UPI', 'Electricity bill');
  add('expense', 'Travel', 600, 2, 'UPI', 'Monthly bus pass');

  // Everyday spending
  for (let i = 0; i < 3; i++) add('expense', 'Groceries', between(400, 1100), anyDay(), pick(['UPI', 'Card']), pick(NOTES.Groceries));
  for (let i = 0; i < 11; i++) add('expense', 'Food', between(80, 480), anyDay(), pick(['UPI', 'UPI', 'Cash']), pick(NOTES.Food));
  for (let i = 0; i < 4; i++) add('expense', 'Travel', between(40, 320), anyDay(), pick(['Cash', 'UPI']), pick(NOTES.Travel));
  for (let i = 0; i < 1 + Math.floor(random() * 2); i++) add('expense', 'Shopping', between(600, 3000, 50), anyDay(), pick(['Card', 'UPI']), pick(NOTES.Shopping));
  for (let i = 0; i < 2; i++) add('expense', 'Entertainment', between(150, 700), anyDay(), pick(['Card', 'UPI']), pick(NOTES.Entertainment));
  if (random() < 0.7) add('expense', 'Education', between(300, 2500, 50), anyDay(), 'UPI', pick(NOTES.Education));
  if (random() < 0.5) add('expense', 'Health', between(150, 900), anyDay(), 'Cash', pick(NOTES.Health));

  return list;
}

const BUDGETS = { Overall: 20000, Food: 3500, Groceries: 3000, Shopping: 2500, Entertainment: 1200, Travel: 1800 };

async function seedDemo() {
  await mongoose.connect(process.env.MONGO_URI);

  let user = await User.findOne({ email: DEMO_USER.email });
  if (!user) {
    const password = await bcrypt.hash(DEMO_USER.password, 10);
    user = await User.create({ ...DEMO_USER, password });
  }
  await Transaction.deleteMany({ user: user._id });
  await Budget.deleteMany({ user: user._id });
  await Goal.deleteMany({ user: user._id });

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  let transactions = [];
  let budgets = [];
  for (let i = 5; i >= 0; i--) {
    const month = shiftMonth(thisMonth, -i);
    const lastDay = i === 0 ? now.getDate() : daysInMonth(month);
    transactions = transactions.concat(monthTransactions(month, lastDay).map((t) => ({ ...t, user: user._id })));
    budgets = budgets.concat(Object.entries(BUDGETS).map(([category, amount]) => ({ user: user._id, month, category, amount })));
  }

  await Transaction.insertMany(transactions);
  await Budget.insertMany(budgets);

  // Savings goals: one well on its way, one nearly done, one already reached
  const inMonths = (n) => {
    const date = new Date(Date.UTC(now.getFullYear(), now.getMonth() + n, 1));
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)); // last day of that month
  };
  const goals = [
    { name: 'New laptop', target: 65000, saved: 28500, deadline: inMonths(5), icon: 'laptop', color: '#6366f1' },
    { name: 'Goa trip with friends', target: 15000, saved: 11200, deadline: inMonths(2), icon: 'plane', color: '#06b6d4' },
    { name: 'Emergency fund', target: 25000, saved: 25000, deadline: null, icon: 'shield', color: '#10b981' },
    { name: 'New phone', target: 30000, saved: 4500, deadline: inMonths(8), icon: 'phone', color: '#ec4899' },
  ];
  await Goal.insertMany(goals.map((goal) => ({ ...goal, user: user._id })));

  console.log(`Demo account ready: ${transactions.length} transactions, ${budgets.length} budgets and ${goals.length} goals.`);
  console.log(`Log in with ${DEMO_USER.email} (password is in README.md)`);
  await mongoose.disconnect();
}

seedDemo().catch((error) => {
  console.error('Seeding failed:', error.message);
  process.exit(1);
});
