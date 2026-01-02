const mongoose = require('mongoose');

const auctionSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
    timeMessageId: { type: String, required: true },
    item: { type: String, required: true },
    ownerId: { type: String, required: true },
    startPrice: { type: String, required: true },
    currentPrice: { type: String, required: true },
    tax: { type: String, required: true },
    endTime: { type: Number, required: true },
    active: { type: Boolean, default: true },
    paused: { type: Boolean, default: false },
    pausedTime: { type: Number, default: 0 },
    everyoneMentions: { type: Number, default: 0 },
    hereMentions: { type: Number, default: 0 },
    auctionMentions: { type: Number, default: 0 },
    lastEveryoneMention: { type: Number, default: 0 },
    lastHereMention: { type: Number, default: 0 },
    lastAuctionMention: { type: Number, default: 0 },
    lastMentionTime: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    stoppedAt: { type: Date, default: null },
    remainingTime: { type: Number, default: 0 },
    paused: { type: Boolean, default: false },
    remainingTime: { type: Number, default: 0 },
    photos: { type: [String], default: [] }
});

module.exports = mongoose.model('Auction', auctionSchema);