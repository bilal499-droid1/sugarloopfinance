import { Router } from 'express';
import Payroll from '../models/Payroll.js';
import Employee from '../models/Employee.js';
import { requireManager } from '../middleware/auth.js';
import { httpError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/payroll?month=&department=&status=
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.month) filter.month = req.query.month;
  if (req.query.department) filter.department = req.query.department;
  if (req.query.status) filter.paymentStatus = req.query.status;
  res.json(await Payroll.find(filter).sort('-month employeeName'));
});

// GET /api/payroll/:id
router.get('/:id', async (req, res) => {
  const doc = await Payroll.findById(req.params.id);
  if (!doc) throw httpError(404, 'Payroll record not found');
  res.json(doc);
});

// POST /api/payroll
router.post('/', async (req, res) => {
  const { employeeId, month, basicSalary, allowances, bonuses, deductions, paymentDate, paymentStatus } = req.body;
  if (!employeeId || !month) throw httpError(400, 'Employee and month are required');

  const emp = await Employee.findById(employeeId);
  if (!emp) throw httpError(404, 'Employee not found');

  const existing = await Payroll.findOne({ employee: employeeId, month });
  if (existing) throw httpError(409, `Payroll for ${emp.name} in ${month} already exists`);

  const doc = new Payroll({
    employee: emp._id,
    employeeName: emp.name,
    designation: emp.designation,
    department: emp.department,
    month,
    basicSalary: basicSalary ?? emp.basicSalary,
    allowances: allowances || [],
    bonuses: bonuses || [],
    deductions: deductions || [],
    paymentDate: paymentDate ? new Date(paymentDate) : undefined,
    paymentStatus: paymentStatus || 'pending',
    createdBy: req.user.name,
  });
  await doc.save();
  res.status(201).json(doc);
});

// PATCH /api/payroll/:id  (manager+)
router.patch('/:id', requireManager, async (req, res) => {
  const doc = await Payroll.findById(req.params.id);
  if (!doc) throw httpError(404, 'Payroll record not found');

  const { basicSalary, allowances, bonuses, deductions, paymentDate, paymentStatus } = req.body;
  if (basicSalary !== undefined) doc.basicSalary = basicSalary;
  if (allowances !== undefined) doc.allowances = allowances;
  if (bonuses !== undefined) doc.bonuses = bonuses;
  if (deductions !== undefined) doc.deductions = deductions;
  if (paymentDate !== undefined) doc.paymentDate = paymentDate ? new Date(paymentDate) : undefined;
  if (paymentStatus !== undefined) doc.paymentStatus = paymentStatus;

  await doc.save();
  res.json(doc);
});

// DELETE /api/payroll/:id  (manager+)
router.delete('/:id', requireManager, async (req, res) => {
  await Payroll.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

export default router;
