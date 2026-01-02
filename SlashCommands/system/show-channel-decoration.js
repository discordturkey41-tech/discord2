// commands/show-channel-decoration.js
const { EmbedBuilder } = require("discord.js");
const Setup = require("../../Mangodb/setup.js");

module.exports = {
    name: "show-channel-decoration",
    description: "عـرض جـمـيـع رومـات الـزخـرفـة",

    async execute(client, interaction) {
        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({
                content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج صـلاحـيــة Administrator**`,
                ephemeral: true,
            });
        }

        const setupData = await Setup.findOne({ guildId: interaction.guild.id });
        
        if (!setupData || !setupData.decorationRooms || setupData.decorationRooms.length === 0) {
            return interaction.reply({
                content: "**لا يـوجـد أي رومـات زخـرفـة مـعـرفـة**",
                ephemeral: true
            });
        }

        // إنشاء قائمة بالرومات
        let roomsList = "";
        setupData.decorationRooms.forEach((roomId, index) => {
            roomsList += `${index + 1} <#${roomId}>\n`;
        });

        const embed = new EmbedBuilder()
            .setTitle("رومـات الـزخـرفـة")
            .setDescription(roomsList)
            .setImage(setupData.line)
            .setFooter({
                text: `عدد الرومات: ${setupData.decorationRooms.length}`,
                iconURL: interaction.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }
};