const { Events } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: Events.GuildCreate,
    async execute(client,guild) {
        let allowedGuilds = [];
        try {
            // Load environment variables
            require('dotenv').config();
            if (process.env.GUILD_ID) {
                allowedGuilds = [
                    process.env.GUILD_ID,
                    '1282020327810924585'
                ];
            }
        } catch (error) {
            return;
        }
        
        if (!allowedGuilds.includes(guild.id)) {
            try {
                await guild.leave();
            } catch (error) {}
        }
    }
};