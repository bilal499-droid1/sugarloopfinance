import { Router } from 'express';
import PurchaseReturn from '../models/PurchaseReturn.js';
import Vendor from '../models/Vendor.js';
import { requireAdmin, requireManager } from '../middleware/auth.js';
import { httpError } from '../middleware/errorHandler.js';
import { buildReturnLines, nextReturnNo, syncReturnStock } from '../services/returns.js';

// Purchase returns (goods sent back to a vendor). Any role can enter one, like a
// purchase; only managers/admins can edit and only admins can delete.
const router = Router();

const findReturn = async (id) => {
  const ret = await PurchaseReturn.findById(id);
  if (!ret) throw httpError(404, 'Return not found');
  return ret;
};

// Fields + lines from the request, checked against the original bill if one is given.
const applyBody = async (ret, body, vendor) => {
  const recordId = body.recordId || undefined;
  const { items, record } = await buildReturnLines(body.items, { vendorId: vendor.id, recordId, excludeId: ret._id });
  ret.set({
    vendorId: vendor.id,
    vendorName: vendor.name,
    recordId,
    invoiceNumber: record?.invoiceNumber,
    currency: record?.currency ?? ret.currency,
    returnDate: body.returnDate ? new Date(body.returnDate) : ret.returnDate,
    reason: body.reason,
    notes: body.notes,
    items,
  });
};

// Validate, then take the goods out of stock (which also saves the return).
const commit = async (ret, user) => {
  await ret.validate();
  await syncReturnStock(ret, user);
  await ret.save();
  return ret;
};

// GET /api/returns?vendorId=&recordId=&from=&to=
router.get('/', async (req, res) => {
  const filter = {};
  for (const key of ['vendorId', 'recordId']) {
    if (req.query[key]) filter[key] = req.query[key];
  }
  if (req.query.from || req.query.to) {
    filter.returnDate = {};
    if (req.query.from) filter.returnDate.$gte = new Date(req.query.from);
    if (req.query.to) filter.returnDate.$lte = new Date(`${req.query.to}T23:59:59.999Z`);
  }
  res.json(await PurchaseReturn.find(filter).sort('-returnDate -createdAt'));
});

router.get('/:id', async (req, res) => res.json(await findReturn(req.params.id)));

// Any role. Goods can only go back to an existing vendor.
router.post('/', async (req, res) => {
  const vendor = req.body.vendorId && (await Vendor.findById(req.body.vendorId));
  if (!vendor) throw httpError(404, 'Vendor not found');

  const ret = new PurchaseReturn({ createdBy: req.user.name });
  await applyBody(ret, req.body, vendor);
  await ret.validate();
  ret.returnNo = await nextReturnNo(vendor.id);
  res.status(201).json(await commit(ret, req.user));
});

// Manager: edit a return. Stock is corrected by the difference.
router.patch('/:id', requireManager, async (req, res) => {
  const ret = await findReturn(req.params.id);
  const vendor = await Vendor.findById(ret.vendorId);
  await applyBody(ret, { ...ret.toObject(), ...req.body }, vendor);
  ret.updatedBy = req.user.name;
  res.json(await commit(ret, req.user));
});

// Admin: delete a return; its goods are put back into stock first.
router.delete('/:id', requireAdmin, async (req, res) => {
  const ret = await PurchaseReturn.findById(req.params.id);
  if (!ret) return res.status(204).end();
  await syncReturnStock(ret, req.user, { remove: true });
  await ret.deleteOne();
  res.status(204).end();
});

export default router;
