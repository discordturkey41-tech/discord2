// Mongodb/autoPublish.js
const mongoose = require('mongoose');

const autoPublishSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    enabled: { type: Boolean, default: false },
    interval: { 
        type: String, 
        default: "1h", 
        validate: {
            validator: function(v) {
                return /^\d+[smhdw]$/.test(v);
            },
            message: props => `${props.value} is not a valid time format! Use format like: 1h, 30m, 2d`
        }
    },
    message: { 
        type: String, 
        maxlength: 2000,
        default: "" 
    },
    mentionType: { 
        type: String, 
        enum: ['everyone', 'here', 'shop', 'none'],
        default: 'none'
    },
    maxTimes: { 
        type: Number, 
        default: null, // null يعني للأبد
        min: 1,
        max: 1000
    },
    timesPublished: { 
        type: Number, 
        default: 0 
    },
    setBy: {
        userId: { type: String, required: true },
        username: { type: String, required: true },
        avatar: { type: String }
    },
    webhookData: {
        id: { type: String },
        token: { type: String },
        url: { type: String }
    },
    lastPublished: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// مركب index لضمان عدم وجود أكثر من إعداد لكل قناة
autoPublishSchema.index({ guildId: 1, channelId: 1 }, { unique: true });
autoPublishSchema.index({ enabled: 1 });
autoPublishSchema.index({ lastPublished: 1 });

module.exports = mongoose.models.AutoPublish || mongoose.model('AutoPublish', autoPublishSchema);