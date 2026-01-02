// Migration script to convert global types.json to per-guild MongoDB types
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const Types = require('../Mangodb/types.js');

async function migrateTypesToMongoDB(guildId) {
  try {
    // Read types from JSON file
    const typesPath = path.join(__dirname, '../data/types.json');
    const typesData = JSON.parse(fs.readFileSync(typesPath, 'utf8'));

    // Check if types already exist for this guild
    const existingCount = await Types.countDocuments({ guildId });
    if (existingCount > 0) {
      console.log(`✅ Types already exist for guild ${guildId}`);
      return;
    }

    // Insert types for this guild
    const typesWithGuildId = typesData.map(type => ({
      ...type,
      guildId
    }));

    await Types.insertMany(typesWithGuildId);
    console.log(`✅ Migrated ${typesWithGuildId.length} types for guild ${guildId}`);
  } catch (error) {
    console.error(`❌ Error migrating types for guild ${guildId}:`, error);
  }
}

async function getTypesByGuild(guildId) {
  try {
    const types = await Types.find({ guildId });
    return types.length > 0 ? types : null;
  } catch (error) {
    console.error(`❌ Error fetching types for guild ${guildId}:`, error);
    return null;
  }
}

async function addTypeToGuild(guildId, typeData) {
  try {
    const newType = await Types.create({
      guildId,
      ...typeData
    });
    console.log(`✅ Added type "${typeData.name}" to guild ${guildId}`);
    return newType;
  } catch (error) {
    console.error(`❌ Error adding type to guild ${guildId}:`, error);
    return null;
  }
}

async function removeTypeFromGuild(guildId, typeName) {
  try {
    const result = await Types.deleteOne({ guildId, name: typeName });
    if (result.deletedCount > 0) {
      console.log(`✅ Removed type "${typeName}" from guild ${guildId}`);
      return true;
    }
    console.log(`⚠️ Type "${typeName}" not found for guild ${guildId}`);
    return false;
  } catch (error) {
    console.error(`❌ Error removing type from guild ${guildId}:`, error);
    return false;
  }
}

module.exports = {
  migrateTypesToMongoDB,
  getTypesByGuild,
  addTypeToGuild,
  removeTypeFromGuild
};
