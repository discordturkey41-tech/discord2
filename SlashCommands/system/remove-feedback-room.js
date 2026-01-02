const { ApplicationCommandOptionType, ChannelType } = require("discord.js");
const FeedbackSetup = require("../../Mangodb/setup.js");

module.exports = {
    name: "remove-feedback-room",
    description: "إزالـة روم مـن الـتـقـيـيـمـات",
    options: [
        {
            name: "channel",
            description: "الـروم الـذي تـريـد إزالـتـه",
            type: ApplicationCommandOptionType.Channel,
            channel_types: [ChannelType.GuildText],
            required: true
        }
    ],

    async execute(client, interaction) {
        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({
                content: `**لـيـس لـديـك صـلاحـيــة**`,
                ephemeral: true,
            });
        }

        const channel = interaction.options.getChannel("channel");
        const feedbackData = await FeedbackSetup.findOne({ guildId: interaction.guild.id });
        
        if (!feedbackData || !feedbackData.feedbackRooms?.length) {
            return interaction.reply({
                content: "**لا يـوجـد أي رومـات تـقـيـيـم**",
                ephemeral: true
            });
        }

        const roomIndex = feedbackData.feedbackRooms.findIndex(room => room.channelId === channel.id);
        
        if (roomIndex === -1) {
            return interaction.reply({
                content: `**هــذا الــروم لــيــس مــضــافــاً**`,
                ephemeral: true
            });
        }

        feedbackData.feedbackRooms.splice(roomIndex, 1);
        if (feedbackData.feedbackRooms.length === 0) {
            feedbackData.feedbackRooms = undefined;
        }

        await feedbackData.save();

        await interaction.reply({
            content: `**تـم إزالـة روم التـقـيـيـمـات ${channel}**`,
            ephemeral: true
        });
    }
};