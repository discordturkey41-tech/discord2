const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js"); 
const Logs = require("../../Mangodb/logs.js"); // استيراد Logs
const { ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");

module.exports = {
    name: "active-shop",
    description: "تـفـعـيـل مـتـجـر مـعـطـل",
    options: [
        { 
            name: "shop", 
            description: "الـمـتـجـر الـمـعـطـل", 
            type: ApplicationCommandOptionType.Channel, 
            required: false 
        }, 
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
        
        const shop = interaction.options.getChannel('shop') || interaction.channel;
        const shopData = await Shop.findOne({
            guildId: shop.guild.id,
            channelId: shop.id
        });

        if (!shopData) {
            return interaction.reply({
                content: "**هـذة الـروم لـيـسـت مـتـجـراً**",
                ephemeral: true
            });
        }

        if (shopData.status === "1") {
            return interaction.reply({
                content: "**الــمــتــجــر مــتــفــعــل اصــلا \nانــت شــارب حــاجــة؟**",
                ephemeral: true
            });
        }
        
        // تفعيل رؤية القناة للجميع
        await shop.permissionOverwrites.edit(shop.guild.id, { ViewChannel: true });
        
        const reason = interaction.options.getString('reason') || "لـم يـتـم تـحـديـد سـبـب";

        // إنشاء إيمبد للتفعيل
        const embed = new EmbedBuilder()
            .setTitle("تــم تـفـعـيـل الـمـتـجـر")
            .addFields(
                { name: "الــمــتــجــر", value: `> <#${shop.id}>`, inline: true },
                { name: "الــســبــب", value: `> ${reason}`, inline: true },
                { name: "الــوقــت", value: `> <t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
              )
            .setImage(setupData.line)
            .setFooter({ 
                text: "Dev By Hox Devs", 
                iconURL: interaction.guild.iconURL({ dynamic: true }) 
            });

        await interaction.reply({
            content: `**تــم تـفـعـيـل الـمـتـجـر <#${shop.id}> بــنــجــاح**`,
            ephemeral: true
        });
        
        await shop.send({ embeds: [embed] });

        // إرسال إشعار لمالك المتجر
        try {
            const owner = await client.users.fetch(shopData.ownerId);
            await owner.send({
                content: `**تــم تـفـعـيـل مــتــجــرك <#${shop.id}>**`,
                embeds: [embed],
            });
        } catch (err) {
            // تجاهل الخطأ إذا لم يتمكن من إرسال رسالة خاصة
        }

        // تسجيل في لوق المتاجر
        if (logsData && logsData.shopLogRoom) {
            const logChannel = await client.channels.fetch(logsData.shopLogRoom);
            if (logChannel) {
                const logEmbed = EmbedBuilder.from(embed)
                    .setTitle("لــوق تـفـعـيـل مــتــجــر")
                    .setImage(null)
                    .addFields(
                        { name: "الــمــســؤؤل", value: `> <@${interaction.user.id}>`, inline: true }
                    );

                await logChannel.send({ embeds: [logEmbed] });
            }
        }

        // تحديث حالة المتجر وإعادة التحذيرات إلى 0 ودفع الضريبة
        await Shop.updateOne(
            { guildId: shop.guild.id, channelId: shop.id },
            { 
                $set: { 
                    status: "1",
                    warns: 0,  // إعادة التحذيرات إلى 0
                    taxPaid: "yes", // دفع الضريبة
                    lastTaxPayment: new Date() // تحديث تاريخ آخر دفع
                } 
            }
        );
    }
};