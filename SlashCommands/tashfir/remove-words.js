const Setup = require("../../Mangodb/setup.js");
const Words = require("../../Mangodb/words.js");
const { ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");

module.exports = {
    name: "remove-words",
    description: "إزالـة كـلـمـات تـشـفـيـر",
    options: [
        {
            name: "words",
            description: "اكـتـب , بـيـن كـل كـلـمـة",
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],

    async execute(client, interaction) {
        const guildId = interaction.guild.id;
        const setupData = await Setup.findOne({ guildId });

        if (!setupData || !setupData.shopAdmin) {
            return interaction.reply({
                content: `**الــرجــاء تــحــديــد مــســؤول مــتــاجــر مــن امــر \n/setup**`,
                ephemeral: true,
            });
        }

        // تحقق من صلاحيات المسؤول على المتاجر في السيرفر
        if (!interaction.member.roles.cache.has(setupData.shopAdmin)) {
            return interaction.reply({
                content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج رتـبـه <@&${setupData.shopAdmin}>**`,
                ephemeral: true,
            });
        }

        try {
            const removeList = interaction.options.getString("words")
                .split(",")
                .map(w => w.trim().toLowerCase())
                .filter(w => w.length > 0);

            if (removeList.length === 0) {
                return interaction.reply({ 
                    content: `**❌ | لا توجد كلمات لإزالتها**`, 
                    ephemeral: true 
                });
            }

            // Delete words from MongoDB for this guild
            const result = await Words.deleteMany({
                guildId,
                word: { $in: removeList }
            });

            if (result.deletedCount === 0) {
                return interaction.reply({ 
                    content: `**❌ | تـاكـد مـن كـلـمـات الـتـشـفـيـر بـإسـتـخـدام أمـر /words**`, 
                    ephemeral: true 
                });
            }

            const embed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("✅ تم إزالة الكلمات")
                .setDescription(`تم إزالة ${result.deletedCount} كلمات`)
                .setTimestamp();

            await interaction.reply({ 
                embeds: [embed], 
                ephemeral: true 
            });
        } catch (error) {
            console.error('Error removing words:', error);
            await interaction.reply({ 
                content: "❌ حدث خطأ أثناء إزالة الكلمات", 
                ephemeral: true 
            });
        }
    }
};



