const mongoose = require('mongoose');

const rolesSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  name: { type: String, required: true },
  roleId: { type: String, required: true },
  price: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Unique compound index for guildId + name
rolesSchema.index({ guildId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Roles', rolesSchema);
