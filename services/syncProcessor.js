/**
 * Sync Queue Processor
 * Processes pending syncs from the queue
 * Add this to your main server or bot file
 */

const SyncManager = require('./services/syncManager.js');

// Process sync queue every 30 seconds
setInterval(async () => {
    try {
        await SyncManager.processSyncQueue();
    } catch (error) {
        console.error('[SYNC PROCESSOR ERROR]', error);
    }
}, 30000);

console.log('[SYNC SYSTEM] Initialized - Queue processor running every 30 seconds');

module.exports = { SyncManager };
