import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = email && (await User.findOne({ email: String(email).toLowerCase().trim() }));
  if (!user || !(await bcrypt.compare(String(password ?? ''), user.passwordHash))) {
    return res.status(401).json({ message: 'Incorrect email or password' });
  }
  res.json({ token: signToken(user), user });
});

router.get('/me', requireAuth, (req, res) => res.json(req.user));

router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!(await bcrypt.compare(String(currentPassword ?? ''), req.user.passwordHash))) {
    return res.status(400).json({ message: 'Current password is incorrect' });
  }
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters' });
  }
  req.user.passwordHash = await bcrypt.hash(newPassword, 10);
  await req.user.save();
  res.json({ ok: true });
});

export default router;
