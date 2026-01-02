const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js");
const { EmbedBuilder } = require("discord.js");
const Logs = require("../../Mangodb/logs.js"); // استيراد Logs

module.exports = {
    name: "messageCreate",
    once: false,
    async execute(client, message) {
        
        if (!message.guild) return;
        const logsData = await Logs.findOne({ guildId: message.guild.id }); // جلب بيانات اللوجات

        const setupData = await Setup.findOne({ guildId: message.guild.id });
        const shopData = await Shop.findOne({
            guildId: message.guild.id,
            channelId: message.channel.id
        });

        if (!shopData) return;
        if (shopData.status === "0") return;       
        message.author.id === shopData.ownerId || 
            (shopData.partners && shopData.partners.includes(message.author.id));

        let shop = message.channel;
        let needsUpdate = false;

        // التحقق من المنشنات في المحتوى
        const content = message.content;

        if (content.includes("@everyone")) {
            if (shopData.everyone <= 0) {
                await disableShop("تـخـطـي عـدد مـنـشـنـات Everyone");
                return;
            } else {
                shopData.everyone--;
                needsUpdate = true;
            }
        }

        if (content.includes("@here")) {
            if (shopData.here <= 0) {
                await disableShop("تـخـطـي عـدد مـنـشـنـات Here");
                return;
            } else {
                shopData.here--;
                needsUpdate = true;
            }
        }

        if (setupData && setupData.shopMention && content.includes(`<@&${setupData.shopMention}>`)) {
            if (shopData.shop <= 0) {
                await disableShop("تـخـطـي عـدد مـنـشـنـات Shop");
                return;
            } else {
                shopData.shop--;
                needsUpdate = true;
            }
        }

        // تحديث البيانات فقط إذا كان هناك تغيير
        if (needsUpdate) {
            await Shop.updateOne(
                { guildId: shop.guild.id, channelId: shop.id },
                { $set: {
                    everyone: shopData.everyone,
                    here: shopData.here,
                    shop: shopData.shop
                }}
            );
        }

        async function disableShop(reason) {
            await message.channel.permissionOverwrites.edit(message.guild.id, { ViewChannel: false });
            
            const embed = new EmbedBuilder()
                .setTitle("تــم تـعـطـيـل الـمـتـجـر")
                .addFields(
                    { name: "الــمــتــجــر", value: `> <#${shop.id}>`, inline: true },
                    { name: "الــســبــب", value: `> ${reason}`, inline: true },
                    { name: "الــوقــت", value: `> <t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                )
                .setImage(setupData?.line || null)
                .setFooter({
                    text: "Dev By Hox Devs",
                    iconURL: message.guild.iconURL({ dynamic: true })
                });

            await message.channel.send({ content: `${message.author}`, embeds: [embed] });
            
            await Shop.updateOne(
                { guildId: shop.guild.id, channelId: shop.id },
                { $set: { status: "0" } }
            );

        if (logsData && logsData.shopLogRoom) {
                try {
                const logChannel = await client.channels.fetch(logsData.shopLogRoom);
                    if (logChannel) {
                        const logEmbed = EmbedBuilder.from(embed)
                            .setTitle("لــوق تـعـطـيـل مــتــجــر")
                            .setImage(null)
                            .addFields(
                                { name: "الــمــســؤؤل", value: `> <@${client.user.id}>`, inline: true }
                            );

                        await logChannel.send({ embeds: [logEmbed] });
                    }
                } catch (error) {
                    // تجاهل الخطأ
                }
            }
        }
    }
};
