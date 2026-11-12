import { Router } from 'express';
import SaleOut from '../models/SaleOut.js';
import { requireAdmin, requireManager } from '../middleware/auth.js';
import { httpError } from '../middleware/errorHandler.js';

const router = Router();

let _counter = null;
const nextEntryNo = async () => {
  if (_counter === null) {
    const last = await SaleOut.findOne({}, 'entryNo').sort('-createdAt').lean();
    const n = last?.entryNo ? parseInt(last.entryNo.replace('SO-', ''), 10) : 0;
    _counter = isNaN(n) ? 0 : n;
  }
  _counter += 1;
  return `SO-${String(_counter).padStart(4, '0')}`;
};

// GET /api/saleout?from=&to=
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.from || req.query.to) {
    filter.saleDate = {};
    if (req.query.from) filter.saleDate.$gte = new Date(req.query.from);
    if (req.query.to) filter.saleDate.$lte = new Date(`${req.query.to}T23:59:59.999Z`);
  }
  if (req.query.type === 'nonperishable') {
    filter.type = 'nonperishable';
  } else if (req.query.type === 'perishable') {
    filter.type = { $ne: 'nonperishable' };
  }
  if (req.query.branch) filter.branch = req.query.branch;
  res.json(await SaleOut.find(filter).sort('-saleDate -createdAt'));
});

router.get('/:id', async (req, res) => {
  const doc = await SaleOut.findById(req.params.id);
  if (!doc) throw httpError(404, 'Sale Out record not found');
  res.json(doc);
});

// POST /api/saleout
router.post('/', async (req, res) => {
  const { saleDate, lines, notes, type, branch } = req.body;
  if (!saleDate) throw httpError(400, 'Sale date is required');
  if (!lines?.length) throw httpError(400, 'At least one line with qty > 0 is required');

  const doc = new SaleOut({
    saleDate: new Date(saleDate),
    type: type || 'perishable',
    lines,
    branch: branch || '',
    notes,
    createdBy: req.user.name,
  });
  doc.entryNo = await nextEntryNo();
  await doc.save();
  res.status(201).json(doc);
});

// PATCH /api/saleout/:id  (manager+)
router.patch('/:id', requireManager, async (req, res) => {
  const doc = await SaleOut.findById(req.params.id);
  if (!doc) throw httpError(404, 'Sale Out record not found');

  const { saleDate, lines, notes, branch } = req.body;
  if (saleDate) doc.saleDate = new Date(saleDate);
  if (lines) doc.lines = lines;
  if (notes !== undefined) doc.notes = notes;
  if (branch !== undefined) doc.branch = branch;

  await doc.save();
  res.json(doc);
});

// DELETE /api/saleout/:id  (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  await SaleOut.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

export default router;
