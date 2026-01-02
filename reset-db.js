#!/usr/bin/env node

/**
 * Database Reset Script
 * This script clears all Setup data from MongoDB
 * Usage: node reset-db.js
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
console.log('URI:', config.mongoUri);

mongoose.connect(config.mongoUri)
    .then(async () => {
        console.log('✅ Connected to MongoDB');
        
        // Import Setup model
        const Setup = require('./Mangodb/setup.js');
        
        console.log('🗑️ Clearing all Setup data...');
        
        // Delete all setup documents
        const result = await Setup.deleteMany({});
        
        console.log(`✅ Deleted ${result.deletedCount} setup documents`);
        console.log('\n📊 Database Reset Summary:');
        console.log(`   - Setup records deleted: ${result.deletedCount}`);
        console.log('\n✨ Database is now clean and ready to use!');
        console.log('💡 Tip: Use /setup command in Discord to configure your server');
        
        await mongoose.connection.close();
        console.log('\n✅ Connection closed');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Connection error:', err.message);
        process.exit(1);
    });
