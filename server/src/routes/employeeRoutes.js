import { Router } from 'express';
import Employee from '../models/Employee.js';
import { requireManager } from '../middleware/auth.js';
import { httpError } from '../middleware/errorHandler.js';

const router = Router();

let _counter = null;
const nextEmpId = async () => {
  if (_counter === null) {
    const last = await Employee.findOne({}, 'employeeId').sort('-createdAt').lean();
    const n = last?.employeeId ? parseInt(last.employeeId.replace('EMP-', ''), 10) : 0;
    _counter = isNaN(n) ? 0 : n;
  }
  _counter += 1;
  return `EMP-${String(_counter).padStart(3, '0')}`;
};

// GET /api/employees
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.active !== 'false') filter.isActive = true;
  res.json(await Employee.find(filter).sort('name'));
});

// GET /api/employees/:id
router.get('/:id', async (req, res) => {
  const doc = await Employee.findById(req.params.id);
  if (!doc) throw httpError(404, 'Employee not found');
  res.json(doc);
});

// POST /api/employees  (manager+)
router.post('/', requireManager, async (req, res) => {
  const { name, designation, department, basicSalary } = req.body;
  if (!name) throw httpError(400, 'Name is required');
  const doc = new Employee({ name, designation, department, basicSalary });
  doc.employeeId = await nextEmpId();
  await doc.save();
  res.status(201).json(doc);
});

// PATCH /api/employees/:id  (manager+)
router.patch('/:id', requireManager, async (req, res) => {
  const doc = await Employee.findById(req.params.id);
  if (!doc) throw httpError(404, 'Employee not found');
  const { name, designation, department, basicSalary, isActive } = req.body;
  if (name !== undefined) doc.name = name;
  if (designation !== undefined) doc.designation = designation;
  if (department !== undefined) doc.department = department;
  if (basicSalary !== undefined) doc.basicSalary = basicSalary;
  if (isActive !== undefined) doc.isActive = isActive;
  await doc.save();
  res.json(doc);
});

// DELETE /api/employees/:id  (manager+)
router.delete('/:id', requireManager, async (req, res) => {
  const doc = await Employee.findById(req.params.id);
  if (!doc) throw httpError(404, 'Employee not found');
  doc.isActive = false;
  await doc.save();
  res.status(204).end();
});

export default router;
