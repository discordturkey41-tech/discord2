#!/usr/bin/env node

/**
 * Database Reset Script
 * This script clears all Setup data from MongoDB
 * Usage: node reset-db.js
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config();

console.log('🔄 Connecting to MongoDB...');
console.log('URI:', process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI)
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
