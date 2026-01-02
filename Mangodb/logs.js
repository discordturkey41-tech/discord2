const mongoose = require('mongoose');

const logsSchema = new mongoose.Schema({
    guildId: String,
    shopLogRoom: String,
    auctionLogRoom: String,
    orderLogRoom: String,
    category: { type: String, default: "Logs" },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Logs', logsSchema);
