/**
 * Sync Manager Service
 * Handles bidirectional data synchronization
 */

const { SyncLog, SyncQueue } = require('../Mangodb/syncModels');
const Setup = require('../Mangodb/setup');

class SyncManager {
    /**
     * Log a sync event
     */
    static async logSync(guildId, source, action, changedFields, userId = null) {
        try {
            const log = new SyncLog({
                guildId,
                source,
                action,
                changedFields,
                userId,
                status: 'synced'
            });
            await log.save();
            console.log(`[SYNC LOG] ${source} → ${action} for guild ${guildId}`);
            return log;
        } catch (error) {
            console.error('Error logging sync:', error);
        }
    }

    /**
     * Add data to sync queue
     */
    static async queueSync(guildId, source, data) {
        try {
            const queueItem = new SyncQueue({
                guildId,
                source,
                data,
                status: 'pending'
            });
            await queueItem.save();
            console.log(`[SYNC QUEUE] Added ${source} sync for guild ${guildId}`);
            return queueItem;
        } catch (error) {
            console.error('Error queuing sync:', error);
        }
    }

    /**
     * Get sync history for a guild
     */
    static async getSyncHistory(guildId, limit = 20) {
        try {
            return await SyncLog.find({ guildId })
                .sort({ timestamp: -1 })
                .limit(limit);
        } catch (error) {
            console.error('Error getting sync history:', error);
            return [];
        }
    }

    /**
     * Get pending sync items
     */
    static async getPendingSyncs() {
        try {
            return await SyncQueue.find({ status: 'pending' }).sort({ timestamp: 1 });
        } catch (error) {
            console.error('Error getting pending syncs:', error);
            return [];
        }
    }

    /**
     * Process sync queue
     */
    static async processSyncQueue() {
        try {
            const pendingItems = await this.getPendingSyncs();
            console.log(`[SYNC PROCESSOR] Processing ${pendingItems.length} pending items`);

            for (const item of pendingItems) {
                await this.processSyncItem(item);
            }
        } catch (error) {
            console.error('Error processing sync queue:', error);
        }
    }

    /**
     * Process individual sync item
     */
    static async processSyncItem(item) {
        try {
            item.status = 'processing';
            await item.save();

            // Apply the sync data
            const setup = await Setup.findOneAndUpdate(
                { guildId: item.guildId },
                item.data,
                { upsert: true, new: true }
            );

            item.status = 'completed';
            await item.save();

            console.log(`[SYNC PROCESSOR] ✓ Synced ${item.source} data for guild ${item.guildId}`);
            return true;
        } catch (error) {
            console.error(`[SYNC PROCESSOR] ✗ Error syncing item:`, error);
            
            item.retries += 1;
            if (item.retries >= item.maxRetries) {
                item.status = 'failed';
            }
            await item.save();
            return false;
        }
    }

    /**
     * Get last sync timestamp for guild
     */
    static async getLastSyncTime(guildId) {
        try {
            const lastSync = await SyncLog.findOne({ guildId })
                .sort({ timestamp: -1 });
            return lastSync ? lastSync.timestamp : null;
        } catch (error) {
            console.error('Error getting last sync time:', error);
            return null;
        }
    }

    /**
     * Sync data from bot to website
     */
    static async syncFromBot(guildId, setupData, userId) {
        try {
            // Save to database
            const setup = await Setup.findOneAndUpdate(
                { guildId },
                setupData,
                { upsert: true, new: true }
            );

            // Get changed fields
            const changedFields = {};
            Object.keys(setupData).forEach(key => {
                changedFields[key] = setupData[key];
            });

            // Log the sync
            await this.logSync(guildId, 'bot', 'update', changedFields, userId);

            return { success: true, data: setup };
        } catch (error) {
            console.error('[BOT SYNC] Error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sync data from website to bot
     */
    static async syncFromWebsite(guildId, setupData, userId) {
        try {
            // Save to database
            const setup = await Setup.findOneAndUpdate(
                { guildId },
                setupData,
                { upsert: true, new: true }
            );

            // Get changed fields
            const changedFields = {};
            Object.keys(setupData).forEach(key => {
                changedFields[key] = setupData[key];
            });

            // Log the sync
            await this.logSync(guildId, 'website', 'update', changedFields, userId);

            return { success: true, data: setup };
        } catch (error) {
            console.error('[WEBSITE SYNC] Error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get sync status dashboard data
     */
    static async getSyncStatus() {
        try {
            const totalLogs = await SyncLog.countDocuments();
            const pendingQueue = await SyncQueue.countDocuments({ status: 'pending' });
            const failedQueue = await SyncQueue.countDocuments({ status: 'failed' });
            const botSyncs = await SyncLog.countDocuments({ source: 'bot' });
            const websiteSyncs = await SyncLog.countDocuments({ source: 'website' });

            return {
                totalSyncEvents: totalLogs,
                queueStatus: {
                    pending: pendingQueue,
                    failed: failedQueue
                },
                syncSource: {
                    bot: botSyncs,
                    website: websiteSyncs
                }
            };
        } catch (error) {
            console.error('Error getting sync status:', error);
            return null;
        }
    }
}

module.exports = SyncManager;
