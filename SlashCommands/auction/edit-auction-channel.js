const { ApplicationCommandOptionType, ChannelType } = require("discord.js");

const AuctionChannels = require("../../Mangodb/auctions-channels.js");

module.exports = {

    name: "edit-auction-channel",

    description: "تــعــديــل روم مــزاد مــوجــود",

    options: [

        {

            name: "old-channel",

            description: "الــروم الــقــديــم",

            type: ApplicationCommandOptionType.String,

            required: true,

            autocomplete: true

        },

        {

            name: "new-channel",

            description: "الــروم الــجــديــد",

            type: ApplicationCommandOptionType.Channel,

            channel_types: [ChannelType.GuildText],

            required: true

        }

    ],

    async execute(client, interaction) {

        const oldChannelId = interaction.options.getString("old-channel");

        const newChannel = interaction.options.getChannel("new-channel");
        if (!interaction.member.permissions.has("Administrator")) {
  return interaction.reply({
    content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج صـلاحـيــة Administrator**`,
    ephemeral: true,
  });
}
        if (newChannel.type !== ChannelType.GuildText) {

            return interaction.reply({

                content: "**انــت عــبــيــط؟ حــاطــط روم مــزاد روم صــوتــيــه**",

                ephemeral: true

            });

        }

        // البحث عن قناة المزاد القديمة في قاعدة البيانات

        const auctionChannel = await AuctionChannels.findOne({ 

            guildId: interaction.guild.id, 

            channelId: oldChannelId 

        });

        

        if (!auctionChannel) {

            return interaction.reply({

                content: "**هــذا الــروم غــيــر مــضــاف كــروم مــزاد**",

                ephemeral: true

            });

        }

        // التحقق من أن القناة الجديدة ليست مضافه بالفعل

        const existingChannel = await AuctionChannels.findOne({ 

            guildId: interaction.guild.id, 

            channelId: newChannel.id 

        });

        

        if (existingChannel) {

            return interaction.reply({

                content: "**هــذا الــروم مــضــاف بــالــفــعــل كــروم مــزاد**",

                ephemeral: true

            });

        }

        // تحديث قناة المزاد في قاعدة البيانات

        await AuctionChannels.updateOne(

            { 

                guildId: interaction.guild.id, 

                channelId: oldChannelId 

            },

            { 

                $set: { 

                    channelId: newChannel.id 

                } 

            }

        );

        await interaction.reply({

            content: `**تــم تــعــديــل روم الــمــزاد مــن <#${oldChannelId}> الــى <#${newChannel.id}> بــنــجــاح**`,

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