import { Router } from 'express';
import Item from '../models/Item.js';
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

// Stock Refresh: recount each item's in-hand quantity from its movement history
// (every change goes through the log, opening stock included).
const recount = async () => {
  const [items, totals] = await Promise.all([
    Item.find().sort('name'),
    StockMovement.aggregate([{ $group: { _id: '$itemId', total: { $sum: '$change' } } }]),
  ]);
  const fromHistory = new Map(totals.map((t) => [String(t._id), Math.round(t.total * 1000) / 1000]));
  return items.map((item) => {
    const counted = fromHistory.get(item.id) ?? 0;
    return { item, counted, difference: Math.round((item.inHand - counted) * 1000) / 1000 };
  });
};

const checkRow = ({ item, counted, difference }) => ({
  itemId: item.id,
  name: item.name,
  unit: item.unit,
  inHand: item.inHand,
  counted,
  difference,
  isLowStock: item.isLowStock,
});

// GET /api/stock/check — compare stored in-hand quantities with the history.
router.get('/check', async (req, res) => res.json((await recount()).map(checkRow)));

// Manager: set every mismatched item to its recounted quantity.
router.post('/refresh', requireManager, async (req, res) => {
  const rows = await recount();
  const fixed = [];
  for (const row of rows.filter((r) => r.difference)) {
    if (row.counted < 0) throw httpError(400, `${row.item.name} recounts to ${row.counted}; fix its history with a stock adjustment first`);
    await Item.updateOne({ _id: row.item.id }, { inHand: row.counted });
    fixed.push(checkRow(row));
  }
  res.json({ fixed, checked: rows.length });
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
