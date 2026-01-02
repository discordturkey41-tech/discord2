const mongoose = require("mongoose");

const WarnTimeSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  shopId: {
    type: String,
    required: true,
  },
  time: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["unwarned", "warned", "disabled"], 
    default: "unwarned",
  },
});

module.exports = mongoose.model("WarnTime", WarnTimeSchema);
