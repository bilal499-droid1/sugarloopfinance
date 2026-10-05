import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import BillingRecord from '../models/BillingRecord.js';
import Vendor from '../models/Vendor.js';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../constants/categories.js';
import { requireAdmin, requireManager } from '../middleware/auth.js';
import { httpError } from '../middleware/errorHandler.js';
import { recalcVendorTotals } from '../services/vendorTotals.js';
import { syncRecordStock } from '../services/stock.js';
import { attachPreviousPrices, buildLines, nextPurchaseInvoiceNo } from '../services/invoices.js';
import { findOrCreateVendor } from '../services/vendors.js';

// File type -> extension we store it under (so viewers can tell PDFs from images).
const EXTENSIONS = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'application/pdf': '.pdf' };
const ALLOWED_TYPES = Object.keys(EXTENSIONS);
const removeUpload = (imageUrl) => fs.promises.rm(path.join('uploads', path.basename(imageUrl)), { force: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + EXTENSIONS[file.mimetype]),
  }),
  fileFilter: (req, file, cb) => cb(null, ALLOWED_TYPES.includes(file.mimetype)),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const EDITABLE = [
  'category',
  'invoiceNumber',
  'receiptDate',
  'amount',
  'currency',
  'detectedPaidStamp',
  'billAvailable',
  'metadata',
  'originLocation',
  'destinationLocation',
  'notes',
];
const pick = (body) => Object.fromEntries(EDITABLE.filter((k) => k in body).map((k) => [k, body[k]]));

const findRecord = async (id) => {
  const record = await BillingRecord.findById(id);
  if (!record) throw httpError(404, 'Record not found');
  return record;
};

const markVerified = (record, user) => {
  record.verified = true;
  record.verifiedBy = user.name;
  record.verifiedAt = new Date();
};

const parsePayment = (body, user) => {
  const amount = Number(body.amount);
  if (!(amount > 0)) throw httpError(400, 'Payment amount must be greater than zero');
  if (body.method && !PAYMENT_METHODS.includes(body.method)) throw httpError(400, 'Unknown payment method');
  return {
    amount,
    date: body.date ? new Date(body.date) : new Date(),
    method: body.method || 'BANK',
    reference: body.reference,
    recordedBy: user.name,
  };
};

// Validate, apply stock changes (which also saves the record), then refresh vendor totals.
// Stock goes first so a stock error leaves the record unchanged.
const commit = async (record, user) => {
  await record.validate();
  await syncRecordStock(record, user);
  await record.save();
  await recalcVendorTotals(record.vendorId);
  return record;
};

const router = Router();

// GET /api/records?vendorId=&category=&status=&from=&to=
router.get('/', async (req, res) => {
  const filter = {};
  for (const key of ['vendorId', 'category', 'status']) {
    if (req.query[key]) filter[key] = req.query[key];
  }
  if (req.query.from || req.query.to) {
    filter.receiptDate = {};
    if (req.query.from) filter.receiptDate.$gte = new Date(req.query.from);
    if (req.query.to) filter.receiptDate.$lte = new Date(`${req.query.to}T23:59:59.999Z`);
  }
  res.json(await BillingRecord.find(filter).sort('-receiptDate -createdAt'));
});

router.get('/categories', (req, res) => res.json(EXPENSE_CATEGORIES));

router.get('/:id', async (req, res) => res.json(await findRecord(req.params.id)));

// Manager: attach or replace the receipt image of an existing bill. The previous file is removed.
router.post('/:id/image', requireManager, upload.single('image'), async (req, res) => {
  if (!req.file) throw httpError(400, 'Upload a PNG, JPG, WebP or PDF file');
  const record = await findRecord(req.params.id);
  const previous = record.imageUrl;
  record.imageUrl = `/uploads/${req.file.filename}`;
  record.billAvailable = true;
  await record.save();
  if (previous) await removeUpload(previous);
  res.json(record);
});

// Any role: create a bill. Either a picked vendor (vendorId) with typed line items,
// or a dashboard quick entry with a typed vendor name (found or created). The quick
// entry can attach a receipt image: it is then sent as multipart form data with the
// bill fields as JSON in a `data` field. All values are typed by the user; the
// image is only stored, not read.
// Only managers/admins can verify or record a payment while creating.
router.post('/', upload.single('image'), async (req, res) => {
  const imageUrl = req.file && `/uploads/${req.file.filename}`;
  try {
    const body = req.is('multipart/form-data') ? JSON.parse(req.body.data ?? '{}') : req.body;
    const vendor = body.vendorId ? await Vendor.findById(body.vendorId) : await findOrCreateVendor(body.vendorName, body.category);
    if (!vendor) throw httpError(404, 'Vendor not found');
    const isManager = ['ADMIN', 'MANAGER'].includes(req.user.role);

    const items = await buildLines(body.items);
    const record = new BillingRecord({
      ...pick(body),
      category: body.category || vendor.defaultCategory,
      source: 'MANUAL',
      vendorId: vendor.id,
      vendorName: vendor.name,
      items,
      createdBy: req.user.name,
      ...(imageUrl && { imageUrl }),
    });
    await attachPreviousPrices(record);
    if (isManager && body.verify) markVerified(record, req.user);
    if (isManager && body.payment) {
      // Default to paying the whole bill.
      const total = items.length ? items.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0) : record.amount;
      const payment = parsePayment({ amount: total, ...body.payment }, req.user);
      if (payment.amount > total + 0.01) throw httpError(400, 'Payment is more than the bill amount');
      record.payments.push(payment);
    }
    record.purchaseInvoiceNo = await nextPurchaseInvoiceNo(vendor.id);

    res.status(201).json(await commit(record, req.user));
  } catch (err) {
    // Don't keep the uploaded file of a bill that was not saved.
    if (imageUrl) await removeUpload(imageUrl);
    if (err instanceof SyntaxError) throw httpError(400, 'Invalid bill data');
    throw err;
  }
});

// Manager: edit fields / line items.
router.patch('/:id', requireManager, async (req, res) => {
  const record = await findRecord(req.params.id);
  record.set(pick(req.body));
  if ('items' in req.body) record.items = await buildLines(req.body.items);
  await attachPreviousPrices(record);
  res.json(await commit(record, req.user));
});

// Manager: verification actions from the inspector.
//   PAID    -> verify + record a payment for the remaining balance
//   PENDING -> verify (adds stock), clear any flag, and set the bill back to unpaid:
//              recorded payments are removed, which (like deleting a payment) is admin-only
//   FLAGGED -> flag / reject (removes stock contribution)
// Optional `changes` (same fields as PATCH) are saved in the same request, so the
// inspector needs one round trip instead of two.
router.post('/:id/status', requireManager, async (req, res) => {
  const record = await findRecord(req.params.id);
  const { status, payment = {}, changes } = req.body;
  if (changes) {
    record.set(pick(changes));
    if ('items' in changes) {
      record.items = await buildLines(changes.items);
      await attachPreviousPrices(record);
    }
  }

  if (status === 'FLAGGED') {
    record.flagged = true;
  } else if (status === 'PENDING' || status === 'PAID') {
    if (status === 'PENDING' && record.payments.length) {
      if (req.user.role !== 'ADMIN') throw httpError(403, 'This bill has payments recorded. Only an admin can set it back to pending.');
      record.payments = [];
    }
    record.flagged = false;
    markVerified(record, req.user);
    const balance = record.amount - record.amountPaid;
    if (status === 'PAID' && balance > 0) {
      record.payments.push(parsePayment({ ...payment, amount: payment.amount ?? balance }, req.user));
    }
  } else {
    throw httpError(400, 'Status must be PAID, PENDING or FLAGGED');
  }
  res.json(await commit(record, req.user));
});

// Manager: record a (partial) payment against a bill.
router.post('/:id/payments', requireManager, async (req, res) => {
  const record = await findRecord(req.params.id);
  if (record.flagged) throw httpError(400, 'Unflag this bill before recording a payment');
  record.payments.push(parsePayment(req.body, req.user));
  res.status(201).json(await commit(record, req.user));
});

// Admin: remove a mistaken payment.
router.delete('/:id/payments/:paymentId', requireAdmin, async (req, res) => {
  const record = await findRecord(req.params.id);
  record.payments.pull(req.params.paymentId);
  res.json(await commit(record, req.user));
});

// Admin: delete a record and its receipt file. Its items are taken back out of stock first.
router.delete('/:id', requireAdmin, async (req, res) => {
  const record = await BillingRecord.findById(req.params.id);
  if (!record) return res.status(204).end();

  record.verified = false;
  await syncRecordStock(record, req.user);
  await record.deleteOne();
  await recalcVendorTotals(record.vendorId);
  if (record.imageUrl) await removeUpload(record.imageUrl);
  res.status(204).end();
});

export default router;
