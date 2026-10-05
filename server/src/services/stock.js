import Item from '../models/Item.js';
import StockMovement from '../models/StockMovement.js';
import { httpError } from '../middleware/errorHandler.js';

// Apply a signed quantity change to an item and log it. Refuses to go below zero.
export const moveStock = async ({ itemId, change, type, user, recordId, branch, reason }) => {
  if (!change) return null;

  const item = await Item.findOneAndUpdate(
    { _id: itemId, ...(change < 0 ? { inHand: { $gte: -change } } : {}) },
    { $inc: { inHand: change } },
    { returnDocument: 'after' }
  );
  if (!item) {
    const existing = await Item.findById(itemId);
    if (!existing) throw httpError(404, 'Item not found');
    throw httpError(400, `Not enough ${existing.name} in hand (${existing.inHand} ${existing.unit} available)`);
  }

  return StockMovement.create({
    itemId: item.id,
    itemName: item.name,
    type,
    change,
    before: item.inHand - change,
    after: item.inHand,
    recordId,
    branch,
    reason,
    userId: user?.id,
    userName: user?.name,
  });
};

// Set an item's in-hand quantity to an exact value (admin correction).
export const adjustStock = async ({ itemId, quantity, reason, user }) => {
  const item = await Item.findById(itemId);
  if (!item) throw httpError(404, 'Item not found');
  return moveStock({ itemId, change: quantity - item.inHand, type: 'ADJUSTMENT', reason, user });
};

// Bring warehouse stock in line with a billing record. A record contributes its
// line quantities only while it is verified and not flagged; this applies the
// difference from what it contributed before, so edits and flags self-correct.
export const syncRecordStock = async (record, user) => {
  const counts = record.verified && !record.flagged;
  const target = new Map();
  if (counts) {
    for (const line of record.items) {
      const key = String(line.itemId);
      target.set(key, (target.get(key) ?? 0) + line.quantity);
    }
  }
  const applied = new Map(record.stockApplied.map((s) => [String(s.itemId), s.quantity]));

  const changes = [...new Set([...target.keys(), ...applied.keys()])]
    .map((itemId) => ({ itemId, change: (target.get(itemId) ?? 0) - (applied.get(itemId) ?? 0) }))
    .filter(({ change }) => change);

  // Check every removal up front so we never apply half of a change.
  const removals = changes.filter(({ change }) => change < 0);
  const stock = removals.length === 0 ? [] : await Item.find({ _id: { $in: removals.map((c) => c.itemId) } });
  for (const { itemId, change } of removals) {
    const item = stock.find((i) => i.id === itemId);
    if (item && item.inHand < -change) {
      throw httpError(
        400,
        `Can't remove ${-change} ${item.unit} of ${item.name} from stock: only ${item.inHand} in hand (some was already transferred out). Adjust stock first.`
      );
    }
  }

  for (const { itemId, change } of changes) {
    await moveStock({
      itemId,
      change,
      type: change > 0 ? 'RECEIPT_IN' : 'RECEIPT_REVERSAL',
      recordId: record.id,
      reason: `${record.vendorName} ${record.invoiceNumber ?? ''}`.trim(),
      user,
    });
    // Persist after every movement so a later failure can't leave stock and record out of step.
    applied.set(itemId, target.get(itemId) ?? 0);
    record.stockApplied = [...applied].filter(([, q]) => q).map(([id, quantity]) => ({ itemId: id, quantity }));
    await record.save();
  }
};
