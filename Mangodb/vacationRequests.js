const mongoose = require('mongoose');

const vacationRequestSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  reason: { type: String, required: true },
  duration: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectedReason: { type: String },
  requestedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date },
  reviewedBy: { type: String },
  vacationEnds: { type: Date }
}, { timestamps: true });

vacationRequestSchema.index({ guildId: 1, channelId: 1 });
vacationRequestSchema.index({ status: 1 });

module.exports = mongoose.model('VacationRequest', vacationRequestSchema);