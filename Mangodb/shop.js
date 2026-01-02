const mongoose = require('mongoose');

const warningSchema = new mongoose.Schema({
    warningNumber: Number,
    reason: String,
    warnedBy: String,
    warnedAt: { type: Date, default: Date.now },
    evidence: String,
    imageUrl: String, // ← رابط الصورة من Imgbb
    messageId: String, // ← معرف الرسالة الأصلية
    channelId: String, // ← معرف القناة
    wordsFound: [String], // ← الكلمات المحظورة التي تم العثور عليها
    messageContent: String // ← محتوى الرسالة الأصلية
});

const shopSchema = new mongoose.Schema({
    guildId: String,
    channelId: String,
    ownerId: String,
    type: String,
    maxWarns: { type: Number, default: 5 },
    time: String,
    emoji: String,
    status: String,
    vacation: String,
    vacationData: {
        reason: String,
        duration: String,
        requestedAt: Date,
        approvedAt: Date,
        endsAt: Date,
        approvedBy: String
    },
    role: String,
    everyone: Number,
    here: Number,
    shop: Number,
    warns: { type: Number, default: 0 },
    partners: { type: Array, default: [] },
    shape: String,
    tax: Number,
    lastTaxPayment: Date,
    taxPaid: { type: String, default: "no" },
    statusSend: { type: String, default: "active" },
    warnings: [warningSchema], // سجل التحذيرات
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Shop', shopSchema);