const { ApplicationCommandOptionType, ChannelType } = require("discord.js");

const auctions  = require("../../Mangodb/auctions-channels.js");

module.exports = {
    name: "add-auction-channel",
    description: "إضــافــة روم مــزاد جــديــد",
    options: [
        {
            name: "auction-channel",
            description: "الــروم الــمــخــصــص لــلــمــزاد",
            type: ApplicationCommandOptionType.Channel,
            channel_types: [ChannelType.GuildText],
            required: true
        }
    ],
    async execute(client, interaction) {
        const channel = interaction.options.getChannel("auction-channel");
        if (!interaction.member.permissions.has("Administrator")) {
  return interaction.reply({
    content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج صـلاحـيــة Administrator**`,
    ephemeral: true,
  });
}

        if (channel.type !== ChannelType.GuildText) {
            return interaction.reply({
                content: "**انــت عــبــيــط؟ حــاطــط روم مــزاد روم صــوتــيــه**",
                ephemeral: true
            });
        }
        
        if (!interaction.guild.channels.cache.has(channel.id)) {
            return interaction.reply({
                content: "**انــت عــبــيــط؟ حــاطــط روم مــزاد روم مــش مــوجــوده فــي ســيــرفــر**",
                ephemeral: true
            });
        }

        let auction = await auctions.find({guildId:interaction.guild.id}) || [];
        
        
        if (auction.some(a => a.channelId === channel.id)) {
            return interaction.reply({
                content: "**هــذا الــروم مــضــاف بــالــفــعــل كــروم مــزاد**",
                ephemeral: true
            });
        }

     let newRoom =   new auctions({

            guildId:interaction.guild.id,

            channelId:channel.id

              

        });

        await newRoom.save()

        

        await interaction.reply({
            content: `**تــم اضــافــة روم الــمــزاد <#${channel.id}> بــنــجــاح**`,
            ephemeral: true
        });
    }
};