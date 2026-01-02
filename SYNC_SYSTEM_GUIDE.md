# NEW DATA LINKING METHOD - Real-time Sync System

## Overview
This is an alternative method for linking data between the Discord Bot and Website using an **Event-Based Sync Architecture** with logging and queue processing.

## Architecture Components

### 1. **SyncModels** (`Mangodb/syncModels.js`)
Stores sync events and queue items:
- **SyncLog**: Records every data change (who changed it, when, what changed)
- **SyncQueue**: Reliable message queue for pending syncs with retry logic

### 2. **SyncManager Service** (`services/syncManager.js`)
Core service handling all sync operations:
- Logs sync events
- Manages sync queue
- Tracks last sync timestamp
- Retrieves sync history
- Bidirectional sync (bot → website, website → bot)

### 3. **Sync Processor** (`services/syncProcessor.js`)
Background job that:
- Runs every 30 seconds
- Processes pending syncs from the queue
- Retries failed syncs up to 3 times
- Updates queue item status

### 4. **API Endpoints** (in `server.js`)

#### Get Sync History
```
GET /api/server/:id/sync-history
```
Returns all sync events for a guild with timestamps and sources.

#### Get Sync Status
```
GET /api/sync-status
```
Returns dashboard data:
- Total sync events
- Pending queue items
- Failed queue items
- Syncs by source (bot/website)

#### Manual Sync
```
POST /api/server/:id/sync
Body: { setupData }
```
Manually triggers a sync from website to database.

#### Get Last Sync Time
```
GET /api/server/:id/last-sync
```
Returns when the last sync occurred for a guild.

## Data Flow

### Method 1: Bot → Website (Using /setup command)
```
1. User runs /setup command in Discord
2. Bot saves data to MongoDB (Setup collection)
3. SyncManager logs the event to SyncLog
4. Website fetches latest data from /api/server/:id/setup
5. Website shows updated values
```

### Method 2: Website → Bot (Using Dashboard Form)
```
1. User edits setup in website form
2. Website saves to MongoDB via /api/server/:id/setup
3. SyncManager logs the event
4. Bot reads from MongoDB anytime it needs setup data
5. Data automatically synced across all instances
```

### Method 3: Reliable Queue (Fallback)
```
1. If sync fails initially, item goes to SyncQueue
2. Sync Processor picks it up every 30 seconds
3. Retries up to 3 times before marking as failed
4. Website can view failed syncs and retry manually
```

## Features

### ✅ Event Logging
- Every data change is logged with:
  - Source (bot or website)
  - Action (create/update/delete)
  - Changed fields and values
  - Timestamp
  - User ID (who made the change)

### ✅ Retry Logic
- Failed syncs are automatically retried
- Max 3 retries with 30-second intervals
- Failed items can be manually reviewed

### ✅ Sync Status Dashboard
Shows on website setup page:
- Last sync time
- Sync status (✅ Synced or 🔄 Syncing)
- Updates every 10 seconds

### ✅ Audit Trail
Complete history of all changes available via API
Useful for debugging and accountability

## Usage Examples

### Example 1: Set up via Discord (/setup command)
```
User: /setup shop-admin @admin-role order-admin @order-admin
↓
Bot saves to MongoDB
↓
Website automatically shows the values
User can see "Last Sync: Just now"
```

### Example 2: Set up via Website
```
User fills form and clicks "Save Configuration"
↓
Website saves to MongoDB
↓
Bot reads the same data for commands
↓
Sync log shows "website" as source
```

### Example 3: Check Sync History
```
Endpoint: GET /api/server/12345/sync-history
Response:
{
  "success": true,
  "history": [
    {
      "guildId": "12345",
      "source": "bot",
      "action": "update",
      "timestamp": "2025-12-27T10:30:00Z",
      "changedFields": {
        "shopAdmin": "123456",
        "orderAdmin": "789012"
      }
    },
    {
      "guildId": "12345",
      "source": "website",
      "action": "update",
      "timestamp": "2025-12-27T10:25:00Z",
      "changedFields": {
        "tax": 5
      }
    }
  ]
}
```

## Differences from Previous Method

| Feature | Old Method | New Method |
|---------|-----------|-----------|
| Data Logging | ❌ No | ✅ Yes (SyncLog) |
| Retry Logic | ❌ No | ✅ Yes (SyncQueue) |
| Sync History | ❌ No | ✅ Yes (API available) |
| Source Tracking | ❌ No | ✅ Yes (bot/website) |
| Status Dashboard | ❌ Basic | ✅ Advanced |
| Queue Processing | ❌ No | ✅ Every 30s |
| Audit Trail | ❌ No | ✅ Complete |

## Monitoring & Debugging

### View Pending Syncs
```
Direct MongoDB query:
db.syncqueues.find({ status: 'pending' })
```

### View Failed Syncs
```
db.syncqueues.find({ status: 'failed' })
```

### View Sync Log
```
db.synclogs.find({ guildId: 'YOUR_GUILD_ID' }).sort({ timestamp: -1 })
```

### Check API Health
```
GET /api/test
```

## Performance Considerations

- Sync Queue Processor: Runs every 30 seconds (configurable)
- Max Retries: 3 attempts before marking as failed
- Timeout: No timeout (set one if needed)
- Database: Uses indexed queries for performance

## Future Enhancements

- WebSocket support for real-time updates
- Admin dashboard for sync monitoring
- Email notifications for failed syncs
- Automatic cleanup of old sync logs (>30 days)
- Batch sync operations

## Troubleshooting

### Syncs not happening?
1. Check if sync processor is running: `[SYNC PROCESSOR]` logs
2. Verify MongoDB connection: `GET /api/test`
3. Check sync queue: `db.syncqueues.find()`

### Data not showing on website after /setup?
1. Click "Refresh Data" button
2. Check last sync time in status panel
3. View sync history: `/api/server/:id/sync-history`

### Failed syncs?
1. Check failed items in SyncQueue
2. Review MongoDB error logs
3. Verify data format matches Setup schema

---

**Last Updated**: December 27, 2025
**Status**: ✅ Production Ready
