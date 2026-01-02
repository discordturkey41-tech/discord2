// events/autoLine.js
const Setup = require("../../Mangodb/setup.js");

module.exports = {
    name: "messageCreate",
    once: false,

    async execute(client, message) {
        if (message.author.bot) return;

        const setupData = await Setup.findOne({ guildId: message.guild.id });
        if (!setupData || !setupData.autoLines || setupData.autoLines.length === 0) return;

        // البحث عن الخط المرتبط بهذه القناة
        const autoLine = setupData.autoLines.find(line => line.channelId === message.channel.id);
        
        if (!autoLine) return;

        // التحقق من نوع الخط
        if (autoLine.type === 'every_message') {
            // إرسال الخط بعد كل رسالة
            try {
                await message.channel.send({
                    files: [autoLine.lineUrl]
                });
            } catch (error) {
                console.error("Failed to send auto line:", error);
            }
        } else if (autoLine.type === 'every_mention') {
            // التحقق إذا كانت الرسالة تحتوي على منشن أو رتبة
            const hasMention = message.mentions.users.size > 0 || 
                             message.mentions.roles.size > 0 ||
                             message.content.includes('@everyone') ||
                             message.content.includes('@here');

            if (hasMention) {
                try {
                    await message.channel.send({
                        files: [autoLine.lineUrl]
                    });
                } catch (error) {
                    console.error("Failed to send auto line:", error);
                }
            }
        }
    }
};