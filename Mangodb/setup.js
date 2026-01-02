// models/Setup.js (الموديل المعدل)
const mongoose = require("mongoose");

const setupSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  decorationRooms: [String],
  bank: { type: String, default: null },
  line: { type: String, default: null },
  shopMention: { type: String, default: null },
  shopAdmin: { type: String, default: null },
  partnerRole: { type: String, default: null },
  orderRoom: { type: String, default: null },
  orderAdmin: { type: String, default: null },
  orderMention: { type: String, default: null },
  auctionAdmin: { type: String, default: null },
  auctionMention: { type: String, default: null },
  adAdmin: { type: String, default: null },
  adMention: { type: String, default: null },
  logs: { type: String, default: null },
  maximumWarnings: { type: Number, default: null },
  shopTicket: { type: String, default: null },
  orderTicket: { type: String, default: null },
  auctionTicket: { type: String, default: null },
  roleTicket: { type: String, default: null },
  adTicket: { type: String, default: null },
  tax: { type: Number, default: null },
  taxRooms: [String],
  autoLines: [{
    channelId: String,
    lineUrl: String,
    type: String
  }],
    feedbackRooms: [{
        channelId: {
            type: String,
            required: true
        },
        lineUrl: {
            type: String,
            required: true
        }
    }],
  // الحقول الجديدة للضريبة
  taxTime: { type: Number, default: null }, // وقت الضريبة بالميلي ثانية
  lastTaxDate: { type: Date, default: null } // تاريخ آخر ضريبة
});

module.exports = mongoose.model("Setup", setupSchema);