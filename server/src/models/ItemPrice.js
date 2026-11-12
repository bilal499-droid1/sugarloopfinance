import mongoose from 'mongoose';

const itemPriceSchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true },
    type: { type: String, enum: ['perishable', 'nonperishable'], required: true },
    price: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

itemPriceSchema.index({ itemName: 1, type: 1 }, { unique: true });

export default mongoose.model('ItemPrice', itemPriceSchema);
