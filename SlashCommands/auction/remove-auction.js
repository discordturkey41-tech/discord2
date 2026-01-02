const { ApplicationCommandOptionType } = require('discord.js');
const Auction = require('../../Mangodb/auction.js');
const Setup = require('../../Mangodb/setup.js');

module.exports = {
    name: "remove-auction",
    description: "حــذف مــزاد نــشــط",
    dm_permission: false,
    options: [
        { 
            name: "auction-room", 
            description: "روم الــمــزاد الــمــراد حــذفــه", 
            type: ApplicationCommandOptionType.String, 
            required: true, 
            autocomplete: true 
        }
    ],

    async execute(client, interaction) {
        const setup = await Setup.findOne({ guildId: interaction.guild.id });
        if (!setup?.auctionAdmin) {
            return interaction.reply("**الــرجــاء تــحــديــد مــســؤول مــزاد مــن امــر \n/setup**");
        }
        
        if (!interaction.member.roles.cache.has(setup.auctionAdmin)) {
            return interaction.reply(`**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هـذا الأمـر تـحـتـاج رتـبـه <@&${setup.auctionAdmin}>**`);
        }

        const auctionChannelId = interaction.options.getString("auction-room");
        const auctionChannel = interaction.guild.channels.cache.get(auctionChannelId);
        if (!auctionChannel) {
            return interaction.reply("**هــذا الــروم غــيــر مــوجــود**");
        }

        // البحث عن مزاد نشط في هذه القناة
        const existingAuction = await Auction.findOne({ 
            guildId: interaction.guild.id, 
            channelId: auctionChannelId, 
            active: true 
        });

        if (!existingAuction) {
            return interaction.reply(`**لا يــوجــد مــزاد نــشــط فــي هــذا الــروم <#${auctionChannelId}>**`);
        }

        // تحديث حالة المزاد إلى غير نشط فقط
        await Auction.updateOne(
            { _id: existingAuction._id },
            { $set: { active: false } }
        );

        // الرد برسالة بسيطة
        await interaction.reply(`**تــم حــذف الــمــزاد ${auctionChannel} بــنــجــاح**`);
    },

    async autocomplete(interaction) {
        try {
            // جلب جميع المزادات النشطة في السيرفر
            const activeAuctions = await Auction.find({ 
                guildId: interaction.guild.id, 
                active: true 
            });
            
            // الحصول على القنوات من الكاش
            const focused = interaction.options.getFocused()?.toLowerCase() || "";
            
            // فلترة القنوات النشطة فقط التي تطابق البحث
            const filtered = activeAuctions
                .map(auction => {
                    const channel = interaction.guild.channels.cache.get(auction.channelId);
                    return channel ? {
                        name: `#${channel.name}`,
                        value: auction.channelId
                    } : null;
                })
                .filter(Boolean) // إزالة القيم الفارغة
                .filter(channel => channel.name.toLowerCase().includes(focused))
                .slice(0, 25); // الحد الأقصى للاقتراحات

            await interaction.respond(filtered);
        } catch (err) {
            console.error(err);
            await interaction.respond([]);
        }
    }
};