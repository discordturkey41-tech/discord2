#!/usr/bin/env node

/**
 * Complete Database Reset Script
 * Clears ALL MongoDB collections and reinitializes the database
 * Usage: node reset-complete.js
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config();

console.log('🔄 Connecting to MongoDB...');
console.log('Database:', process.env.MONGO_URI.split('/').pop().split('?')[0]);

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB\n');
        
        console.log('🗑️  Clearing ALL collections...\n');
        
        const db = mongoose.connection;
        const collections = await db.db.listCollections().toArray();
        
        let deletedCount = 0;
        let collectionCount = 0;
        
        for (const collectionInfo of collections) {
            const collectionName = collectionInfo.name;
            
            // Skip system collections
            if (collectionName.startsWith('system.')) {
                continue;
            }
            
            const collection = db.collection(collectionName);
            const result = await collection.deleteMany({});
            
            console.log(`  ✓ ${collectionName.padEnd(30)} → ${result.deletedCount} documents deleted`);
            deletedCount += result.deletedCount;
            collectionCount++;
        }
        
        console.log(`\n📊 Database Reset Summary:`);
        console.log(`   ✓ Collections cleared: ${collectionCount}`);
        console.log(`   ✓ Documents deleted: ${deletedCount}`);
        console.log(`\n✨ Database is now COMPLETELY CLEAN!`);
        console.log(`\n📝 Next Steps:`);
        console.log(`   1. Start the bot: node index.js`);
        console.log(`   2. Start the server: node server.js`);
        console.log(`   3. Use /setup command in Discord to configure`);
        console.log(`   4. Check website dashboard - data will auto-sync`);
        
        await mongoose.connection.close();
        console.log('\n✅ Connection closed\n');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Connection error:', err.message);
        process.exit(1);
    });
