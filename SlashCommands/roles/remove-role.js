const { ApplicationCommandOptionType } = require("discord.js");
const Roles = require("../../Mangodb/roles.js");

module.exports = {
    name: "remove-sell-role",
    description: "حــذف رتــبــة",
    options: [
        {
            name: "role",
            description: "اخــتــر الــرتــبــة لــحــذفــهــا",
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
        }
    ],

    async execute(client, interaction) {
        const roleId = interaction.options.getString("role");
        if (!interaction.member.permissions.has("Administrator")) {
  return interaction.reply({
    content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج صـلاحـيــة Administrator**`,
    ephemeral: true,
  });
}
        
        const role = await Roles.findOne({ guildId: interaction.guild.id, roleId });
        if (!role) {
            return interaction.reply({
                content: "**هــذه الــرتــبــة غــيــر مــوجــودة**",
                ephemeral: true
            });
        }

        await Roles.deleteOne({ guildId: interaction.guild.id, roleId });

        await interaction.reply({
            content: `**تــم حــذف رتــبــة ${role.roleName} بــنــجــاح**`,
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
                name: r.roleName,
                value: r.roleId
            }));

        await interaction.respond(filtered);
    }
};
