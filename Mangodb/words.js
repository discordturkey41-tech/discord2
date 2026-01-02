const mongoose = require('mongoose');

const wordsSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  word: { type: String, required: true, lowercase: true },
  createdAt: { type: Date, default: Date.now }
});

// Unique compound index for guildId + word
wordsSchema.index({ guildId: 1, word: 1 }, { unique: true });

module.exports = mongoose.model('Words', wordsSchema);
