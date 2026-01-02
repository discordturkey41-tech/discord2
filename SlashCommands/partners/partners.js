const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Shop = require('../../Mangodb/shop.js');
const Setup = require("../../Mangodb/setup.js");

module.exports = {
    name: "partners",
    description: "عــرض جــمــيــع شــركــاء الــمــتــجــر",
    options: [
        {
            name: "shop",
            description: "الــمــتــجــر الــمــراد عــرض شــركــائــه",
            type: 7, // Channel
            required: false,
        },
    ],

    async execute(client, interaction) {
        const channel = interaction.options.getChannel("shop") || interaction.channel;
        const setupData = await Setup.findOne({ guildId: interaction.guild.id });

        // جلب بيانات المتجر
        const shopData = await Shop.findOne({ 
            guildId: interaction.guild.id, 
            channelId: channel.id 
        });

        if (!shopData) {
            return interaction.reply({
                content: "**❌ هــذه الــروم لــيــســت مــتــجــر**",
                ephemeral: true,
            });
        }

        const shopAdmin = setupData?.shopAdmin; 

        if (
            interaction.user.id !== shopData.ownerId && // مش صاحب المتجر
            (!shopAdmin || !interaction.member.roles.cache.has(shopAdmin)) // وما عنده رتبة مسؤول المتاجر
        ) {
            return interaction.reply({
                content: "❌ **مــا عــنــدك صــلاحــيــة تــســتــخــدم هــذا الأمــر**",
                ephemeral: true,
            });
        }

        // إنشاء إيمبد
        const embed = new EmbedBuilder()
            .setTitle(`تــفــاصــيــل شــركــاء الــمــتــجــر ${channel.name}`)
            .setDescription(`**<a:hox_star_yellow:1326824705423835190> اخــتــر نــوع الــشــركــاء الــذي تــريــد مــعــرفــة تــفــاصــيــلــهــم <a:hox_star_yellow:1326824705423835190>**`)
            .setImage(setupData.line)
            .addFields(
                { name: "الــمــالــك", value: `<@${shopData.ownerId}>`, inline: true },
                { name: "الــمــتــجــر", value: `<#${channel.id}>`, inline: true },
                { name: "عــدد الــشــركــاء الــحــالــيــيــن", value: `${shopData.partners.length} شــريــك`, inline: true }
            )
            .setFooter({ 
                text: "Dev By Hox Devs", 
                iconURL: interaction.guild.iconURL() || undefined 
            });

        // الأزرار
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('current_partners')
                .setLabel('الــشــركــاء الــحــالــيــيــن')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<a:white_spar:1404823337347322007>'),
            new ButtonBuilder()
                .setCustomId('removed_partners')
                .setLabel('الــشــركــاء الــســابــقــيــن')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<a:black_spar:1404823334293733376>')
        );

        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    },
};
