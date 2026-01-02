const mongoose = require('mongoose');

const punishmentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { type: String, enum: ['reporter', 'reported'], required: true },
  duration: { type: String, required: true }, // m, h, d, w, mo, y
  endsAt: { type: Date, required: true },
  punishedBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const reportSchema = new mongoose.Schema({
  reporterId: { type: String, required: true },
  reportedId: { type: String, required: true },
  reason: { type: String, required: true },
  messageContent: { type: String, default: null },
  status: { type: String, enum: ['pending', 'resolved'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const orderCooldownSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  targetId: { type: String, required: true },
  lastContact: { type: Date, default: Date.now }
});

module.exports = {
  Punishment: mongoose.model('Punishment', punishmentSchema),
  Report: mongoose.model('Report', reportSchema),
  OrderCooldown: mongoose.model('OrderCooldown', orderCooldownSchema)
};
