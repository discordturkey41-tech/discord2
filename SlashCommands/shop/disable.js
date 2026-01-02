const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js"); 
const Logs = require("../../Mangodb/logs.js"); // استيراد Logs
const { ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");

module.exports = {
    name: "disable-shop",
    description: "تـعـطـيـل مـتـجـر",
    options: [
        { 
            name: "shop", 
            description: "الـمـتـجـر", 
            type: ApplicationCommandOptionType.Channel, 
            required: false 
        }, 
        { 
            name: "reason", 
            description: "سـبـب الـتـعـطـيـل", 
            type: ApplicationCommandOptionType.String, 
            required: false 
        },
        {
            name: "evidence",
            description: "أدلـة عـلى الـتـعـطـيـل (صـورة)",
            type: ApplicationCommandOptionType.Attachment,
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
        
        let shop = interaction.options.getChannel('shop');
        if (!shop) {
            return interaction.reply({
                content: "**يـجـب تـحـديـد الـمـتـجـر**",
                ephemeral: true
            });
        }

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

        if (shopData.status == "0") {
            return interaction.reply({
                content: "**هـذا الـمـتـجـر مـعـطـل**",
                ephemeral: true
            });
        }
        
        await shop.permissionOverwrites.edit(shop.guild.id, { ViewChannel: false });
        
        let reason = interaction.options.getString('reason') || "لـم يـتـم تـحـديـد سـبـب";
        const evidence = interaction.options.getAttachment('evidence');

        // إنشاء إيمبد للتعطيل
        const embed = new EmbedBuilder()
            .setTitle("تــم تـعـطـيـل الـمـتـجـر")
            .addFields(
                { name: "الــمــتــجــر", value: `> <#${shop.id}>`, inline: true },
                { name: "الــســبــب", value: `> ${reason}`, inline: true },
                { name: "الــوقــت", value: `> <t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
            )
            .setFooter({ 
                text: "Dev By Hox Devs", 
                iconURL: interaction.guild.iconURL({ dynamic: true }) 
            });

        if (setupData.line) {
            embed.setImage(setupData.line);
        }

        if (evidence) embed.setImage(evidence.url);

        await interaction.reply({
            content: `**تــم تـعـطـيـل الـمـتـجـر <#${shop.id}> بــنــجــاح**`,
            ephemeral: true
        });

        // إرسال إشعار لمالك المتجر
        try {
            const owner = await client.users.fetch(shopData.ownerId);
            await owner.send({
                content: `**تــم تـعـطـيـل مــتــجــرك <#${shop.id}>**`,
                embeds: [embed],
            });
        } catch (err) {
            console.log("فشل إرسال رسالة لصاحب المتجر");
        }

        // تسجيل في لوق المتاجر
        if (logsData && logsData.shopLogRoom) {
            const logChannel = await client.channels.fetch(logsData.shopLogRoom);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle("لــوق تـعـطـيـل مــتــجــر")
                    .addFields(
                        { name: "الــمــتــجــر", value: `<#${shop.id}>`, inline: true },
                        { name: "صــاحــب الــمــتــجــر", value: `<@${shopData.ownerId}>`, inline: true },
                        { name: "الــمــســؤؤل", value: `<@${interaction.user.id}>`, inline: true },
                        { name: "الــســبــب", value: reason, inline: true },
                        { name: "الــوقــت", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                    )
                    .setTimestamp();

                if (evidence) logEmbed.setImage(evidence.url);

                await logChannel.send({ embeds: [logEmbed] });
            }
        }

        // تحديث حالة المتجر
        await Shop.updateOne(
            { guildId: shop.guild.id, channelId: shop.id },
            { $set: { status: "0" } }
        );
    }
};