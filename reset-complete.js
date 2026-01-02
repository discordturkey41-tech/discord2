#!/usr/bin/env node

/**
 * Complete Database Reset Script
 * Clears ALL MongoDB collections and reinitializes the database
 * Usage: node reset-complete.js
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load config
let fileConfig = {};
try {
    fileConfig = require('./config.json');
} catch (err) {
    console.warn('Warning: config.json not found');
}

// Load .env manually
try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const data = fs.readFileSync(envPath, 'utf8');
        data.split('\n').forEach(line => {
            const part = line.trim();
            if (!part || part.startsWith('#')) return;
            const idx = part.indexOf('=');
            if (idx !== -1) {
                const key = part.substring(0, idx).trim();
                const value = part.substring(idx + 1).trim();
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        });
    }
} catch (err) {
    console.warn('Warning: Error loading .env file');
}

const config = {
    mongoUri: process.env.MONGO_URI || fileConfig.mongoUri || 'mongodb://localhost:27017/discord_bot_dashboard'
};

console.log('🔄 Connecting to MongoDB...');
console.log('Database:', config.mongoUri.split('/').pop().split('?')[0]);

mongoose.connect(config.mongoUri)
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
