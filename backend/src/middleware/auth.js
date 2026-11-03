import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Protects a route: the request must carry "Authorization: Bearer <token>".
// If the token is valid and the user exists, the user is put on req.user.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please log in to continue' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Your session has expired. Please log in again.' });
  }

  const user = await User.findById(payload.id);
  if (!user) return res.status(401).json({ message: 'Please log in again' });

  req.user = user;
  next();
}
