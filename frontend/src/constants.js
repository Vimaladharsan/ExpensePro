import {
  Award, Bike, Briefcase, Bus, Camera, Car, Clapperboard, Gamepad2, Gift, GraduationCap, Heart, HeartPulse, House, Laptop,
  PiggyBank, Plane, Receipt, ShieldCheck, ShoppingBag, ShoppingCart, Smartphone, Tag, Utensils, Wallet,
} from 'lucide-react';

// Must match backend/src/constants.js
export const CATEGORIES = {
  income: ['Salary', 'Pocket Money', 'Freelance', 'Scholarship', 'Gift', 'Other'],
  expense: ['Food', 'Groceries', 'Rent', 'Travel', 'Shopping', 'Bills', 'Education', 'Health', 'Entertainment', 'Other'],
};
export const PAYMENT_METHODS = ['UPI', 'Cash', 'Card', 'Bank Transfer'];
export const OVERALL = 'Overall';

// Icon and colour for each category, used everywhere so charts and lists match
const CATEGORY_STYLE = {
  Food: { icon: Utensils, color: '#f97316' },
  Groceries: { icon: ShoppingCart, color: '#65a30d' },
  Rent: { icon: House, color: '#8b5cf6' },
  Travel: { icon: Bus, color: '#0ea5e9' },
  Shopping: { icon: ShoppingBag, color: '#ec4899' },
  Bills: { icon: Receipt, color: '#eab308' },
  Education: { icon: GraduationCap, color: '#6366f1' },
  Health: { icon: HeartPulse, color: '#ef4444' },
  Entertainment: { icon: Clapperboard, color: '#14b8a6' },
  Salary: { icon: Briefcase, color: '#10b981' },
  'Pocket Money': { icon: Wallet, color: '#22c55e' },
  Freelance: { icon: Laptop, color: '#06b6d4' },
  Scholarship: { icon: Award, color: '#a855f7' },
  Gift: { icon: Gift, color: '#f43f5e' },
  Other: { icon: Tag, color: '#64748b' },
};
export const categoryStyle = (name) => CATEGORY_STYLE[name] || CATEGORY_STYLE.Other;

// Savings goal icons and colours (must match backend/src/constants.js)
export const GOAL_ICONS = {
  laptop: Laptop, plane: Plane, bike: Bike, phone: Smartphone, graduation: GraduationCap, gift: Gift, home: House,
  car: Car, camera: Camera, gamepad: Gamepad2, heart: Heart, shield: ShieldCheck, piggy: PiggyBank,
};
export const GOAL_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#10b981', '#06b6d4', '#0ea5e9', '#64748b'];

// The demo account created by "npm run seed" (local test account, shown on the login page)
export const DEMO_LOGIN = { email: 'demo@expensetracker.app', password: 'demo1234' };
