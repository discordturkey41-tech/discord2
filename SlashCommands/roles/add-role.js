const { ApplicationCommandOptionType, ChannelType } = require("discord.js");
const Roles = require("../../Mangodb/roles.js");

module.exports = {
    name: "add-sell-role",
    description: "إضــافــة رتــبــة للــبــيــع",
    options: [
        {
            name: "role",
            description: "الــرتــبــة الــتــي تــريــد إضــافــتــهــا للــبــيــع",
            type: ApplicationCommandOptionType.Role,
            required: true
        },
        {
            name: "category",
            description: "كــاتــغــوري الــتــكــتــات",
            type: ApplicationCommandOptionType.Channel,
            channel_types: [ChannelType.GuildCategory],
            required: true
        },
        {
            name: "price",
            description: "ســعــر الــرتــبــة",
            type: ApplicationCommandOptionType.Integer,
            required: true,
            min_value: 1
        }
    ],

    async execute(client, interaction) {
        // التحقق من صلاحيات الأدمن
        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({
                content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج صـلاحـيــة Administrator**`,
                ephemeral: true,
            });
        }

        // الحصول على البيانات من التفاعل
        const role = interaction.options.getRole("role");
        const category = interaction.options.getChannel("category");
        const price = interaction.options.getInteger("price");

        // التحقق من أن الرتبة ليست أعلى من رتبة البوت
        const botMember = await interaction.guild.members.fetch(client.user.id);
        if (role.position >= botMember.roles.highest.position) {
            return interaction.reply({
                content: `**❌ الــرتــبــة \`${role.name}\` أعــلــى مــن رتــبــتــي!\n\nالــرجــاء رفــع رتــبــتــي فــوق هــذه الــرتــبــة لــأســتــطــيــع إضــافــتــهــا للــبــيــع وإعــطــائــهــا للــمــســتــخــدمــيــن.**`,
                ephemeral: true
            });
        }

        // جلب الرتب الموجودة من MongoDB
        const existingRoles = await Roles.find({ guildId: interaction.guild.id });

        // التحقق من عدم تكرار الرتبة
        const roleExists = existingRoles.some(r => r.roleId === role.id);
        if (roleExists) {
            return interaction.reply({
                content: `**الــرتــبــة '${role.name}' مــضــافــة مــســبــقــاً للــبــيــع \n الــرجــاء اســتــخــدام أمــر تــعــديــل لإجــراء تــعــديــلات عــلــيــهــا**`,
                ephemeral: true
            });
        }

        // التحقق من عدم تكرار الكتاغوري
        const categoryExists = existingRoles.find(r => r.category === category.id);
        if (categoryExists) {
            return interaction.reply({
                content: `**يــســتــخــدم الــكــتــاغــوري \`${category.name}\` مــســبــقــاً فــي رتــبــة '${categoryExists.roleName}' \n الــرجــاء اخــتــيــار كــتــاغــوري أخــر**`,
                ephemeral: true
            });
        }

        // إضافة الرتبة الجديدة إلى MongoDB
        const newRole = new Roles({
            guildId: interaction.guild.id,
            roleId: role.id,
            roleName: role.name,
            category: category.id,
            categoryName: category.name,
            price: price
        });

        try {
            await newRole.save();
        } catch (error) {
            console.error("Error saving role to database:", error);
            return interaction.reply({
                content: "**حــصــل خــطــأ فــي حــفــظ الــرتــبــة**",
                ephemeral: true
            });
        }

        // الرد بنجاح الإضافة
        await interaction.reply({
            content: `✅ **تــم إضــافــة رتــبــة \`${role.name}\` للــبــيــع بــنــجــاح**`,
            ephemeral: true
        });
    }
};