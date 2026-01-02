// commands/remove-tax-room.js
const { ApplicationCommandOptionType, EmbedBuilder, ChannelType } = require("discord.js");
const Setup = require("../../Mangodb/setup.js");

module.exports = {
    name: "remove-tax-room",
    description: "إزالـة روم مـن رومـات الـضـريـبـة",
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
        
        if (!setupData || !setupData.taxRooms || !setupData.taxRooms.includes(channel.id)) {
            return interaction.reply({
                content: `**هــذا الــروم لــيــس مــضــافــاً كــروم ضــريــبــة**`,
                ephemeral: true
            });
        }

        // إزالة الروم من المصفوفة
        setupData.taxRooms = setupData.taxRooms.filter(roomId => roomId !== channel.id);
        
        // إذا لم يعد هناك رومات ضريبة، حذف الحقل
        if (setupData.taxRooms.length === 0) {
            setupData.taxRooms = undefined;
        }

        await setupData.save();

        await interaction.reply({
            content: `**تـم إزالـة روم الـضـريـبـة: ${channel}**`,
            ephemeral: true
        });
    }
};