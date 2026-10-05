import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import Vendor from './models/Vendor.js';
import Item from './models/Item.js';

// Sample Sugarloop vendors and catalog items. Safe to re-run: only adds what's missing.
const vendors = [
  ['InDrive', 'INDRIVE_LOGISTICS'],
  ['Shell Station', 'FUEL_TRANSIT'],
  ['PSO Fuel Station', 'FUEL_TRANSIT'],
  ['Local Hardware Supplies', 'WAREHOUSE_REPAIRS'],
  ['ColdTech Refrigeration Services', 'WAREHOUSE_REPAIRS'],
  ['Metro Cash & Carry', 'RAW_PROCUREMENT'],
  ['Sunridge Flour Mills', 'RAW_PROCUREMENT'],
  ['Fresh Dairy Co.', 'RAW_PROCUREMENT'],
  ['PackRight Packaging', 'RAW_PROCUREMENT'],
  ['Branch Utilities', 'MISC_OPERATIONS'],
].map(([name, defaultCategory], i) => ({ name, defaultCategory, code: `VND-${1001 + i}` }));

const items = [
  ['Flour (Maida)', 'kg', 200],
  ['Sugar', 'kg', 100],
  ['Butter', 'kg', 30],
  ['Milk', 'litre', 50],
  ['Fresh Cream', 'litre', 20],
  ['Eggs', 'dozen', 30],
  ['Cooking Chocolate', 'kg', 15],
  ['Cocoa Powder', 'kg', 10],
  ['Coffee Beans', 'kg', 5],
  ['Cake Boxes', 'pcs', 300],
  ['Bread Bags', 'pcs', 500],
].map(([name, unit, reorderLevel]) => ({ name, unit, reorderLevel }));

const upsertAll = (Model, docs, key) =>
  Promise.all(docs.map((doc) => Model.updateOne({ [key]: doc[key] }, { $setOnInsert: doc }, { upsert: true })));

await connectDB();
await upsertAll(Vendor, vendors, 'code');
await upsertAll(Item, items, 'name');
console.log(`Seeded ${vendors.length} vendors and ${items.length} items (existing ones left untouched)`);
await mongoose.disconnect();
