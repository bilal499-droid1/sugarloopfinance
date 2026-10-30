import { Router } from 'express';
import SaleRecord from '../models/SaleRecord.js';
import Customer from '../models/Customer.js';
import Item from '../models/Item.js';
import { requireAdmin, requireManager } from '../middleware/auth.js';
import { httpError } from '../middleware/errorHandler.js';
import { syncSaleStock, nextSaleInvoiceNo } from '../services/sales.js';

const router = Router();

const findCustomer = async (id) => {
  const c = await Customer.findById(id);
  if (!c) throw httpError(404, 'Customer not found');
  return c;
};

const findSale = async (id) => {
  const s = await SaleRecord.findById(id);
  if (!s) throw httpError(404, 'Sale not found');
  return s;
};

// Resolve item IDs and names for sale lines
const buildSaleLines = async (rawItems = []) => {
  if (!rawItems.length) return [];
  const ids = rawItems.map((l) => l.itemId).filter(Boolean);
  const catalog = await Item.find({ _id: { $in: ids } });
  const byId = new Map(catalog.map((i) => [String(i._id), i]));

  return rawItems.map((l) => {
    const item = byId.get(String(l.itemId));
    if (!item) throw httpError(400, `Item ${l.itemId} not found`);
    return {
      itemId: item._id,
      itemName: item.name,
      unit: item.unit,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
    };
  });
};

// Recalculate customer's total sales
const recalcCustomerTotals = async (customerId) => {
  const result = await SaleRecord.aggregate([
    { $match: { customerId } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  await Customer.updateOne({ _id: customerId }, { totalSales: result[0]?.total ?? 0 });
};

// GET /api/sales?customerId=&from=&to=
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.customerId) filter.customerId = req.query.customerId;
  if (req.query.from || req.query.to) {
    filter.saleDate = {};
    if (req.query.from) filter.saleDate.$gte = new Date(req.query.from);
    if (req.query.to) filter.saleDate.$lte = new Date(`${req.query.to}T23:59:59.999Z`);
  }
  res.json(await SaleRecord.find(filter).sort('-saleDate -createdAt'));
});

router.get('/:id', async (req, res) => res.json(await findSale(req.params.id)));

// POST /api/sales
router.post('/', async (req, res) => {
  const { customerId, saleDate, items, notes } = req.body;
  if (!customerId) throw httpError(400, 'Customer is required');
  if (!items?.length) throw httpError(400, 'Add at least one product');

  const customer = await findCustomer(customerId);
  const saleLines = await buildSaleLines(items);

  const sale = new SaleRecord({
    customerId: customer._id,
    customerName: customer.name,
    saleDate: saleDate ? new Date(saleDate) : new Date(),
    items: saleLines,
    notes,
    createdBy: req.user.name,
  });
  sale.saleInvoiceNo = await nextSaleInvoiceNo(customer);

  await sale.validate();
  await syncSaleStock(sale, req.user);
  await sale.save();
  await recalcCustomerTotals(customer._id);

  res.status(201).json(sale);
});

// PATCH /api/sales/:id  (manager+)
router.patch('/:id', requireManager, async (req, res) => {
  const sale = await findSale(req.params.id);
  const { saleDate, items, notes } = req.body;

  if (saleDate) sale.saleDate = new Date(saleDate);
  if (notes !== undefined) sale.notes = notes;
  if (items) sale.items = await buildSaleLines(items);

  await sale.validate();
  await syncSaleStock(sale, req.user);
  await sale.save();
  await recalcCustomerTotals(sale.customerId);

  res.json(sale);
});

// DELETE /api/sales/:id  (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  const sale = await SaleRecord.findById(req.params.id);
  if (!sale) return res.status(204).end();

  // Return stock by clearing items before sync
  const customerId = sale.customerId;
  sale.items = [];
  await syncSaleStock(sale, req.user);
  await sale.deleteOne();
  await recalcCustomerTotals(customerId);

  res.status(204).end();
});

export default router;
