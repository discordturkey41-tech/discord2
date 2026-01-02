const Setup = require("../../Mangodb/setup.js");
const Words = require("../../Mangodb/words.js");
const { ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");

module.exports = {
    name: "add-words",
    description: "إضــافــة كـلـمـات تـشـفـيـر",
    options: [
        {
            name: "words",
            description: "أضـف , بـيـن كـل كـلـمـة",
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
            const wordInput = interaction.options.getString("words");
            let newWords = wordInput.split(',')
                .map(w => w.trim().toLowerCase())
                .filter(w => w.length > 0);

            if (newWords.length === 0) {
                return interaction.reply({ 
                    content: `**❌ | تـأكـد أن الـكـلـمـات غـيـر مـكـررة**`, 
                    ephemeral: true 
                });
            }

            // Check for existing words in this guild
            const existingWords = await Words.find({ 
                guildId,
                word: { $in: newWords }
            });

            const uniqueWords = newWords.filter(w => 
                !existingWords.some(ew => ew.word === w)
            );

            if (uniqueWords.length === 0) {
                return interaction.reply({ 
                    content: `**❌ | جميع هذه الكلمات موجودة بالفعل في هذا السيرفر**`, 
                    ephemeral: true 
                });
            }

            // Add words to MongoDB
            const wordsToAdd = uniqueWords.map(w => ({ guildId, word: w }));
            await Words.insertMany(wordsToAdd);

            const embed = new EmbedBuilder()
                .setColor("Green")
                .setTitle("✅ تم إضافة الكلمات")
                .setDescription(`تم إضافة ${uniqueWords.length} كلمات جديدة`)
                .setTimestamp();

            await interaction.reply({ 
                embeds: [embed], 
                ephemeral: true 
            });
        } catch (error) {
            console.error('Error adding words:', error);
            await interaction.reply({ 
                content: "❌ حدث خطأ أثناء إضافة الكلمات", 
                ephemeral: true 
            });
        }
    }
};

