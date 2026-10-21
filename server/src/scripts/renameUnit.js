// Rename a unit on catalog items and on the unit saved with past bill and return lines.
// Usage: npm run rename-unit -- <from> <to>   e.g. npm run rename-unit -- g gms
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Item, { UNITS } from '../models/Item.js';
import BillingRecord from '../models/BillingRecord.js';
import PurchaseReturn from '../models/PurchaseReturn.js';

const [from, to] = process.argv.slice(2);
if (!from || !UNITS.includes(to)) {
  console.error(`Usage: npm run rename-unit -- <from> <to>  (to is one of: ${UNITS.join(', ')})`);
  process.exit(1);
}

await connectDB();
const lines = { $set: { 'items.$[line].unit': to } };
const options = { arrayFilters: [{ 'line.unit': from }] };
const items = await Item.updateMany({ unit: from }, { $set: { unit: to } });
const bills = await BillingRecord.updateMany({ 'items.unit': from }, lines, options);
const returns = await PurchaseReturn.updateMany({ 'items.unit': from }, lines, options);
console.log(`"${from}" -> "${to}": ${items.modifiedCount} items, ${bills.modifiedCount} bills, ${returns.modifiedCount} returns`);
await mongoose.disconnect();
