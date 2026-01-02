const Setup = require("../../Mangodb/setup.js");
const Words = require("../../Mangodb/words.js");
const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "words",
    description: "لـرؤيـة كـلـمـات الـتـشـفـيـر",

    async execute(client, interaction) {
        const guildId = interaction.guild.id;
        
        try {
            const setupData = await Setup.findOne({ guildId });
            const words = await Words.find({ guildId });

            if (words.length === 0) {
                return interaction.reply({
                    content: `**❌ | لا يـوجـد كـلـمـات تـشـفـيـر أسـتـخـدم أمـر /add-words لإضـافـة كـلـمـات تـشـفـيـر**`,
                    ephemeral: true,
                });
            }

            const wordsList = words.map(w => w.word);

            const embed = new EmbedBuilder()
                .setTitle("كـلـمـات الـتـشـفـيـر")
                .setDescription(wordsList.map((w, i) => `\`${i + 1}.\` ${w}`).join("\n"))
                .setColor("#00BFFF")
                .setFooter({ 
                    text: "Dev By Hox Devs",
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setAuthor({
                    name: interaction.guild.name,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setThumbnail(client.user.displayAvatarURL())
                .setTimestamp();

            // إضافة الصورة من setup إذا موجودة
            if (setupData?.line) {
                embed.setImage(setupData.line);
            }

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
        } catch (error) {
            console.error('Error fetching words:', error);
            await interaction.reply({
                content: "❌ حدث خطأ أثناء جلب الكلمات",
                ephemeral: true
            });
        }
    }
};
