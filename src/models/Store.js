const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

storeSchema.index({ active: 1, name: 1 });

module.exports = mongoose.model('Store', storeSchema);

