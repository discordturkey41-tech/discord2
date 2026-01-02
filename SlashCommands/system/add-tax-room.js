// commands/add-tax-room.js
const { ApplicationCommandOptionType, EmbedBuilder, ChannelType } = require("discord.js");
const Setup = require("../../Mangodb/setup.js");

module.exports = {
    name: "add-tax-room",
    description: "إضـافـة روم لـحـسـاب الـضـريـبـة",
    options: [
        {
            name: "channel",
            description: "الـروم الـذي سـيـكـون لـحـسـاب الـضـريـبـة",
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
                taxRooms: [channel.id]
            });
        } else {
            // التحقق إذا الروم مضاف مسبقاً
            if (setupData.taxRooms && setupData.taxRooms.includes(channel.id)) {
                return interaction.reply({
                    content: `**هــذا الــروم مــضــاف مــســبــقــاً كــروم ضــريــبــة**`,
                    ephemeral: true
                });
            }
            
            // إضافة الروم الجديد للمصفوفة
            if (!setupData.taxRooms) {
                setupData.taxRooms = [channel.id];
            } else {
                setupData.taxRooms.push(channel.id);
            }
        }

        await setupData.save();

        await interaction.reply({
            content: `**تـم إضـافـة روم الـضـريـبـة: ${channel}**`,
            ephemeral: true
        });
    }
};