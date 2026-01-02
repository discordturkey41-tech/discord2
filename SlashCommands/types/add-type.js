const { ApplicationCommandOptionType, ChannelType, EmbedBuilder } = require("discord.js");
const Types = require("../../Mangodb/types.js");

module.exports = {
    name: "add-type",
    description: "إضــافــة نــوع مــتــجــر جــديــد",
    options: [
        {
            name: "name",
            description: "اســم الــنــوع",
            type: ApplicationCommandOptionType.String,
            required: true
        },
        {
            name: "category",
            description: "الــكــاتــغــوري",
            type: ApplicationCommandOptionType.Channel,
            channel_types: [ChannelType.GuildCategory],
            required: true
        },
        {
            name: "everyone-mention",
            description: "عــدد مــنــشــنــات الايــفــري ون",
            type: ApplicationCommandOptionType.Integer,
            required: true
        },
        {
            name: "here-mention",
            description: "عــدد مــنــشــنــات الــهــيــر",
            type: ApplicationCommandOptionType.Integer,
            required: true
        },
        {
            name: "shop-mention",
            description: "عــدد مــنــشــنــات مــنــشــن الــمــتــجــر",
            type: ApplicationCommandOptionType.Integer,
            required: true
        },
        {
            name: "max-warns",
            description: "أقــصــى عــدد لــتــحــذيــرات",
            type: ApplicationCommandOptionType.Integer,
            required: true
        },
        {
            name: "type-role",
            description: "رتــبــة الــنــوع",
            type: ApplicationCommandOptionType.Role,
            required: true
        },
        {
            name: "type-emoji",
            description: "ايــمــوجــي الــنــوع",
            type: ApplicationCommandOptionType.String,
            required: true
        },
        {
            name: "type-shape",
            description: "شــكــل الــنــوع",
            type: ApplicationCommandOptionType.String,
            required: true
        },
        {
            name: "type-price",
            description: "ســعــر الــنــوع",
            type: ApplicationCommandOptionType.Integer,
            required: true
        },
        {
            name: "tax",
            description: " الــضــريــبــة (اخــتــيــاري)",
            type: ApplicationCommandOptionType.Number,
            required: false
        }
    ],
    async execute(client, interaction) {
        const name = interaction.options.getString("name");
        const category = interaction.options.getChannel("category")?.id;
        const everyoneMention = interaction.options.getInteger("everyone-mention") ?? null;
        const hereMention = interaction.options.getInteger("here-mention") ?? null;
        const shopMention = interaction.options.getInteger("shop-mention") ?? null;
        const maxWarns = interaction.options.getInteger("max-warns") ?? 0;
        const role = interaction.options.getRole("type-role")?.id ?? null;
        const shape = interaction.options.getString("type-shape") ?? null;
        const emoji = interaction.options.getString("type-emoji") ?? null;
        const price = interaction.options.getInteger("type-price") ?? 0;
        const tax = interaction.options.getNumber("tax") ?? 0;
        
        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({
                content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج صـلاحـيــة Administrator**`,
                ephemeral: true,
            });
        }
        
        const guildId = interaction.guild.id;

        try {
            // التحقق من عدم تكرار الاسم في هذا السيرفر
            const existingType = await Types.findOne({ guildId, name: { $regex: name, $options: 'i' } });
            if (existingType) {
                return interaction.reply({
                    content: "**يــوجــد نــوع بــنــفــس الاســم\n الــرجــاء اخــتــيــار اســم أخــر**",
                    ephemeral: true
                });
            }

            // التحقق من عدم تكرار الكتاغوري
            const categoryExists = await Types.findOne({ guildId, category });
            if (categoryExists) {
                return interaction.reply({
                    content: "**يــوجــد نــوع بــنــفــس الــكــتــاغــوري\n الــرجــاء تــغــيــر الــكــتــاغــوري**",
                    ephemeral: true
                });
            }

            // إضافة النوع الجديد
            const newType = await Types.create({
                guildId,
                name,
                category,
                everyoneMention,
                hereMention,
                shopMention,
                maxWarns,
                role,
                emoji,
                shape,
                price,
                tax
            });

            const embed = new EmbedBuilder()
                .setColor("Green")
                .setTitle("✅ تم إضافة النوع بنجاح")
                .addFields(
                    { name: "اسم النوع", value: name, inline: true },
                    { name: "السعر", value: `${price}`, inline: true },
                    { name: "الضريبة", value: `${tax}`, inline: true },
                    { name: "الايموجي", value: emoji, inline: true },
                    { name: "الشكل", value: shape, inline: false }
                )
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
        } catch (error) {
            console.error('Error adding type:', error);
            await interaction.reply({
                content: "❌ حدث خطأ أثناء إضافة النوع",
                ephemeral: true
            });
        }
    }
};