import Item from '../models/Item.js';
import { moveStock } from './stock.js';
import { httpError } from '../middleware/errorHandler.js';

// Auto-generate the next sale invoice number for a customer: SI-CST1001-0001
export const nextSaleInvoiceNo = async (customer) => {
  const { default: SaleRecord } = await import('../models/SaleRecord.js');
  const last = await SaleRecord.findOne({ customerId: customer._id }).sort('-saleInvoiceNo').select('saleInvoiceNo');
  const prefix = `SI-${customer.code}`;
  const seq = last?.saleInvoiceNo?.startsWith(prefix)
    ? parseInt(last.saleInvoiceNo.split('-').pop(), 10) + 1
    : 1;
  return `${prefix}-${String(seq).padStart(4, '0')}`;
};

// Sync warehouse stock with a sale record. Sales deduct stock immediately (no verification step).
// target = what this sale sells now; applied = what was previously deducted; diff is applied.
export const syncSaleStock = async (sale, user) => {
  const target = new Map();
  for (const line of sale.items) {
    const key = String(line.itemId);
    target.set(key, (target.get(key) ?? 0) + line.quantity);
  }
  const applied = new Map((sale.stockApplied ?? []).map((s) => [String(s.itemId), s.quantity]));

  const changes = [...new Set([...target.keys(), ...applied.keys()])]
    .map((itemId) => ({ itemId, change: (target.get(itemId) ?? 0) - (applied.get(itemId) ?? 0) }))
    .filter(({ change }) => change);

  // Pre-check: ensure stock is available for every net increase (more being sold).
  const additions = changes.filter(({ change }) => change > 0);
  if (additions.length) {
    const stock = await Item.find({ _id: { $in: additions.map((c) => c.itemId) } });
    for (const { itemId, change } of additions) {
      const item = stock.find((i) => String(i._id) === itemId);
      if (item && item.inHand < change) {
        throw httpError(400, `Not enough ${item.name} in stock (${item.inHand} ${item.unit} available, need ${change}).`);
      }
    }
  }

  for (const { itemId, change } of changes) {
    await moveStock({
      itemId,
      change: -change, // positive sale qty → negative stock change
      type: change > 0 ? 'SALE_OUT' : 'SALE_REVERSAL',
      saleId: sale._id,
      reason: sale.customerName,
      user,
    });
    applied.set(itemId, target.get(itemId) ?? 0);
    sale.stockApplied = [...applied].filter(([, q]) => q).map(([id, quantity]) => ({ itemId: id, quantity }));
    await sale.save();
  }
};
