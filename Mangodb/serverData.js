const mongoose = require('mongoose');

const serverDataSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  // Shop owner/admin data
  shopOwners: [String],
  // Transaction history
  transactions: [{
    userId: String,
    shopId: String,
    type: String, // 'purchase', 'service', etc
    amount: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  // Warnings/violations
  warnings: [{
    userId: String,
    shopId: String,
    reason: String,
    issuedBy: String,
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ServerData', serverDataSchema);
