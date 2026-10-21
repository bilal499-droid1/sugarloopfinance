import BillingRecord from '../models/BillingRecord.js';
import Item, { UNITS } from '../models/Item.js';
import Vendor from '../models/Vendor.js';
import { httpError } from '../middleware/errorHandler.js';
import { escapeRegex } from './vendors.js';

// Next per-vendor purchase invoice number, e.g. PI-VND1001-0001. Atomic per vendor.
export const nextPurchaseInvoiceNo = async (vendorId) => {
  const vendor = await Vendor.findByIdAndUpdate(vendorId, { $inc: { invoiceSeq: 1 } }, { returnDocument: 'after' });
  return `PI-${vendor.code.replace(/[^A-Z0-9]/g, '')}-${String(vendor.invoiceSeq).padStart(4, '0')}`;
};

// Product typed by name on a bill line: reuse an item with the same name (ignoring
// case and extra spaces), otherwise add it to the catalog with no stock — only if
// `create` is allowed (staff can't add items). Its stock arrives when the bill is verified.
const findOrCreateItem = async (rawName, unit, { create = false } = {}) => {
  const name = String(rawName ?? '').trim().replace(/\s+/g, ' ');
  if (!name) throw httpError(400, 'A line item refers to an item that is not in the catalog');
  const findByName = () => Item.findOne({ name: new RegExp(`^\\s*${escapeRegex(name).replace(/ /g, '\\s+')}\\s*$`, 'i') });

  const existing = await findByName();
  if (existing) return existing;
  if (!create) throw httpError(403, `"${name}" isn't in Inventory. Ask a manager to add the product first.`);
  if (!UNITS.includes(unit)) throw httpError(400, `Pick a unit for ${name}`);
  try {
    return await Item.create({ name, unit });
  } catch (err) {
    // Another request added the same product in the meantime.
    if (err.code === 11000) return findByName();
    throw err;
  }
};

// Validate line items against the catalog and snapshot name/unit. A line can name a
// new product instead (itemName + unit, no itemId); see findOrCreateItem. New products
// are only added once every line is valid, so a rejected line adds nothing.
export const buildLines = async (lines = [], { createItems = false } = {}) => {
  if (!Array.isArray(lines)) throw httpError(400, 'Line items must be a list');
  if (!lines.length) return [];
  const items = await Item.find({ _id: { $in: lines.filter((l) => l.itemId).map((l) => l.itemId) } });
  const byId = new Map(items.map((i) => [i.id, i]));
  const checked = lines.map((line) => {
    const item = line.itemId && byId.get(String(line.itemId));
    if (line.itemId && !item) throw httpError(400, 'A line item refers to an item that is not in the catalog');
    const name = item?.name ?? String(line.itemName ?? '').trim();
    const quantity = Number(line.quantity);
    const unitPrice = Number(line.unitPrice);
    if (!(quantity > 0)) throw httpError(400, `Quantity for ${name} must be greater than zero`);
    if (!(unitPrice >= 0)) throw httpError(400, `Unit price for ${name} is invalid`);
    return { line, item, quantity, unitPrice };
  });

  // One line at a time, so a new product on two lines is only added once.
  const built = [];
  for (const { line, item: known, quantity, unitPrice } of checked) {
    const item = known || (await findOrCreateItem(line.itemName, line.unit, { create: createItems }));
    built.push({ itemId: item.id, itemName: item.name, unit: item.unit, quantity, unitPrice });
  }
  return built;
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
