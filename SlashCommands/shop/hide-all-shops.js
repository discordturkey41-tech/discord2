const { ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js");
const Logs = require("../../Mangodb/logs.js"); // استيراد Logs

module.exports = {
    name: "hide-all-shops",
    description: "إخـفـاء كـل الـمـتـاجـر (مـن الـجـمـيـع)",
    options: [
        { 
            name: "reason", 
            description: "سـبـب الإخـفـاء", 
            type: ApplicationCommandOptionType.String, 
            required: false 
        }
    ], 
    
    async execute(client, interaction) {
        const setupData = await Setup.findOne({ guildId: interaction.guild.id });
        const logsData = await Logs.findOne({ guildId: interaction.guild.id }); // جلب بيانات اللوجات

        if (!setupData || !setupData.shopAdmin) {
            return interaction.reply({
                content: `**الــرجــاء تــحــديــد مــســؤول مــتــاجــر مــن امــر \n/setup**`,
                ephemeral: true,
            });
        }

        if (!interaction.member.roles.cache.has(setupData.shopAdmin)) {
            return interaction.reply({
                content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج رتـبـه <@&${setupData.shopAdmin}>**`,
                ephemeral: true,
            });
        }
        
        let reason = interaction.options.getString('reason') || "لـم يـتـم تـحـديـد سـبـب";

        // جلب جميع المتاجر في السيرفر
        const shops = await Shop.find({ guildId: interaction.guild.id });
        
        if (shops.length === 0) {
            return interaction.reply({
                content: "**لا يـوجـد مـتـاجـر لـإخـفـائـهـا**",
                ephemeral: true
            });
        }

        let hiddenCount = 0;
        let failedCount = 0;
        const hiddenShops = []; // لتخزين المتاجر المخفية لللوق

        // إخفاء كل المتاجر
        for (const shop of shops) {
            try {
                const channel = await client.channels.fetch(shop.channelId);
                if (channel) {
                    // إخفاء القناة من الجميع بما في ذلك صاحب المتجر
                    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: false });
                    if (shop.ownerId) {
                        await channel.permissionOverwrites.edit(shop.ownerId, { ViewChannel: false });
                    }
                    
                    hiddenCount++;
                    hiddenShops.push({
                        name: channel.name,
                        id: channel.id,
                        ownerId: shop.ownerId
                    });
                }
            } catch (error) {
                console.error(`Failed to hide shop ${shop.channelId}:`, error);
                failedCount++;
            }
        }

        // إنشاء إيمبد للتقرير
        const embed = new EmbedBuilder()
            .setTitle("تــم إخـفـاء كـل الـمـتـاجـر")
            .addFields(
                { name: "الــمــتــاجــر الــمــخــفــيــة", value: `> ${hiddenCount}`, inline: true },
                { name: "الــمــتــاجــر الــتــي لــم تــخــتــفــي", value: `> ${failedCount}`, inline: true },
                { name: "الــســبــب", value: `> ${reason}`, inline: false },
                { name: "الــوقــت", value: `> <t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
            )
            .setFooter({ 
                text: "Dev By Hox Devs", 
                iconURL: interaction.guild.iconURL({ dynamic: true }) 
            });

        await interaction.reply({
            embeds: [embed],
            ephemeral: false
        });

        // تسجيل في لوق المتاجر
        if (logsData && logsData.shopLogRoom) {
            try {
                const logChannel = await client.channels.fetch(logsData.shopLogRoom);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle("لــوق إخـفـاء كـل الـمـتـاجـر")
                        .addFields(
                            { name: "الــمــســؤؤل", value: `> <@${interaction.user.id}>`, inline: true },
                            { name: "الــمــتــاجــر الــمــخــفــيــة", value: `> ${hiddenCount}`, inline: true },
                            { name: "الــســبــب", value: `> ${reason}`, inline: false },
                            { name: "الــوقــت", value: `> <t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                        );

                    // إضافة قائمة بالمتاجر المخفية (أول 10 متاجر فقط)
                    if (hiddenShops.length > 0) {
                        const shopsList = hiddenShops.slice(0, 10).map(shop => 
                            `• <#${shop.id}> - <@${shop.ownerId}>`
                        ).join('\n');
                        
                        if (hiddenShops.length > 10) {
                            shopsList += `\n... و${hiddenShops.length - 10} متجر آخر`;
                        }
                        
                        logEmbed.addFields({
                            name: "المتاجر المخفية",
                            value: shopsList,
                            inline: false
                        });
                    }

                    await logChannel.send({ embeds: [logEmbed] });
                }
            } catch (error) {
                console.error("Failed to send shop log:", error);
            }
        }
    }
};