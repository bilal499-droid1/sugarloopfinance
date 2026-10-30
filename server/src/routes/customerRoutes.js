import { Router } from 'express';
import Customer from '../models/Customer.js';
import { requireManager } from '../middleware/auth.js';
import { httpError } from '../middleware/errorHandler.js';

const router = Router();

const nextCode = async () => {
  const last = await Customer.findOne().sort('-code').select('code');
  if (!last) return 'CST-1001';
  const num = parseInt(last.code.replace(/\D/g, ''), 10);
  return `CST-${isNaN(num) ? 1001 : num + 1}`;
};

// GET /api/customers
router.get('/', async (req, res) => {
  res.json(await Customer.find().sort('name'));
});

// POST /api/customers  (manager+)
router.post('/', requireManager, async (req, res) => {
  const { name, phone, address } = req.body;
  if (!name?.trim()) throw httpError(400, 'Customer name is required');
  const code = await nextCode();
  const customer = await Customer.create({ name: name.trim(), code, phone, address });
  res.status(201).json(customer);
});

// PATCH /api/customers/:id  (manager+)
router.patch('/:id', requireManager, async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw httpError(404, 'Customer not found');
  const { name, phone, address, active } = req.body;
  if (name !== undefined) customer.name = name.trim();
  if (phone !== undefined) customer.phone = phone;
  if (address !== undefined) customer.address = address;
  if (active !== undefined) customer.active = active;
  await customer.save();
  res.json(customer);
});

// DELETE /api/customers/:id  (manager+)
router.delete('/:id', requireManager, async (req, res) => {
  const { default: SaleRecord } = await import('../models/SaleRecord.js');
  const hasSales = await SaleRecord.exists({ customerId: req.params.id });
  if (hasSales) throw httpError(400, 'Cannot delete a customer that has sales. Deactivate them instead.');
  await Customer.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

export default router;
