// Server Data Manager - Centralized for all service events
const ServerData = require('../Mangodb/serverData.js');

/**
 * Get active transaction for a user in a specific shop channel
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @param {string} shopId - Shop/Channel ID
 * @returns {Promise<Object|null>}
 */
async function getActiveTransaction(guildId, userId, shopId) {
  try {
    const serverData = await ServerData.findOne({ guildId });
    if (!serverData) return null;
    return serverData.transactions?.find(t => t.userId === userId && t.shopId === shopId) || null;
  } catch (error) {
    console.error('Error getting transaction:', error);
    return null;
  }
}

/**
 * Add new transaction
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @param {string} shopId - Shop/Channel ID
 * @param {string} type - Transaction type
 * @returns {Promise<Object>}
 */
async function addTransaction(guildId, userId, shopId, type) {
  try {
    let serverData = await ServerData.findOne({ guildId });
    if (!serverData) {
      serverData = await ServerData.create({ guildId });
    }
    
    const transaction = {
      userId,
      shopId,
      type,
      timestamp: new Date()
    };
    
    if (!serverData.transactions) {
      serverData.transactions = [];
    }
    
    serverData.transactions.push(transaction);
    await serverData.save();
    return transaction;
  } catch (error) {
    console.error('Error adding transaction:', error);
    return null;
  }
}

/**
 * Remove transaction
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @param {string} shopId - Shop/Channel ID
 * @returns {Promise<boolean>}
 */
async function removeTransaction(guildId, userId, shopId) {
  try {
    const serverData = await ServerData.findOne({ guildId });
    if (!serverData) return false;
    
    if (!serverData.transactions) {
      serverData.transactions = [];
    }
    
    const initialLength = serverData.transactions.length;
    serverData.transactions = serverData.transactions.filter(
      t => !(t.userId === userId && t.shopId === shopId)
    );
    
    if (serverData.transactions.length < initialLength) {
      await serverData.save();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error removing transaction:', error);
    return false;
  }
}

/**
 * Add warning to guild data
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @param {string} shopId - Shop/Channel ID
 * @param {string} reason - Warning reason
 * @param {string} issuedBy - Who issued the warning
 * @returns {Promise<Object>}
 */
async function addWarning(guildId, userId, shopId, reason, issuedBy) {
  try {
    let serverData = await ServerData.findOne({ guildId });
    if (!serverData) {
      serverData = await ServerData.create({ guildId });
    }
    
    const warning = {
      userId,
      shopId,
      reason,
      issuedBy,
      timestamp: new Date()
    };
    
    if (!serverData.warnings) {
      serverData.warnings = [];
    }
    
    serverData.warnings.push(warning);
    await serverData.save();
    return warning;
  } catch (error) {
    console.error('Error adding warning:', error);
    return null;
  }
}

/**
 * Get warnings for a user in guild
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @returns {Promise<Array>}
 */
async function getUserWarnings(guildId, userId) {
  try {
    const serverData = await ServerData.findOne({ guildId });
    if (!serverData || !serverData.warnings) return [];
    return serverData.warnings.filter(w => w.userId === userId) || [];
  } catch (error) {
    console.error('Error getting warnings:', error);
    return [];
  }
}

/**
 * Remove warning
 * @param {string} guildId - Guild ID
 * @param {string} warningId - Warning ID
 * @returns {Promise<boolean>}
 */
async function removeWarning(guildId, warningId) {
  try {
    const serverData = await ServerData.findOne({ guildId });
    if (!serverData) return false;
    
    if (!serverData.warnings) {
      serverData.warnings = [];
    }
    
    const initialLength = serverData.warnings.length;
    serverData.warnings = serverData.warnings.filter(w => w._id.toString() !== warningId);
    
    if (serverData.warnings.length < initialLength) {
      await serverData.save();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error removing warning:', error);
    return false;
  }
}

module.exports = {
  getActiveTransaction,
  addTransaction,
  removeTransaction,
  addWarning,
  getUserWarnings,
  removeWarning
};
