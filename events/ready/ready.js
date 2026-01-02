// events/ready/ready.js
const { Client, EmbedBuilder, ActionRowBuilder, ActivityType, ButtonBuilder, ButtonStyle } = require('discord.js');
const { scheduleTaxChecks, sendTaxNotifications, checkLatePayments } = require('../../handlers/tax');
const { startAutoPublishSystem } = require('../../handlers/autoPublishSystem');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log((`Logged in as ${client.user.tag}`).red);
        console.log((`Servers: ${client.guilds.cache.size}`).magenta, (`Users: ${client.guilds.cache
            .reduce((a, b) => a + b.memberCount, 0)
            .toLocaleString()}`).yellow, (`Commands: ${client.commands.size}`).green);
        
        // تشغيل نظام الضرائب مرة واحدة عند البدء
        scheduleTaxChecks(client);
        
        // تأخير بسيط قبل تشغيل النظام الجديد لضمان تحميل الكل
        setTimeout(async () => {
            console.log('Starting auto-publish system...'.cyan);
            try {
                await startAutoPublishSystem(client);
                console.log('Auto-publish system started successfully'.green);
            } catch (error) {
                console.error('Error starting auto-publish system:'.red, error);
            }
        }, 5000); // تأخير 5 ثواني
        
        // تشغيل فحص مستمر كل دقيقة
        setInterval(() => {
            sendTaxNotifications(client);
            checkLatePayments(client);
        }, 60000); // كل دقيقة
        
        client.user.setStatus("online");
        client.user.setActivity(`Dev By Hox Devs`, { type: ActivityType.Listening });
    }
};