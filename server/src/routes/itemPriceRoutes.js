import { Router } from 'express';
import ItemPrice from '../models/ItemPrice.js';
import { requireManager } from '../middleware/auth.js';

const router = Router();

// GET /api/item-prices?type=perishable
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  res.json(await ItemPrice.find(filter).lean());
});

// PUT /api/item-prices  — bulk upsert, manager+
router.put('/', requireManager, async (req, res) => {
  const { type, prices } = req.body;
  if (!type || !Array.isArray(prices) || !prices.length)
    return res.status(400).json({ message: 'type and prices array required' });

  const ops = prices.map(({ itemName, price }) => ({
    updateOne: {
      filter: { itemName, type },
      update: { $set: { price } },
      upsert: true,
    },
  }));
  await ItemPrice.bulkWrite(ops);
  res.json(await ItemPrice.find({ type }).lean());
});

export default router;
