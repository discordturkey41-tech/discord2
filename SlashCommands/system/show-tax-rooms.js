// commands/show-tax-rooms.js
const { EmbedBuilder } = require("discord.js");
const Setup = require("../../Mangodb/setup.js");

module.exports = {
    name: "show-tax-rooms",
    description: "عـرض جـمـيـع رومـات الـضـريـبـة",

    async execute(client, interaction) {
        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({
                content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج صـلاحـيــة Administrator**`,
                ephemeral: true,
            });
        }

        const setupData = await Setup.findOne({ guildId: interaction.guild.id });
        
        if (!setupData || !setupData.taxRooms || setupData.taxRooms.length === 0) {
            return interaction.reply({
                content: "**لا يـوجـد أي رومـات ضـريـبـة مـعـرفـة**",
                ephemeral: true
            });
        }

        // إنشاء قائمة بالرومات
        let roomsList = "";
        setupData.taxRooms.forEach((roomId, index) => {
            roomsList += `${index + 1} <#${roomId}>\n`;
        });

        const embed = new EmbedBuilder()
            .setTitle("رومـات الـضـريـبـة")
            .setDescription(roomsList)
        .setImage(setupData.line)
            .setFooter({
                text: `عدد الرومات: ${setupData.taxRooms.length}`,
                iconURL: interaction.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }
};