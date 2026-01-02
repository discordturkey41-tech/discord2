const mongoose = require('mongoose');

const taxSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: Boolean,
        default: false
    },
    tax: {
        type: Number,
        min: 0,
        max: 100
    },
    duration: {
        type: String,
        validate: {
            validator: function(v) {
                return /^(\d+)([smhdwMy])$/.test(v);
            },
            message: props => `${props.value} ليست صيغة مدة صالحة! استخدم مثلاً: 5d أو 2w أو 1m`
        }
    },
    setBy: {
        type: String,
        required: true
    },
    setAt: {
        type: Date,
        default: Date.now
    },
    lastReminderSent: {
        type: Date,
        default: null
    },
    nextPaymentDate: {
        type: Date,
        default: null
    },
    paid: {
        type: Boolean,
        default: false
    },
    paidAt: {
        type: Date,
        default: null
    },
    paidBy: {
        type: String,
        default: null
    }
});

// دالة لحساب تاريخ الدفع التالي
taxSchema.methods.calculateNextPayment = function() {
    if (!this.duration || !this.setAt) return null;
    const durationMs = require('ms')(this.duration);
    return new Date(this.setAt.getTime() + durationMs);
};

// Middleware لحساب تاريخ الدفع التالي قبل الحفظ
taxSchema.pre('save', function(next) {
    if (this.isModified('duration') || this.isModified('setAt')) {
        this.nextPaymentDate = this.calculateNextPayment();
    }
    next();
});

module.exports = {
    Tax: mongoose.model('Tax', taxSchema),
};