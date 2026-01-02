// commands/remove-channel-decoration.js
const { ApplicationCommandOptionType, EmbedBuilder, ChannelType } = require("discord.js");
const Setup = require("../../Mangodb/setup.js");

module.exports = {
    name: "remove-channel-decoration",
    description: "إزالـة روم مـن رومـات الـزخـرفـة",
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
                content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج صـلاحـيــة Administrator**`,
                ephemeral: true,
            });
        }

        const channel = interaction.options.getChannel("channel");

        // تحديث الإعدادات وإزالة الروم
        const setupData = await Setup.findOne({ guildId: interaction.guild.id });
        
        if (!setupData || !setupData.decorationRooms || !setupData.decorationRooms.includes(channel.id)) {
            return interaction.reply({
                content: `**هــذا الــروم لــيــس مــضــافــاً كــروم زخــرفــة**`,
                ephemeral: true
            });
        }

        // إزالة الروم من المصفوفة
        setupData.decorationRooms = setupData.decorationRooms.filter(roomId => roomId !== channel.id);
        
        // إذا لم يعد هناك رومات زخرفة، حذف الحقل
        if (setupData.decorationRooms.length === 0) {
            setupData.decorationRooms = undefined;
        }

        await setupData.save();

        await interaction.reply({
            content: `**تـم إزالـة روم الـزخـرفـة: ${channel}**`,
            ephemeral: true
        });
    }
};