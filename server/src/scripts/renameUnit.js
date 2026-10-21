// Rename units on catalog items and on the unit saved with past bill and return lines.
// Usage: npm run rename-unit -- <from> <to>   e.g. npm run rename-unit -- g Gms
//        npm run rename-unit                  sets every listed unit to its listed capitals (kg -> Kg)
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Item, { UNITS, canonicalUnit } from '../models/Item.js';
import BillingRecord from '../models/BillingRecord.js';
import PurchaseReturn from '../models/PurchaseReturn.js';
import { escapeRegex } from '../services/vendors.js';

const args = process.argv.slice(2);
const to = canonicalUnit(args[1]);
if (args.length && (!args[0] || !UNITS.includes(to))) {
  console.error(`Usage: npm run rename-unit -- <from> <to>  (to is one of: ${UNITS.join(', ')})`);
  process.exit(1);
}

// [match for the old unit, new unit]: the one rename asked for, or each listed unit in any other case.
const renames = args.length
  ? [[args[0], to]]
  : UNITS.map((unit) => [{ $regex: `^${escapeRegex(unit)}$`, $options: 'i', $ne: unit }, unit]);

await connectDB();
for (const [match, unit] of renames) {
  const lines = { $set: { 'items.$[line].unit': unit } };
  const options = { arrayFilters: [{ 'line.unit': match }] };
  const items = await Item.updateMany({ unit: match }, { $set: { unit } });
  const hasLine = { items: { $elemMatch: { unit: match } } }; // per line, so a bill's other lines don't matter
  const bills = await BillingRecord.updateMany(hasLine, lines, options);
  const returns = await PurchaseReturn.updateMany(hasLine, lines, options);
  if (items.modifiedCount || bills.modifiedCount || returns.modifiedCount) {
    console.log(`-> "${unit}": ${items.modifiedCount} items, ${bills.modifiedCount} bills, ${returns.modifiedCount} returns`);
  }
}
console.log('Done');
await mongoose.disconnect();
