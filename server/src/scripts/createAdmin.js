// Create (or reset the password of) an admin account.
// Usage: npm run create-admin -- <email> <password> "<name>"
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

const [email, password, name = 'Admin'] = process.argv.slice(2);
if (!email || !password || password.length < 8) {
  console.error('Usage: npm run create-admin -- <email> <password (8+ chars)> "<name>"');
  process.exit(1);
}

await connectDB();
const passwordHash = await bcrypt.hash(password, 10);
await User.updateOne(
  { email: email.toLowerCase() },
  { $set: { passwordHash, role: 'ADMIN' }, $setOnInsert: { name } },
  { upsert: true }
);
console.log(`Admin ready: ${email}`);
await mongoose.disconnect();
