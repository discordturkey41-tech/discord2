const { ApplicationCommandOptionType, ChannelType, EmbedBuilder } = require("discord.js");
const Types = require("../../Mangodb/types.js");

module.exports = {
    name: "edit-type",
    description: "تــعــديــل نــوع مــتــجــر",
    options: [
        {
            name: "type",
            description: "االــنــوع الذي تــريــد تــعــديــلــه",
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
        },
        {
            name: "name",
            description: "اســم الــنــوع الــجــديــد",
            type: ApplicationCommandOptionType.String,
            required: false
        },
        {
            name: "category",
            description: "كــاتــغــوري الــنــوع الــجــديــد",
            type: ApplicationCommandOptionType.Channel,
            channel_types: [ChannelType.GuildCategory],
            required: false
        },
        {
            name: "everyone-mention",
            description: "عــدد مــنــشــنــات الايــفــري ون الــجــديــده",
            type: ApplicationCommandOptionType.Integer,
            required: false
        },
        {
            name: "here-mention",
            description: "عــدد مــنــشــنــات الــهــيــر الــجــديــده",
            type: ApplicationCommandOptionType.Integer,
            required: false
        },
        {
            name: "shop-mention",
            description: "عــدد مــنــشــنــات الــمــتــجــر الــجــديــده",
            type: ApplicationCommandOptionType.Integer,
            required: false
        },
        {
            name: "max-warns",
            description: "اقــصــي عــدد لــتــحــذيــرات الــجــديــد",
            type: ApplicationCommandOptionType.Integer,
            required: false
        },
        {
            name: "role",
            description: "رتــبــة الــنــوع الــجــديــدة",
            type: ApplicationCommandOptionType.Role,
            required: false
        },
        {
            name: "emoji",
            description: "ايــمــوجــي الــنــوع الــجــديــد",
            type: ApplicationCommandOptionType.String,
            required: false
        },
        {
            name: "shape",
            description: "شــكــل الــنــوع الــجــديــد",
            type: ApplicationCommandOptionType.String,
            required: false
        },
        {
            name: "price",
            description: "ســعــر الــنــوع الــجــديــد",
            type: ApplicationCommandOptionType.Integer,
            required: false
        },
        {
            name: "tax",
            description: "نــســبــة الــضــريــبــة الــجــديــدة",
            type: ApplicationCommandOptionType.Number,
            required: false
        }
    ],

    async execute(client, interaction) {
        const guildId = interaction.guild.id;
        const typeName = interaction.options.getString("type");
        
        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({
                content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج صـلاحـيــة Administrator**`,
                ephemeral: true,
            });
        }
        
        try {
            const type = await Types.findOne({ guildId, name: typeName });
            
            if (!type) {
                return interaction.reply({
                    content: `**هــذا الــنــوع غــيــر مــوجــود الرجــاء الــتــحــقــق مــنــه او الاتــصــال بــدعــم**`,
                    ephemeral: true
                });
            }

            const newName = interaction.options.getString("name");
            const newCategory = interaction.options.getChannel("category")?.id;

            // التحقق من عدم تكرار الاسم
            if (newName && newName !== typeName) {
                const existingType = await Types.findOne({ 
                    guildId, 
                    name: { $regex: newName, $options: 'i' },
                    _id: { $ne: type._id }
                });
                
                if (existingType) {
                    return interaction.reply({
                        content: `**يــوجــد نــوع آخــر بــاســم '${existingType.name}' \n الــرجــاء اخــتــيــار اســم أخــر**`,
                        ephemeral: true
                    });
                }
            }

            // التحقق من عدم تكرار الكتاغوري
            if (newCategory && newCategory !== type.category) {
                const categoryExists = await Types.findOne({ 
                    guildId, 
                    category: newCategory,
                    _id: { $ne: type._id }
                });
                
                if (categoryExists) {
                    return interaction.reply({
                        content: `**يــســتــخــدم الــكــتــاغــوري مــســبــقــاً فــي نــوع '${categoryExists.name}' \n الــرجــاء اخــتــيــار كــتــاغــوري أخــر**`,
                        ephemeral: true
                    });
                }
            }

            // تحديث القيم
            const updates = {
                name: newName || type.name,
                category: newCategory || type.category,
                everyoneMention: interaction.options.getInteger("everyone-mention") ?? type.everyoneMention,
                hereMention: interaction.options.getInteger("here-mention") ?? type.hereMention,
                shopMention: interaction.options.getInteger("shop-mention") ?? type.shopMention,
                maxWarns: interaction.options.getInteger("max-warns") ?? type.maxWarns,
                role: interaction.options.getRole("role")?.id ?? type.role,
                emoji: interaction.options.getString("emoji") ?? type.emoji,
                shape: interaction.options.getString("shape") ?? type.shape,
                price: interaction.options.getInteger("price") ?? type.price,
                tax: interaction.options.getNumber("tax") ?? type.tax
            };

            // تحديث في قاعدة البيانات
            const updatedType = await Types.findByIdAndUpdate(type._id, updates, { new: true });

            const embed = new EmbedBuilder()
                .setColor("Blue")
                .setTitle("✅ تم تعديل النوع بنجاح")
                .addFields(
                    { name: "اسم النوع", value: updatedType.name, inline: true },
                    { name: "السعر", value: `${updatedType.price}`, inline: true },
                    { name: "الضريبة", value: `${updatedType.tax}`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
        } catch (error) {
            console.error('Error editing type:', error);
            await interaction.reply({
                content: "❌ حدث خطأ أثناء تعديل النوع",
                ephemeral: true
            });
        }
    },

    async autocomplete(interaction) {
        const guildId = interaction.guild.id;
        
        try {
            const types = await Types.find({ guildId });
            const focused = interaction.options.getFocused()?.toLowerCase() || "";
            const filtered = types
                .filter(t => t.name.toLowerCase().includes(focused))
                .slice(0, 25)
                .map(t => ({
                    name: `${t.emoji || ""} ${t.name}`,
                    value: t.name
                }));

            await interaction.respond(filtered);
        } catch (error) {
            console.error('Error in autocomplete:', error);
            await interaction.respond([]);
        }
    }
};