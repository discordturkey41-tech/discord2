// commands/show-all-shops.js
const { ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js");

module.exports = {
    name: "show-all-shops",
    description: "إظـهـار كـل الـمـتـاجـر (لـلـجـمـيـع)",
    options: [
        { 
            name: "reason", 
            description: "سـبـب الإظـهـار", 
            type: ApplicationCommandOptionType.String, 
            required: false 
        }
    ], 
    
    async execute(client, interaction) {
        const setupData = await Setup.findOne({ guildId: interaction.guild.id });

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
                content: "**لا يـوجـد مـتـاجـر لـإظـهـارـهـا**",
                ephemeral: true
            });
        }

        let shownCount = 0;
        let failedCount = 0;

        // إظهار كل المتاجر
        for (const shop of shops) {
            try {
                const channel = await client.channels.fetch(shop.channelId);
                if (channel) {
                    // إظهار القناة للجميع
                    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: true });
                    
                    shownCount++;
                }
            } catch (error) {
                console.error(`Failed to show shop ${shop.channelId}:`, error);
                failedCount++;
            }
        }

        // إنشاء إيمبد للتقرير
        const embed = new EmbedBuilder()
            .setTitle("تــم إظـهـار كـل الـمـتـاجـر")
            .addFields(
                { name: "الــمــتــاجــر الــمــظــهـورة", value: `> ${shownCount}`, inline: true },
                { name: "الــمــتــاجــر الــتــي لــم تــظــهــر", value: `> ${failedCount}`, inline: true },
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

        // تسجيل في اللوقات إذا تم تحديدها
        if (setupData.logs) {
            try {
                const logChannel = await client.channels.fetch(setupData.logs);
                if (logChannel) {
                    const logEmbed = EmbedBuilder.from(embed)
                        .setTitle("لــوق إظـهـار كـل الـمـتـاجـر")
                        .addFields(
                            { name: "الــمــســؤؤل", value: `> <@${interaction.user.id}>`, inline: true }
                        );

                    await logChannel.send({ embeds: [logEmbed] });
                }
            } catch (error) {
                console.error("Failed to send log:", error);
            }
        }
    }
};