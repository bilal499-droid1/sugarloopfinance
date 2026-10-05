import { Router } from 'express';
import Item, { UNITS } from '../models/Item.js';
import StockMovement from '../models/StockMovement.js';
import BillingRecord from '../models/BillingRecord.js';
import { requireAdmin, requireManager } from '../middleware/auth.js';
import { httpError } from '../middleware/errorHandler.js';
import { moveStock } from '../services/stock.js';

// Item catalog. `inHand` is never set directly here; it only changes via /api/stock.
const router = Router();

const EDITABLE = ['name', 'unit', 'reorderLevel', 'notes'];
const pick = (body) => Object.fromEntries(EDITABLE.filter((k) => k in body).map((k) => [k, body[k]]));

router.get('/', async (req, res) => res.json(await Item.find().sort('name')));
router.get('/units', (req, res) => res.json(UNITS));

// Unit-price history for an item across vendors (or one vendor), oldest first.
router.get('/:id/prices', async (req, res) => {
  const filter = { 'items.itemId': req.params.id, status: { $ne: 'FLAGGED' } };
  if (req.query.vendorId) filter.vendorId = req.query.vendorId;
  const records = await BillingRecord.find(filter).sort('receiptDate').select('vendorId vendorName receiptDate purchaseInvoiceNo items');

  const history = records.flatMap((r) =>
    r.items
      .filter((line) => String(line.itemId) === req.params.id)
      .map((line) => ({
        recordId: r.id,
        purchaseInvoiceNo: r.purchaseInvoiceNo,
        vendorId: r.vendorId,
        vendorName: r.vendorName,
        date: r.receiptDate,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      }))
  );
  res.json(history);
});

router.post('/', requireManager, async (req, res) => {
  const item = await Item.create(pick(req.body));
  const opening = Number(req.body.openingStock) || 0;
  if (opening > 0) {
    await moveStock({ itemId: item.id, change: opening, type: 'ADJUSTMENT', reason: 'Opening stock', user: req.user });
  }
  res.status(201).json(await Item.findById(item.id));
});

router.patch('/:id', requireManager, async (req, res) => {
  const item = await Item.findByIdAndUpdate(req.params.id, pick(req.body), { returnDocument: 'after', runValidators: true });
  if (!item) throw httpError(404, 'Item not found');
  res.json(item);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const used =
    (await BillingRecord.exists({ 'items.itemId': req.params.id })) ||
    (await StockMovement.exists({ itemId: req.params.id }));
  if (used) throw httpError(400, 'This item has receipts or stock history and cannot be deleted');
  await Item.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

export default router;
