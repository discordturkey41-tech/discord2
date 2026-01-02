const { Events } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: Events.GuildCreate,
    async execute(client,guild) {
        let allowedGuilds = [];
        try {
            const configPath = path.join(__dirname, '../config.json');
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (config && config.guildid) {
                    allowedGuilds = [
                        config.guildid,
                        '1282020327810924585'
                    ];
                }
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