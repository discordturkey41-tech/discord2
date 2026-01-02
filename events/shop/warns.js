const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Shop = require("../../Mangodb/shop.js");

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(client, interaction) {
    if (!interaction.isButton()) return;

    // زر عرض تفاصيل التحذير
    if (interaction.customId.startsWith('warns_')) {
      const warningNumber = parseInt(interaction.customId.split('_')[1]);
      
      // جلب بيانات المتجر
      const shopData = await Shop.findOne({ 
        guildId: interaction.guild.id, 
        channelId: interaction.channel.id 
      });

      if (!shopData) {
        return interaction.reply({
          content: "**لم يتم العثور على بيانات المتجر**",
          ephemeral: true
        });
      }

      // البحث عن التحذير المطلوب
      const warning = shopData.warnings.find(w => w.warningNumber === warningNumber);
      
      if (!warning) {
        return interaction.reply({
          content: `**لم يتم العثور على التحذير رقم #${warningNumber}**`,
          ephemeral: true
        });
      }

      // إنشاء الإيمبد مع عرض الصورة إذا كانت موجودة
      const emb = new EmbedBuilder()
        .setTitle(`تــفــاصــيــل الــتــحــذيــر #${warning.warningNumber}`)
        .setColor('#ff4444')
        .addFields([
          {
            name: "**الــمــتــجــر**",
            value: `<#${interaction.channel.id}>`,
            inline: true
          },
          {
            name: "**رقــم الــتــحــذيــر**",
            value: `**#${warning.warningNumber}**`,
            inline: true
          },
          {
            name: "**الــســبــب**",
            value: `**${warning.reason}**`,
            inline: false
          },
          {
            name: "**الــمــســؤول**",
            value: `<@${warning.warnedBy}>`,
            inline: true
          },
          {
            name: "**تــاريــخ الــتــحــذيــر**",
            value: `**<t:${Math.floor(warning.warnedAt.getTime() / 1000)}:F>**`,
            inline: true
          },
          {
            name: "**مــنــذ**",
            value: `**<t:${Math.floor(warning.warnedAt.getTime() / 1000)}:R>**`,
            inline: true
          }
        ])
        .setFooter({ 
          text: "Dev By Hox Devs", 
          iconURL: interaction.guild.iconURL() 
        })
        .setTimestamp();

      // إضافة الصورة إذا كانت موجودة
      if (warning.imageUrl && warning.imageUrl !== 'لا توجد صورة') {
        emb.setImage(warning.imageUrl);
      }

      await interaction.reply({
        embeds: [emb],
        ephemeral: true
      });
    }

  }
};