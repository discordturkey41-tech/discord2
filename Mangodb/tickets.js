const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    userId: { type: String, required: true },       // ID of the user who opened the ticket
    guildId: { type: String, required: true },     // ID of the guild where ticket was opened
    channelId: { type: String, required: true },    // ID of the ticket channel
    ticketType: { type: String, required: true },   // Type of ticket (e.g., 'shop')
    closed: { type: Boolean, default: false },      // Whether ticket is closed
    createdAt: { type: Date, default: Date.now },   // When ticket was created
    closedAt: { type: Date }, 
   auctionMentionType:{type:String,default:null},
    auctionMentionName:{type:String,default:null},auctionPrice:{type: Number, default: 0}, 
    auctionData:{type:Object, default:{}}, 
    dataEntryMessageId:{type: String, default:null}, 
    auctionChannelId:{type: String, default:null} 
    // When ticket was closed
});

module.exports = mongoose.model('Ticket', ticketSchema);