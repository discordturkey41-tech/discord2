const { ApplicationCommandOptionType, ChannelType } = require("discord.js");
const AuctionChannels = require("../../Mangodb/auctions-channels.js");

module.exports = {
    name: "remove-auction-channel",
    description: "حــذف روم مــزاد مــوجــود",
    options: [
        {
            name: "auction-channel",
            description: "اخــتــر روم الــمــزاد الــذي تــريــد حــذفــه",
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
        }
    ],
    async execute(client, interaction) {
        const channelId = interaction.options.getString("auction-channel");
                if (!interaction.member.permissions.has("Administrator")) {
  return interaction.reply({
    content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج صـلاحـيــة Administrator**`,
    ephemeral: true,
  });
}
        // البحث عن قناة المزاد في قاعدة البيانات
        const auctionChannel = await AuctionChannels.findOne({ 
            guildId: interaction.guild.id, 
            channelId: channelId 
        });
        
        if (!auctionChannel) {
            return interaction.reply({
                content: "**هــذا الــروم غــيــر مــضــاف كــروم مــزاد**",
                ephemeral: true
            });
        }

        // حذف قناة المزاد من قاعدة البيانات
        await AuctionChannels.deleteOne({ 
            guildId: interaction.guild.id, 
            channelId: channelId 
        });

        await interaction.reply({
            content: `**تــم حــذف روم الــمــزاد <#${channelId}> بــنــجــاح**`,
            ephemeral: true
        });
    },
    async autocomplete(interaction) {
        const focused = interaction.options.getFocused()?.toLowerCase() || "";
        
        // جلب جميع قنوات المزاد الخاصة بالسيرفر
        const auctionChannels = await AuctionChannels.find({ 
            guildId: interaction.guild.id 
        });

        const filtered = auctionChannels
            .filter(a => {
                const channel = interaction.guild.channels.cache.get(a.channelId);
                return channel && channel.name.toLowerCase().includes(focused);
            })
            .slice(0, 25)
            .map(a => ({
                name: `#${interaction.guild.channels.cache.get(a.channelId)?.name || "???"}`,
                value: a.channelId
            }));

        await interaction.respond(filtered);
    }
};