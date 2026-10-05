import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { forgetUser, requireAdmin } from '../middleware/auth.js';
import { httpError } from '../middleware/errorHandler.js';

// Admin-only user management (admins and finance staff).
const router = Router();
router.use(requireAdmin);

const ensureAnotherAdmin = async (userId) => {
  const otherAdmins = await User.countDocuments({ role: 'ADMIN', _id: { $ne: userId } });
  if (!otherAdmins) throw httpError(400, 'There must always be at least one admin');
};

router.get('/', async (req, res) => res.json(await User.find().sort('name')));

router.post('/', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!password || password.length < 8) throw httpError(400, 'Password must be at least 8 characters');
  const user = await User.create({ name, email, role, passwordHash: await bcrypt.hash(password, 10) });
  res.status(201).json(user);
});

router.patch('/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'User not found');

  const { name, email, role, password } = req.body;
  if (role && role !== 'ADMIN' && user.role === 'ADMIN') await ensureAnotherAdmin(user.id);
  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (role !== undefined) user.role = role;
  if (password) {
    if (password.length < 8) throw httpError(400, 'Password must be at least 8 characters');
    user.passwordHash = await bcrypt.hash(password, 10);
  }
  await user.save();
  forgetUser(user.id);
  res.json(user);
});

router.delete('/:id', async (req, res) => {
  if (req.params.id === req.user.id) throw httpError(400, "You can't delete your own account");
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'User not found');
  if (user.role === 'ADMIN') await ensureAnotherAdmin(user.id);
  await user.deleteOne();
  forgetUser(user.id);
  res.status(204).end();
});

export default router;
