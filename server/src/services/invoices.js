import BillingRecord from '../models/BillingRecord.js';
import Item from '../models/Item.js';
import Vendor from '../models/Vendor.js';
import { httpError } from '../middleware/errorHandler.js';

// Next per-vendor purchase invoice number, e.g. PI-VND1001-0001. Atomic per vendor.
export const nextPurchaseInvoiceNo = async (vendorId) => {
  const vendor = await Vendor.findByIdAndUpdate(vendorId, { $inc: { invoiceSeq: 1 } }, { returnDocument: 'after' });
  return `PI-${vendor.code.replace(/[^A-Z0-9]/g, '')}-${String(vendor.invoiceSeq).padStart(4, '0')}`;
};

// Validate line items against the catalog and snapshot name/unit.
export const buildLines = async (lines = []) => {
  if (!Array.isArray(lines)) throw httpError(400, 'Line items must be a list');
  if (!lines.length) return [];
  const items = await Item.find({ _id: { $in: lines.map((l) => l.itemId) } });
  const byId = new Map(items.map((i) => [i.id, i]));
  return lines.map((line) => {
    const item = byId.get(String(line.itemId));
    if (!item) throw httpError(400, 'A line item refers to an item that is not in the catalog');
    const quantity = Number(line.quantity);
    const unitPrice = Number(line.unitPrice);
    if (!(quantity > 0)) throw httpError(400, `Quantity for ${item.name} must be greater than zero`);
    if (!(unitPrice >= 0)) throw httpError(400, `Unit price for ${item.name} is invalid`);
    return { itemId: item.id, itemName: item.name, unit: item.unit, quantity, unitPrice };
  });
};

// For each line, store the unit price this vendor charged on its previous
// (non-flagged) bill for the same item, so price changes can be highlighted.
export const attachPreviousPrices = async (record) => {
  for (const line of record.items) {
    const previous = await BillingRecord.findOne({
      _id: { $ne: record._id },
      vendorId: record.vendorId,
      status: { $ne: 'FLAGGED' },
      'items.itemId': line.itemId,
      receiptDate: { $lte: record.receiptDate },
    })
      .sort('-receiptDate -createdAt')
      .select('items');
    line.previousUnitPrice = previous?.items.find((l) => String(l.itemId) === String(line.itemId))?.unitPrice;
  }
};
