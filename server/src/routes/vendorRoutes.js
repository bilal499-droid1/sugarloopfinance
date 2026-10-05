import { Router } from 'express';
import Vendor from '../models/Vendor.js';
import BillingRecord from '../models/BillingRecord.js';
import { requireAdmin, requireManager } from '../middleware/auth.js';
import { httpError } from '../middleware/errorHandler.js';

const router = Router();

const EDITABLE = ['name', 'code', 'defaultCategory', 'contactName', 'phone', 'email', 'address', 'active'];
const pick = (body) => Object.fromEntries(EDITABLE.filter((k) => k in body).map((k) => [k, body[k]]));

router.get('/', async (req, res) => res.json(await Vendor.find().sort('name')));

router.get('/:id', async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) throw httpError(404, 'Vendor not found');
  res.json(vendor);
});

router.post('/', requireManager, async (req, res) => res.status(201).json(await Vendor.create(pick(req.body))));

router.patch('/:id', requireManager, async (req, res) => {
  const vendor = await Vendor.findByIdAndUpdate(req.params.id, pick(req.body), { returnDocument: 'after', runValidators: true });
  if (!vendor) throw httpError(404, 'Vendor not found');
  // Keep the denormalised name on the vendor's records in sync.
  if ('name' in req.body) await BillingRecord.updateMany({ vendorId: vendor.id }, { vendorName: vendor.name });
  res.json(vendor);
});

// Vendors with billing history can't be deleted (it would orphan the ledger); deactivate them instead.
router.delete('/:id', requireAdmin, async (req, res) => {
  if (await BillingRecord.exists({ vendorId: req.params.id })) {
    throw httpError(400, 'This vendor has billing records. Mark it inactive instead of deleting it.');
  }
  await Vendor.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

export default router;
