/**
 * Seed dummy Sale Out entries for local testing.
 * Usage: node --env-file=.env scripts/seedSaleOut.js
 */
import { connectDB } from '../src/config/db.js';
import SaleOut from '../src/models/SaleOut.js';
import mongoose from 'mongoose';

const BRANCHES = ['DHA Phase 1', 'DHA Phase 2', 'Bahria Phase 4', 'NUST 1', 'NUST 2'];

const PERISHABLE_ITEMS = [
  { name: 'Chocoholic', price: 299 },
  { name: 'Boston', price: 299 },
  { name: 'Nutella', price: 299 },
  { name: 'Butter Cream', price: 299 },
  { name: 'Salted Caramel', price: 299 },
];

const NP_ITEMS = [
  { name: 'Classic Cake Slice', price: 450 },
  { name: 'Red Velvet Slice', price: 550 },
];

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const makeDates = () => {
  const dates = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
};

let counter = 1000;
const nextEntryNo = () => `SO-${String(++counter).padStart(4, '0')}`;

const makeDocs = () => {
  const docs = [];
  const dates = makeDates();

  for (const date of dates) {
    for (const branch of BRANCHES) {
      // Perishable entry
      const pLines = PERISHABLE_ITEMS.map((it) => {
        const qty = rand(2, 20);
        return { category: 'Donuts', itemName: it.name, unit: 'per', qty, received: qty - rand(0, 2), price: it.price, total: qty * it.price };
      });
      const pTotal = pLines.reduce((s, l) => s + l.qty * l.price, 0);
      docs.push({
        saleDate: new Date(date),
        type: 'perishable',
        branch,
        lines: pLines,
        grandTotal: pTotal,
        entryNo: nextEntryNo(),
        createdBy: 'seed-script',
      });

      // Non-perishable entry (only on first two dates to show variety)
      if (dates.indexOf(date) < 2) {
        const nLines = NP_ITEMS.map((it) => {
          const qty = rand(1, 8);
          return { category: 'Cakes', itemName: it.name, unit: 'per', qty, received: qty, price: it.price, total: qty * it.price };
        });
        const nTotal = nLines.reduce((s, l) => s + l.qty * l.price, 0);
        docs.push({
          saleDate: new Date(date),
          type: 'nonperishable',
          branch,
          lines: nLines,
          grandTotal: nTotal,
          entryNo: nextEntryNo(),
          createdBy: 'seed-script',
        });
      }
    }
  }
  return docs;
};

await connectDB();
console.log('Inserting seed data…');

const docs = makeDocs();
await SaleOut.insertMany(docs);
console.log(`Inserted ${docs.length} Sale Out entries across ${BRANCHES.length} branches.`);
await mongoose.disconnect();
