const { ApplicationCommandOptionType, ChannelType } = require("discord.js");
const Roles = require("../../Mangodb/roles.js");

module.exports = {
    name: "edit-sell-role",
    description: "تــعــديــل رتــبــة للــبــيــع",
    options: [
        {
            name: "role",
            description: "اخــتــر الــرتــبــة لــتــعــديــل عــلــيــهــا",
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
        },
        {
            name: "category",
            description: "كــاتــغــوري الــتــكــتــات جــديــد",
            type: ApplicationCommandOptionType.Channel,
            channel_types: [ChannelType.GuildCategory],
            required: false
        },
        {
            name: "new-role",
            description: "رتــبــة جــديــدة",
            type: ApplicationCommandOptionType.Role,
            required: false
        },
        {
            name: "price",
            description: "ســعــر جــديــد لــلــرتــبــة",
            type: ApplicationCommandOptionType.Integer,
            required: false,
            min_value: 1
        }
    ],

    async execute(client, interaction) {
        const roleId = interaction.options.getString("role");
        const roleData = await Roles.findOne({ guildId: interaction.guild.id, roleId });
        
        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({
                content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج صـلاحـيــة Administrator**`,
                ephemeral: true,
            });
        }
        
        if (!roleData) {
            return interaction.reply({
                content: "**هــذه الــرتــبــة غــيــر مــوجــودة**",
                ephemeral: true
            });
        }

        const newCategory = interaction.options.getChannel("category")?.id;
        const newRole = interaction.options.getRole("new-role");
        const newPrice = interaction.options.getInteger("price");

        // التحقق من عدم تكرار الكتاغوري
        if (newCategory && newCategory !== roleData.category) {
            const categoryExists = await Roles.findOne({ 
                guildId: interaction.guild.id,
                category: newCategory,
                roleId: { $ne: roleId }
            });
            
            if (categoryExists) {
                return interaction.reply({
                    content: `**يــســتــخــدم الــكــتــاغــوري مــســبــقــاً فــي رتــبــة '${categoryExists.roleName}' \n الــرجــاء اخــتــيــار كــتــاغــوري أخــر**`,
                    ephemeral: true
                });
            }
        }

        // التحقق من عدم تكرار الرتبة
        if (newRole && newRole.id !== roleData.roleId) {
            const roleExists = await Roles.findOne({ 
                guildId: interaction.guild.id,
                roleId: newRole.id,
                _id: { $ne: roleData._id }
            });
            
            if (roleExists) {
                return interaction.reply({
                    content: `**الــرتــبــة '${newRole.name}' مــضــافــة مــســبــقــاً \n الــرجــاء اخــتــيــار رتــبــة أخــرى**`,
                    ephemeral: true
                });
            }
        }

        // تحديث القيم
        if (newCategory) roleData.category = newCategory;
        if (newRole) {
            roleData.roleId = newRole.id;
            roleData.roleName = newRole.name;
        }
        if (newPrice) roleData.price = newPrice;

        await roleData.save();

        await interaction.reply({
            content: `**تــم تــعــديــل رتــبــة ${roleData.roleName} بــنــجــاح**`,
            ephemeral: true
        });
    },

    async autocomplete(interaction) {
        const roles = await Roles.find({ guildId: interaction.guild.id });

        const focused = interaction.options.getFocused()?.toLowerCase() || "";
        const filtered = roles
            .filter(r => r.roleName.toLowerCase().includes(focused))
            .slice(0, 25)
            .map(r => ({
                name: `${r.roleName}`,
                value: r.roleId
            }));

        await interaction.respond(filtered);
    }
};