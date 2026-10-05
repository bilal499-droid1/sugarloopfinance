import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '12h',
  });

// Signed-in users are cached briefly so each request doesn't pay a database
// round trip (Atlas is ~150 ms away). Call forgetUser() when a user changes.
const USER_CACHE_MS = 60 * 1000;
const userCache = new Map(); // id -> { user, expires }

export const forgetUser = (id) => userCache.delete(String(id));

const loadUser = async (id) => {
  const hit = userCache.get(id);
  if (hit && hit.expires > Date.now()) return hit.user;
  const user = await User.findById(id);
  if (user) userCache.set(id, { user, expires: Date.now() + USER_CACHE_MS });
  else userCache.delete(id);
  return user;
};

// Requires a valid `Authorization: Bearer <token>` header; sets req.user.
export const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  if (!token) return res.status(401).json({ message: 'Not signed in' });

  try {
    const { sub } = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await loadUser(String(sub));
  } catch {
    return res.status(401).json({ message: 'Session expired, please sign in again' });
  }
  if (!req.user) return res.status(401).json({ message: 'Account no longer exists' });
  next();
};

export const requireRole =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user?.role) ? next() : res.status(403).json({ message: 'Not allowed for your role' });

export const requireAdmin = requireRole('ADMIN');
// Edit / verify / pay / manage catalog. Staff can only create and view.
export const requireManager = requireRole('ADMIN', 'MANAGER');
