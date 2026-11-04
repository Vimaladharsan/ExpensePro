import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { httpError } from '../utils.js';
import { DEMO_EMAIL } from '../constants.js';

const router = express.Router();

// The reply after register/login: a login token (valid 7 days) and the user's public details.
// "v" is the account's token version, so a password change can cancel older tokens.
function authReply(user) {
  const token = jwt.sign({ id: user._id, v: user.tokenVersion }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return { token, user: publicUser(user) };
}

// POST /api/auth/register  { name, email, password }
router.post('/register', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!name) throw httpError(400, 'Please enter your name');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw httpError(400, 'Please enter a valid email');
  if (password.length < 6) throw httpError(400, 'Password must be at least 6 characters');
  if (await User.exists({ email })) throw httpError(409, 'An account with this email already exists');

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashedPassword });
  res.status(201).json(authReply(user));
});

// POST /api/auth/login  { email, password }
router.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw httpError(401, 'Incorrect email or password');
  }
  res.json(authReply(user));
});

const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email, createdAt: user.createdAt });

// GET /api/auth/me  -> the logged-in user (used to check a saved login is still valid)
router.get('/me', requireAuth, (req, res) => {
  res.json(publicUser(req.user));
});

// PUT /api/auth/me  { name }  -> update your name
router.put('/me', requireAuth, async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) throw httpError(400, 'Please enter your name');
  req.user.name = name;
  await req.user.save();
  res.json(publicUser(req.user));
});

// PUT /api/auth/password  { currentPassword, newPassword }
router.put('/password', requireAuth, async (req, res) => {
  const currentPassword = String(req.body.currentPassword || '');
  const newPassword = String(req.body.newPassword || '');

  if (req.user.email === DEMO_EMAIL) throw httpError(403, 'The demo account’s password can’t be changed');
  if (newPassword.length < 6) throw httpError(400, 'New password must be at least 6 characters');

  const user = await User.findById(req.user._id).select('+password');
  if (!(await bcrypt.compare(currentPassword, user.password))) throw httpError(400, 'Current password is incorrect');

  user.password = await bcrypt.hash(newPassword, 10);
  user.tokenVersion += 1; // every token issued before now stops working
  await user.save();
  // A fresh token keeps this device logged in, while every other device is signed out
  res.json({ message: 'Password changed', token: authReply(user).token });
});

export default router;
