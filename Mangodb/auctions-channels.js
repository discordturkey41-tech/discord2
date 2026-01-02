const mongoose = require('mongoose');
const auctionSchema = new mongoose.Schema({

    guildId: { type: String, required: true },

    channelId: { type: String, required: true },
  isActive:{type:Boolean, default: false}
    });
const Auction = mongoose.model('AuctionChannelss', auctionSchema);


module.exports = Auction  