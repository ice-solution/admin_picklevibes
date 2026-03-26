const mongoose = require('mongoose');

const TYPES = ['income', 'expense'];

const transactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: TYPES, required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    category: { type: String, required: true, trim: true },
    note: { type: String, trim: true, default: '' },
    imagePath: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

transactionSchema.index({ date: -1, type: 1 });
transactionSchema.statics.TYPES = TYPES;

module.exports = mongoose.model('Transaction', transactionSchema);
