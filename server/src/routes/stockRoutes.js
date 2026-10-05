import { Router } from 'express';
import StockMovement from '../models/StockMovement.js';
import { requireManager } from '../middleware/auth.js';
import { httpError } from '../middleware/errorHandler.js';
import { adjustStock, moveStock } from '../services/stock.js';

const router = Router();

// GET /api/stock/movements?itemId=&type=&limit=
router.get('/movements', async (req, res) => {
  const filter = {};
  if (req.query.itemId) filter.itemId = req.query.itemId;
  if (req.query.type) filter.type = req.query.type;
  const limit = Math.min(Number(req.query.limit) || 200, 1000);
  res.json(await StockMovement.find(filter).sort('-createdAt').limit(limit));
});

// Send stock from the central warehouse to a bakery branch.
router.post('/transfers', async (req, res) => {
  const { itemId, quantity, branch, notes } = req.body;
  const qty = Number(quantity);
  if (!(qty > 0)) throw httpError(400, 'Quantity must be greater than zero');
  if (!branch?.trim()) throw httpError(400, 'Destination branch is required');

  const movement = await moveStock({
    itemId,
    change: -qty,
    type: 'TRANSFER_OUT',
    branch: branch.trim(),
    reason: notes,
    user: req.user,
  });
  res.status(201).json(movement);
});

// Manager sets the exact in-hand quantity (stock count correction).
router.post('/adjust', requireManager, async (req, res) => {
  const { itemId, quantity, reason } = req.body;
  const qty = Number(quantity);
  if (!(qty >= 0)) throw httpError(400, 'Quantity must be zero or more');
  if (!reason?.trim()) throw httpError(400, 'A reason is required for manual adjustments');

  const movement = await adjustStock({ itemId, quantity: qty, reason: reason.trim(), user: req.user });
  res.status(201).json(movement ?? { message: 'No change' });
});

export default router;
