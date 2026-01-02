const mongoose = require('mongoose');

const saleStateSchema = new mongoose.Schema({
  guildId: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    required: true,
    enum: [
      "shop_type",
      "full_shop_sale",
      "auction",
      "orders",
      // الخدمات
      "partners",
      "rename_shop",
      "change_owner",
      "change_style",
      "auto_post",
      "buy_mentions",
      "delete_shop",
      "auto_activate_shop",
      "vacation_request",
      "remove_warnings",
      "change_shop_type"
    ]
  },
  state: { 
    type: String, 
    required: true,
    enum: ["enable", "disable"],
    default: "enable"
  },
  // إضافة حقل جديد لتخزين أنواع المتاجر المعطلة
  disabledTypes: [{ 
    type: String 
  }]
});

saleStateSchema.index({ guildId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('SaleState', saleStateSchema);