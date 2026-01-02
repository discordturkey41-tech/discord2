const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    ownerId: { type: String, required: true },
    adType: { type: String, required: true },
    messageIds: { type: [String], default: [] },
    mentionMessageIds: { type: [String], default: [] }, // تخزين رسائل المنشنات
    createdAt: { type: Date, default: Date.now },
    type: { type: String, enum: ['room', 'category'], required: true },
    content: { type: String, required: true },
    inviteLink: { type: String, default: null }, // رابط السيرفر
    roomName: { type: String, default: null },
    lastMentionTime: { type: Date, default: null } // وقت آخر منشن
});

module.exports = mongoose.model('Ad', adSchema);