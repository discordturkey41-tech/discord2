const mongoose = require('mongoose');

const priceSchema = new mongoose.Schema({

  guildId: String,

  removeWarnPrice: Number,

  changeNamePrice: Number,

  changeOwnerPrice: Number,

  addPartnersPrice: Number,

  removePartnersPrice: Number,

  changeShapePrice: Number,

  orderEveryPrice: Number,

  orderHerePrice: Number,

  orderMentionPrice: Number,

  auctionEveryPrice: Number,

  auctionHerePrice: Number,

  auctionMentionPrice: Number,

  everyonePrice: Number,

  herePrice: Number,

  shopMentionPrice: Number

});

module.exports = mongoose.model('Prices', priceSchema);