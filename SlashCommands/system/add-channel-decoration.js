// commands/add-channel-decoration.js
const { ApplicationCommandOptionType, EmbedBuilder, ChannelType } = require("discord.js");
const Setup = require("../../Mangodb/setup.js");

module.exports = {
    name: "add-channel-decoration",
    description: "إضـافـة روم لـلـزخـرفـة",
    options: [
        {
            name: "channel",
            description: "الـروم الـذي سـيـكـون لـلـزخـرفـة",
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

        // جلب الإعدادات الحالية
        let setupData = await Setup.findOne({ guildId: interaction.guild.id });
        
        if (!setupData) {
            setupData = new Setup({
                guildId: interaction.guild.id,
                decorationRooms: [channel.id]
            });
        } else {
            // التحقق إذا الروم مضاف مسبقاً
            if (setupData.decorationRooms && setupData.decorationRooms.includes(channel.id)) {
                return interaction.reply({
                    content: `**هــذا الــروم مــضــاف مــســبــقــاً كــروم زخــرفــة**`,
                    ephemeral: true
                });
            }
            
            // إضافة الروم الجديد للمصفوفة
            if (!setupData.decorationRooms) {
                setupData.decorationRooms = [channel.id];
            } else {
                setupData.decorationRooms.push(channel.id);
            }
        }

        await setupData.save();

        await interaction.reply({
            content: `**تـم إضـافـة روم الـزخـرفـة: ${channel}**`,
            ephemeral: true
        });
    }
};