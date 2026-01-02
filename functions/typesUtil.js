// Utility module to handle per-guild types from MongoDB
const Types = require('../Mangodb/types.js');

/**
 * Get types for a specific guild
 * @param {string} guildId - The guild ID
 * @returns {Promise<Array>} Array of types for the guild
 */
async function getGuildTypes(guildId) {
  try {
    const types = await Types.find({ guildId });
    return types || [];
  } catch (error) {
    console.error(`Error fetching types for guild ${guildId}:`, error);
    return [];
  }
}

/**
 * Get a single type by name for a guild
 * @param {string} guildId - The guild ID
 * @param {string} typeName - The type name
 * @returns {Promise<Object>} The type object or null
 */
async function getGuildTypeByName(guildId, typeName) {
  try {
    const type = await Types.findOne({ guildId, name: typeName });
    return type || null;
  } catch (error) {
    console.error(`Error fetching type ${typeName} for guild ${guildId}:`, error);
    return null;
  }
}

/**
 * Get all types for a guild by category
 * @param {string} guildId - The guild ID
 * @param {string} category - The category ID
 * @returns {Promise<Object>} The type object or null
 */
async function getGuildTypeByCategory(guildId, category) {
  try {
    const type = await Types.findOne({ guildId, category });
    return type || null;
  } catch (error) {
    console.error(`Error fetching type with category ${category} for guild ${guildId}:`, error);
    return null;
  }
}

module.exports = {
  getGuildTypes,
  getGuildTypeByName,
  getGuildTypeByCategory
};
