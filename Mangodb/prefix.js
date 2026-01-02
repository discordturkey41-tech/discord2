const mongoose = require("mongoose");

const prefixSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  mentionShop: { type: String, default: null },
  addDataShop: { type: String, default: null },
  createShop: { type: String, default: null },
  warnShop: { type: String, default: null },
  unwarnShop: { type: String, default: null },
  warnsShop: { type: String, default: null },
  disableShop: { type: String, default: null },
  activeShop: { type: String, default: null },
  deleteShop: { type: String, default: null }
});

module.exports = mongoose.model("Prefix", prefixSchema);
