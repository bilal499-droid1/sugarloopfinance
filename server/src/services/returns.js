import BillingRecord from '../models/BillingRecord.js';
import Item from '../models/Item.js';
import PurchaseReturn from '../models/PurchaseReturn.js';
import Vendor from '../models/Vendor.js';
import { httpError } from '../middleware/errorHandler.js';
import { buildLines } from './invoices.js';
import { moveStock } from './stock.js';

const sumByItem = (lines) => {
  const totals = new Map();
  for (const line of lines) totals.set(String(line.itemId), (totals.get(String(line.itemId)) ?? 0) + line.quantity);
  return totals;
};

// Next per-vendor return number, e.g. PR-VND1001-0001. Atomic per vendor.
export const nextReturnNo = async (vendorId) => {
  const vendor = await Vendor.findByIdAndUpdate(vendorId, { $inc: { returnSeq: 1 } }, { returnDocument: 'after' });
  return `PR-${vendor.code.replace(/[^A-Z0-9]/g, '')}-${String(vendor.returnSeq).padStart(4, '0')}`;
};

// Validate return lines against the catalog and, when the return is against a
// bill, against what that bill still has un-returned.
export const buildReturnLines = async (lines, { vendorId, recordId, excludeId }) => {
  const built = await buildLines(lines);
  if (!built.length) throw httpError(400, 'Add at least one item to return');
  if (!recordId) return { items: built };

  const record = await BillingRecord.findById(recordId);
  if (!record) throw httpError(404, 'Original bill not found');
  if (String(record.vendorId) !== String(vendorId)) throw httpError(400, 'The original bill belongs to a different vendor');

  const bought = sumByItem(record.items);
  const others = await PurchaseReturn.find({ recordId, _id: { $ne: excludeId } }).select('items');
  const returned = sumByItem(others.flatMap((r) => r.items));
  for (const [itemId, quantity] of sumByItem(built)) {
    const line = built.find((l) => l.itemId === itemId);
    if (!bought.has(itemId)) throw httpError(400, `${line.itemName} is not on the original bill`);
    const left = bought.get(itemId) - (returned.get(itemId) ?? 0);
    if (quantity > left + 1e-9) throw httpError(400, `Only ${left} ${line.unit} of ${line.itemName} left to return on that bill`);
  }
  return { items: built, record };
};

// Bring warehouse stock in line with a return: its quantities are kept out of
// stock; edits apply only the difference and a deleted return (target empty)
// puts everything back.
export const syncReturnStock = async (ret, user, { remove = false } = {}) => {
  const target = remove ? new Map() : sumByItem(ret.items);
  const applied = new Map(ret.stockApplied.map((s) => [String(s.itemId), s.quantity]));

  // Positive `more` = more to take out of stock.
  const changes = [...new Set([...target.keys(), ...applied.keys()])]
    .map((itemId) => ({ itemId, more: (target.get(itemId) ?? 0) - (applied.get(itemId) ?? 0) }))
    .filter(({ more }) => more);

  // Check every removal up front so we never apply half of a change.
  const removals = changes.filter(({ more }) => more > 0);
  const stock = removals.length ? await Item.find({ _id: { $in: removals.map((c) => c.itemId) } }) : [];
  for (const { itemId, more } of removals) {
    const item = stock.find((i) => i.id === itemId);
    if (item && item.inHand < more) {
      throw httpError(400, `Can't return ${more} ${item.unit} of ${item.name}: only ${item.inHand} in hand.`);
    }
  }

  for (const { itemId, more } of changes) {
    await moveStock({
      itemId,
      change: -more,
      type: more > 0 ? 'RETURN_OUT' : 'RETURN_REVERSAL',
      returnId: ret.id,
      reason: `Return to ${ret.vendorName} ${ret.returnNo ?? ''}`.trim(),
      user,
    });
    applied.set(itemId, target.get(itemId) ?? 0);
    ret.stockApplied = [...applied].filter(([, q]) => q).map(([id, quantity]) => ({ itemId: id, quantity }));
    await ret.save();
  }
};
