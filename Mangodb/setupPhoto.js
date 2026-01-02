// File: models/setupPhoto.js
const mongoose = require('mongoose');

const setupPhotoSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    // صور التكتات
    ticketShopPhoto: { type: String, default: null },
    ticketAuctionPhoto: { type: String, default: null },
    ticketOrderPhoto: { type: String, default: null },
    ticketRolePhoto: { type: String, default: null },
    
    // صور الأسعار
    priceShopPhoto: { type: String, default: null },
    priceAuctionPhoto: { type: String, default: null },
    priceOrderPhoto: { type: String, default: null },
    priceRolePhoto: { type: String, default: null },
    
    // الصور الجديدة
    allTicketPhoto: { type: String, default: null },    // صورة جميع التكتات
    allPricePhoto: { type: String, default: null },     // صورة جميع الأسعار
    
    // تواريخ التحديث
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('SetupPhoto', setupPhotoSchema);