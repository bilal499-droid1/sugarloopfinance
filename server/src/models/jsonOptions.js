// Shared schema options: expose `id`, hide `_id` / `__v`.
export const jsonOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      delete ret._id;
      delete ret.__v;
    },
  },
};
