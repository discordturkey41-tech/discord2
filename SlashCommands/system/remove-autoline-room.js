// commands/remove-autoline-room.js
const { ApplicationCommandOptionType, EmbedBuilder, ChannelType } = require("discord.js");
const Setup = require("../../Mangodb/setup.js");

module.exports = {
    name: "remove-autoline-room",
    description: "إزالـة روم مـن الـخـط الـتـلـقـائـي",
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

        const setupData = await Setup.findOne({ guildId: interaction.guild.id });
        
        if (!setupData || !setupData.autoLines || setupData.autoLines.length === 0) {
            return interaction.reply({
                content: "**لا يـوجـد أي خـطـوط تـلـقـائـيـة مـعـرفـة**",
                ephemeral: true
            });
        }

        // البحث عن الخط المرتبط بالروم
        const lineIndex = setupData.autoLines.findIndex(line => line.channelId === channel.id);
        
        if (lineIndex === -1) {
            return interaction.reply({
                content: `**هــذا الــروم لــيــس مــضــافــاً**`,
                ephemeral: true
            });
        }

        // إزالة الخط المرتبط بالروم
        setupData.autoLines.splice(lineIndex, 1);
        
        // إذا لم يعد هناك خطوط، حذف المصفوفة
        if (setupData.autoLines.length === 0) {
            setupData.autoLines = undefined;
        }

        await setupData.save();

        await interaction.reply({
            content: `**تـم إزالـة الـخـط الـتـلـقـائـي مـن الـروم ${channel}**`,
            ephemeral: true
        });
    }
};