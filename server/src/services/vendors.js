import Vendor from '../models/Vendor.js';
import { httpError } from '../middleware/errorHandler.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Next free vendor code, e.g. VND-1011 (same scheme as the vendor form and seed).
const nextVendorCode = async () => {
  const vendors = await Vendor.find().select('code');
  const numbers = vendors.map((v) => Number(v.code.match(/(\d+)$/)?.[1])).filter(Boolean);
  return `VND-${Math.max(1000, ...numbers) + 1}`;
};

// Vendor typed by name on a quick entry: reuse a vendor with the same name
// (ignoring case and extra spaces), otherwise create a new one.
export const findOrCreateVendor = async (rawName, defaultCategory) => {
  const name = String(rawName ?? '').trim().replace(/\s+/g, ' ');
  if (!name) throw httpError(400, 'Vendor name is required');

  const existing = await Vendor.findOne({ name: new RegExp(`^\\s*${escapeRegex(name).replace(/ /g, '\\s+')}\\s*$`, 'i') });
  if (existing) return existing;

  // Retry if another request took the same code in the meantime.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await Vendor.create({ name, code: await nextVendorCode(), ...(defaultCategory && { defaultCategory }) });
    } catch (err) {
      if (err.code !== 11000) throw err;
    }
  }
  throw httpError(409, 'Could not create the vendor, please try again');
};
