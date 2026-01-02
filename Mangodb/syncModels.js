/**
 * NEW METHOD: Real-time Data Sync System
 * Alternative approach using event-based architecture
 * Bot and Website communicate via dedicated sync endpoints
 */

const mongoose = require('mongoose');

// Sync Log Schema - tracks all data changes
const syncLogSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    source: { type: String, enum: ['bot', 'website'], required: true },
    action: { type: String, enum: ['create', 'update', 'delete'], required: true },
    changedFields: { type: Map, of: String },
    timestamp: { type: Date, default: Date.now },
    userId: String,
    status: { type: String, enum: ['pending', 'synced', 'failed'], default: 'pending' }
});

const SyncLog = mongoose.model('SyncLog', syncLogSchema);

// Sync Queue Schema - for reliable delivery
const syncQueueSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    source: { type: String, enum: ['bot', 'website'], required: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    timestamp: { type: Date, default: Date.now },
    retries: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' }
});

const SyncQueue = mongoose.model('SyncQueue', syncQueueSchema);

module.exports = { SyncLog, SyncQueue };
