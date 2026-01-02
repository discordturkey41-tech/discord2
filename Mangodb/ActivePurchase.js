const mongoose = require("mongoose");

const activePurchaseSchema = new mongoose.Schema({
  guildId: { 
    type: String, 
    required: true 
  },
  userId: { 
    type: String, 
    required: true 
  },
  purchaseType: {
    type: String,
    required: true,
    enum: [
      "name-change",
      "owner-change", 
      "type-change",
      "warn-remove",
      "shape-change",
      "shop-activation", 
      "partner-add",
      "partner-remove",
      "role-add", 
      "role-remove",
      "custom-upgrade",
      "buy-mentions",
      "sell-shop",
      "set-publish-interval",
      "set-publish-message",
      "auto-publish-config"
    ]
  },
  data: {
    channelId: { type: String },
    messages: {
      paymentMessageId: { type: String },
      creditMessageId: { type: String },
      extraMessageId: { type: String }
    },
    price: { type: Number },
    currency: { type: String, default: "$" },

    // حقل جديد لبيع المتجر
    buyerId: { type: String },

    newName: { type: String },
    oldName: { type: String },
    newOwnerId: { type: String },
    oldOwnerId: { type: String },
    newType: { type: String },
    oldType: { type: String },
    warnCount: { type: Number },
    oldWarns: { type: Number },
    partnerId: { type: String },
    partnerAction: { type: String, enum: ["add", "remove"] },
    roleId: { type: String },
    roleAction: { type: String, enum: ["add", "remove"] },
    newShape: { type: String },
    oldShape: { type: String },
    customField: { type: String },
    notes: { type: String },
    taxAmount: { type: Number },
    totalAmount: { type: Number },
    paymentStatus: { type: String, enum: ["pending", "completed", "failed", "cancelled"], default: "pending" },
    transactionId: { type: String },
    bankAccount: { type: String },
    expiresAt: { type: Date },
    
    // حقول المنشنات
    mentionType: { 
      type: String, 
      enum: ["everyone", "here", "shop", "Everyone", "Here", "Shop"]
    },
    mentionCount: { type: Number },
    pricePerMention: { type: Number },
    
    // حقول جديدة للشركاء
    targetUserId: { type: String },
    action: { type: String, enum: ["add", "remove"] },
    partnerData: {
      addedAt: { type: Date },
      addedBy: { type: String },
      removedAt: { type: Date },
      removedBy: { type: String },
      isActive: { type: Boolean, default: true }
    },
    partnerPrice: { type: Number },
    partnerRemovePrice: { type: Number },
    
    // حقول جديدة للنشر التلقائي
    publishInterval: { type: String },
    publishMessage: { type: String },
    autoPublishMention: { type: String, enum: ["everyone", "here", "shop", "none"] }
  },

  metadata: {
    ipAddress: { type: String },
    userAgent: { type: String },
    deviceType: { type: String, enum: ["desktop", "mobile", "tablet", "unknown"] }
  },
  createdAt: { 
    type: Date, 
    default: Date.now, 
    expires: 300
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  versionKey: false,
  timestamps: true
});

// إنشاء الفهارس
activePurchaseSchema.index({ guildId: 1, userId: 1 });
activePurchaseSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });
activePurchaseSchema.index({ "data.paymentStatus": 1 });
activePurchaseSchema.index({ "data.transactionId": 1 });
activePurchaseSchema.index({ purchaseType: 1 });
activePurchaseSchema.index({ "data.targetUserId": 1 });

// middleware للتحديث التلقائي
activePurchaseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

activePurchaseSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model("ActivePurchase", activePurchaseSchema);