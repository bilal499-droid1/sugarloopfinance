import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';
import itemRoutes from './routes/itemRoutes.js';
import stockRoutes from './routes/stockRoutes.js';
import recordRoutes from './routes/recordRoutes.js';
import returnRoutes from './routes/returnRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import saleRoutes from './routes/saleRoutes.js';
import periodRoutes from './routes/periodRoutes.js';
import { announceChanges, liveStream } from './services/live.js';
import { startPeriodScheduler } from './services/periodScheduler.js';

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set in server/.env');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());
// Receipt files use random, unguessable names. TODO: serve them behind auth.
app.use('/uploads', express.static('uploads'));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);

// Everything below requires a signed-in user.
app.use('/api', requireAuth);
app.get('/api/live', liveStream);
app.use('/api', announceChanges);
app.use('/api/users', userRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/periods', periodRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    startPeriodScheduler();
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
