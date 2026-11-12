/**
 * One-time fix: find SaleOut records with empty branch saved on a specific date
 * and print them so you can confirm before updating.
 *
 * Usage on EC2:
 *   node --env-file=.env scripts/fixBranchBahria.js          ← dry-run (list only)
 *   node --env-file=.env scripts/fixBranchBahria.js --apply  ← actually update
 *
 * Run from ~/sugarloop/server/
 */
import { connectDB } from '../src/config/db.js';
import SaleOut from '../src/models/SaleOut.js';
import mongoose from 'mongoose';

const apply = process.argv.includes('--apply');

await connectDB();

// Find all records with no branch set (empty string or null/undefined)
const emptyBranch = await SaleOut.find({ branch: { $in: ['', null] } })
  .sort('-saleDate')
  .lean();

if (emptyBranch.length === 0) {
  console.log('No records found with empty branch.');
  await mongoose.disconnect();
  process.exit(0);
}

console.log(`Found ${emptyBranch.length} record(s) with empty branch:\n`);
emptyBranch.forEach((r) => {
  console.log(`  id=${r._id}  date=${r.saleDate?.toISOString?.().slice(0,10)}  type=${r.type}  total=${r.grandTotal}  entryNo=${r.entryNo}`);
});

if (!apply) {
  console.log('\nDry run — no changes made. Re-run with --apply to update all to "Bahria Phase 4".');
  await mongoose.disconnect();
  process.exit(0);
}

const result = await SaleOut.updateMany(
  { branch: { $in: ['', null] } },
  { $set: { branch: 'Bahria Phase 4' } }
);
console.log(`\nUpdated ${result.modifiedCount} record(s) to branch = "Bahria Phase 4".`);

await mongoose.disconnect();
