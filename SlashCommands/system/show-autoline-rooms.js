// commands/show-autoline-rooms.js
const { EmbedBuilder } = require("discord.js");
const Setup = require("../../Mangodb/setup.js");

module.exports = {
    name: "show-autoline-rooms",
    description: "عـرض جـمـيـع خـطـوط الـتـلـقـائـي والـرومـات",

    async execute(client, interaction) {
        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({
                content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج صـلاحـيــة Administrator**`,
                ephemeral: true,
            });
        }

        const setupData = await Setup.findOne({ guildId: interaction.guild.id });
        
        if (!setupData || !setupData.autoLines || setupData.autoLines.length === 0) {
            return interaction.reply({
                content: "**لا يـوجـد أي خـطـوط تـلـقـائـيـة مـعـرفـة**",
                ephemeral: true
            });
        }

        let linesList = "";
        setupData.autoLines.forEach((line, index) => {
            const lineType = line.type === 'every_message' ? 'كـل رسـالـة' : 'كـل مـنـشـن';
            linesList += `**${index + 1}. الـروم: <#${line.channelId}>**\n`;
            linesList += `   - الـنـوع: ${lineType}\n\n`;
        });

        const embed = new EmbedBuilder()
            .setTitle("خـطـوط الـتـلـقـائـي والـرومـات")
            .setDescription(linesList)
            .setFooter({
                text: `عدد الخطوط: ${setupData.autoLines.length}`,
                iconURL: interaction.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }
};