const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  displayName: { type: String, required: true },
  stars: { type: Number, required: true, min: 1, max: 5 },
  reason: { type: String, required: true },
  evidence: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

// إنشاء فهرس مركب لمنع التقييمات المكررة
ratingSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema);