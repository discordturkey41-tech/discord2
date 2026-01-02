// Initialize guild data on first join
const Setup = require('../Mangodb/setup.js');
const Types = require('../Mangodb/types.js');
const Prices = require('../Mangodb/prices.js');
const { migrateTypesToMongoDB } = require('./typesManager.js');

async function initializeGuildData(guildId) {
  try {
    // Initialize Setup if doesn't exist
    const existingSetup = await Setup.findOne({ guildId });
    if (!existingSetup) {
      await Setup.create({ guildId });
      console.log(`✅ Initialized Setup for guild ${guildId}`);
    }

    // Initialize Prices if doesn't exist
    const existingPrices = await Prices.findOne({ guildId });
    if (!existingPrices) {
      await Prices.create({ guildId });
      console.log(`✅ Initialized Prices for guild ${guildId}`);
    }

    // Migrate types if don't exist
    const existingTypes = await Types.findOne({ guildId });
    if (!existingTypes) {
      await migrateTypesToMongoDB(guildId);
    }

    return true;
  } catch (error) {
    console.error(`❌ Error initializing guild ${guildId}:`, error);
    return false;
  }
}

module.exports = (client) => {
  // Initialize data when bot joins a guild
  client.on('guildCreate', async (guild) => {
    console.log(`🆕 Bot joined guild: ${guild.name} (${guild.id})`);
    await initializeGuildData(guild.id);
  });

  // Initialize data for all guilds on startup
  client.once('ready', async () => {
    console.log('🔄 Initializing data for all guilds...');
    for (const guild of client.guilds.cache.values()) {
      await initializeGuildData(guild.id);
    }
    console.log('✅ Guild data initialization complete');
  });
};
