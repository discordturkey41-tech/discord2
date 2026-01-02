const mongoose = require('mongoose');

const typeSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  name: { type: String, required: true },
  category: String,
  everyoneMention: Number,
  hereMention: Number,
  shopMention: Number,
  maxWarns: Number,
  role: String,
  emoji: String,
  shape: String,
  price: Number,
  tax: Number,
  createdAt: { type: Date, default: Date.now }
});

// Create a compound index for guildId + name to ensure uniqueness per guild
typeSchema.index({ guildId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Types', typeSchema);
