const { ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const Types = require("../../Mangodb/types.js");

module.exports = {
    name: "remove-type",
    description: "حــذف نــوع مــتــجــر",
    options: [
        {
            name: "type",
            description: "اخــتــر الــنــوع الــذي تــريــد حــذفــه",
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
        }
    ],

    async execute(client, interaction) {
        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({
                content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج صـلاحـيــة Administrator**`,
                ephemeral: true,
            });
        }
        
        const guildId = interaction.guild.id;
        const typeName = interaction.options.getString("type");

        try {
            const removedType = await Types.findOneAndDelete({ guildId, name: typeName });
            
            if (!removedType) {
                return interaction.reply({
                    content: `**هــذا الــنــوع غــيــر مــوجــود الرجــاء الــتــحــقــق مــنــه او الاتــصــال بــدعــم**`,
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("✅ تم حذف النوع بنجاح")
                .addFields(
                    { name: "اسم النوع", value: removedType.name }
                )
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
        } catch (error) {
            console.error('Error removing type:', error);
            await interaction.reply({
                content: "❌ حدث خطأ أثناء حذف النوع",
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
                    name: t.name,
                    value: t.name
                }));

            await interaction.respond(filtered);
        } catch (error) {
            console.error('Error in autocomplete:', error);
            await interaction.respond([]);
        }
    }
};