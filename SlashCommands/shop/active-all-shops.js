const { ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js");
const Logs = require("../../Mangodb/logs.js"); // استيراد Logs

module.exports = {
    name: "active-all-shops",
    description: "تـفـعـيـل كـل الـمـتـاجـر",
    options: [
        { 
            name: "reason", 
            description: "سـبـب الـتـفـعـيـل", 
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
                content: "**لا يـوجـد مـتـاجـر لـتـفـعـيـلـهـا**",
                ephemeral: true
            });
        }

        // فلتر المتاجر المعطلة فقط
        const disabledShops = shops.filter(shop => shop.status !== "1");
        
        // تحقق إذا كان كل المتاجر مفعلة
        if (disabledShops.length === 0) {
            return interaction.reply({
                content: "**انــت عــبــيــط مــفــيــش مــتــاجــر مــعــطــلــه اصــلا\n اهــبــل مــلــيــتــو الــبــلــد**",
                ephemeral: true
            });
        }

        let enabledCount = 0;
        let failedCount = 0;
        let taxPaidCount = 0;

        // تفعيل فقط المتاجر المعطلة
        for (const shop of disabledShops) {
            try {
                const channel = await client.channels.fetch(shop.channelId);
                if (channel) {
                    await channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: true });
                    
                    // تحديث حالة المتجر في الداتا مع دفع الضريبة
                    await Shop.updateOne(
                        { guildId: interaction.guild.id, channelId: shop.channelId },
                        { 
                            $set: { 
                                status: "1",
                                warns: 0,
                                taxPaid: "yes", // دفع الضريبة
                                lastTaxPayment: new Date() // تحديث تاريخ آخر دفع
                            } 
                        }
                    );
                    
                    enabledCount++;
                    taxPaidCount++;
                }
            } catch (error) {
                console.error(`Failed to enable shop ${shop.channelId}:`, error);
                failedCount++;
            }
        }

        // إنشاء إيمبد للتقرير
        const embed = new EmbedBuilder()
            .setTitle("تــم تـفـعـيـل الـمـتـاجـر الـمـعـطـلـة")
            .addFields(
                { name: "عــدد الــمــتــاجــر الــمــعــطــلــة", value: `> ${disabledShops.length}`, inline: true },
                { name: "الــمــتــاجــر الــمــفــعــلــة", value: `> ${enabledCount}`, inline: true },
                { name: "الــمــتــاجــر الــتــي لــم تــتــفــعــل", value: `> ${failedCount}`, inline: true },
                { name: "الــمــتــاجــر الــتــي تــم دفــع ضــريــبــتــهــا", value: `> ${taxPaidCount}`, inline: true },
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

        // تسجيل في لوق المتاجر إذا تم تحديدها
        if (logsData && logsData.shopLogRoom) {
            try {
                const logChannel = await client.channels.fetch(logsData.shopLogRoom);
                if (logChannel) {
                    const logEmbed = EmbedBuilder.from(embed)
                        .setTitle("لــوق تـفـعـيـل كـل الـمـتـاجـر الـمـعـطـلـة")
                        .addFields(
                            { name: "الــمــســؤؤل", value: `> <@${interaction.user.id}>`, inline: true }
                        );

                    await logChannel.send({ embeds: [logEmbed] });
                }
            } catch (error) {
                console.error("Failed to send shop log:", error);
            }
        }
    }
};