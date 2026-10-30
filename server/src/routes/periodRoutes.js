import { Router } from 'express';
import LedgerPeriod from '../models/LedgerPeriod.js';
import PeriodSnapshot from '../models/PeriodSnapshot.js';
import { requireAdmin } from '../middleware/auth.js';
import { httpError } from '../middleware/errorHandler.js';
import { createPeriodSnapshot } from '../services/snapshotService.js';

const router = Router();

const toJSON = (p) => ({
  id: p._id,
  label: p.label,
  startDate: p.startDate,
  endDate: p.endDate ?? null,
  scheduledEndDate: p.scheduledEndDate ?? null,
  nextPeriodLabel: p.nextPeriodLabel ?? null,
  nextPeriodStartDate: p.nextPeriodStartDate ?? null,
  createdAt: p.createdAt,
});

// GET /api/periods — list all periods, newest first
router.get('/', async (_req, res) => {
  const periods = await LedgerPeriod.find().sort({ startDate: -1 });
  res.json(periods.map(toJSON));
});

// POST /api/periods — open a new period (admin only)
// Accepts optional scheduledEndDate + nextPeriodLabel + nextPeriodStartDate for auto-rollover.
router.post('/', requireAdmin, async (req, res) => {
  const { label, startDate, scheduledEndDate, nextPeriodLabel, nextPeriodStartDate } = req.body;
  if (!label || !startDate) throw httpError(400, 'label and startDate are required');
  const active = await LedgerPeriod.findOne({ endDate: null });
  if (active) throw httpError(400, 'Close the current period before opening a new one');
  const period = await LedgerPeriod.create({
    label,
    startDate: new Date(startDate),
    scheduledEndDate: scheduledEndDate ? new Date(scheduledEndDate) : null,
    nextPeriodLabel: nextPeriodLabel || null,
    nextPeriodStartDate: nextPeriodStartDate ? new Date(nextPeriodStartDate) : null,
  });
  res.status(201).json(toJSON(period));
});

// PATCH /api/periods/:id/close — close current period and open a new one (admin only)
router.patch('/:id/close', requireAdmin, async (req, res) => {
  const period = await LedgerPeriod.findById(req.params.id);
  if (!period) throw httpError(404, 'Period not found');
  if (period.endDate) throw httpError(400, 'Period is already closed');
  const { endDate, nextLabel, nextStartDate } = req.body;
  if (!endDate || !nextLabel || !nextStartDate) throw httpError(400, 'endDate, nextLabel and nextStartDate are required');
  period.endDate = new Date(endDate);
  await period.save();
  // Safety snapshot — frozen copy of all records in this period.
  await createPeriodSnapshot(period).catch((err) => console.error('[snapshot] Failed:', err.message));
  const next = await LedgerPeriod.create({ label: nextLabel, startDate: new Date(nextStartDate) });
  res.json({ closed: toJSON(period), opened: toJSON(next) });
});

// GET /api/periods/:id/snapshot — retrieve the frozen snapshot for an archived period
router.get('/:id/snapshot', async (req, res) => {
  const snapshot = await PeriodSnapshot.findOne({ periodId: req.params.id });
  if (!snapshot) throw httpError(404, 'No snapshot found for this period');
  res.json(snapshot);
});

export default router;
