const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const Setup = require("../../Mangodb/setup.js");
const Shop = require("../../Mangodb/shop.js");

module.exports = {
    name: "messageCreate",
    once: false,

    async execute(client, message) {
        if (message.author.bot || !message.content) return;

        const setupData = await Setup.findOne({ guildId: message.guild.id }) || {};
        const shopMentionWord = setupData.shopMention || null;
        const line = setupData.line || "------------------------";

        const lowerContent = message.content.toLowerCase();

        const isTriggered =
            lowerContent.includes("@everyone") ||
            lowerContent.includes("@here") ||
            (shopMentionWord && lowerContent.includes(shopMentionWord.toLowerCase()));

        if (!isTriggered) return;

        const shopRoom = await Shop.findOne({ channelId: message.channel.id });
        if (!shopRoom) return;

        const isOwner = message.author.id === shopRoom.ownerId;
        const isPartner = shopRoom.partners.includes(message.author.id);

        if (!isOwner && !isPartner) return;

        try {
            await message.reply({
                files: [line]
            });
        } catch (err) {
            console.error("Error sending line:", err);
        }
    }
};
