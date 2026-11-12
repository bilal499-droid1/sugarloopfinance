/**
 * Diagnostic: list all SaleOut records from the last 30 days with branch + type.
 * Usage on EC2 (from ~/sugarloop/server/):
 *   node --env-file=.env scripts/diagSaleOut.js
 */
import { connectDB } from '../src/config/db.js';
import SaleOut from '../src/models/SaleOut.js';
import mongoose from 'mongoose';

await connectDB();

const since = new Date();
since.setDate(since.getDate() - 30);

const records = await SaleOut.find({ saleDate: { $gte: since } })
  .sort('-saleDate -createdAt')
  .lean();

console.log(`\nTotal records in last 30 days: ${records.length}\n`);
console.log('date        | type          | branch             | entryNo   | total');
console.log('------------|---------------|--------------------|-----------|------');
records.forEach((r) => {
  const date = r.saleDate?.toISOString?.().slice(0, 10) ?? '???';
  const type = (r.type ?? '').padEnd(13);
  const branch = (r.branch ?? '(empty)').padEnd(18);
  const entry = (r.entryNo ?? '').padEnd(9);
  console.log(`${date} | ${type} | ${branch} | ${entry} | ${r.grandTotal}`);
});

await mongoose.disconnect();
