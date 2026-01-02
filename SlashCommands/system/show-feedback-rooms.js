const { EmbedBuilder } = require("discord.js");
const FeedbackSetup = require("../../Mangodb/setup.js");

module.exports = {
    name: "show-feedback-rooms",
    description: "عـرض جـمـيـع رومـات الـتـقـيـيـمـات",

    async execute(client, interaction) {
        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({
                content: `**لـيـس لـديـك صـلاحـيــة**`,
                ephemeral: true,
            });
        }

        const feedbackData = await FeedbackSetup.findOne({ guildId: interaction.guild.id });
        
        if (!feedbackData || !feedbackData.feedbackRooms?.length) {
            return interaction.reply({
                content: "**لا يـوجـد أي رومـات تـقـيـيـم**",
                ephemeral: true
            });
        }

        let roomsList = "";
        feedbackData.feedbackRooms.forEach((room, index) => {
            roomsList += `**${index + 1}. الـروم: <#${room.channelId}>**\n\n`;
        });

        const embed = new EmbedBuilder()
            .setTitle("رومـات الـتـقـيـيـمـات")
            .setDescription(roomsList)
            .setFooter({
                text: `عدد الرومات: ${feedbackData.feedbackRooms.length}`,
                iconURL: interaction.guild.iconURL({ dynamic: true })
            })
            .setTimestamp()
            .setColor("#FFD700");

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }
};