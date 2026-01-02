const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js");
const SaleState = require('../../Mangodb/saleState.js');
const Logs = require("../../Mangodb/logs.js"); // استيراد Logs

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(client, interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.guild) return;

    const guildId = interaction.guild.id;

    // === زر حذف المتجر ===
    if (interaction.isButton() && interaction.customId === "delete-shop-btn") {
      const shopData = await Shop.findOne({ guildId, channelId: interaction.channel.id });
      if (!shopData) {
        return interaction.reply({
          content: "❌ هـذه الـروم لـيست مـتـجـر",
          ephemeral: true
        });
      }

      const owner = shopData.ownerId;

      if (interaction.user.id !== owner) {
        return interaction.reply({
          content: "**تــبــي تــحــذف لــ صــديــقــك الــمــتــجــر\n مــا تــوقــعــتــهــا**",
          ephemeral: true 
        });
      }

      const saleState = await SaleState.findOne({
        guildId: interaction.guild.id,
        type: "delete_shop"
      });

      if (saleState?.state === "disable") {
        return interaction.reply({
          content: "**خــدمــة حــذف الــمــتــجــر مــعــطــلــة حالياً**",
          ephemeral: true
        });
      }

      const setupData = await Setup.findOne({ guildId });
                    const logsData = await Logs.findOne({ guildId: interaction.guild.id }); // جلب بيانات اللوجات

      const embed = new EmbedBuilder()
        .setTitle("تــأكــيــد حــذف الــمــتــجــر")
        .setAuthor({
          name: interaction.guild.name,
          iconURL: interaction.guild.iconURL({ dynamic: true }),
        })
        .setImage(setupData.line)
        .addFields(
          { name: "الــمــتــجــر", value: `<#${interaction.channel.id}>`, inline: true },
          { name: "الــمــالــك", value: `<@${owner}>`, inline: true },
          { name: "الــتــحــذيــرات", value: `${shopData.warns}/${shopData.maxWarns}`, inline: true }
        )
        .setFooter({
          text: "Dev By Hox Devs",
          iconURL: interaction.guild.iconURL({ dynamic: true })
        });

      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("36c/o7nfirm_shop_delete")
          .setLabel("تــاكــيــد حــذف الــمــتــجــر")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("🗑️"),
        new ButtonBuilder()
          .setCustomId("cancel_shop_delete")
          .setLabel("إلــغــاء الــعــمــلــيــة")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("❌")
      );

      return interaction.reply({
        embeds: [embed],
        components: [confirmRow],
        ephemeral: true
      });
    }

    // === تأكيد حذف المتجر ===
    if (interaction.isButton() && interaction.customId === "36c/o7nfirm_shop_delete") {
      const shopData = await Shop.findOne({ guildId, channelId: interaction.channel.id });
      if (!shopData) {
        return interaction.reply({
          content: "❌ هـذه الـروم لـيست مـتـجـر",
          ephemeral: true
        });
      }

      const owner = shopData.ownerId;
      if (interaction.user.id !== owner) {
        return interaction.reply({
          content: "**❌ لــيــس لــديك صــلاحــيــة حــذف هــذا الــمــتــجــر**",
          ephemeral: true
        });
      }

      const setupData = await Setup.findOne({ guildId });
      const channel = interaction.channel;

      // حذف بيانات المتجر من الداتابيز
      await Shop.deleteOne({ guildId, channelId: channel.id });

      // إنشاء إيمبد التأكيد
      const embed = new EmbedBuilder()
        .setTitle("تــم حــذف الــمــتــجــر بــنــجــاح")
        .setAuthor({
          name: interaction.guild.name,
          iconURL: interaction.guild.iconURL({ dynamic: true }),
        })
        .setImage(setupData.line)
        .addFields(
          { name: "الــمــتــجــر", value: `\`${channel.name}\``, inline: true },
          { name: "الــمــالــك", value: `<@${owner}>`, inline: true },
          { name: "الــوقــت", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        )
        .setFooter({
          text: "Dev By Hox Devs",
          iconURL: interaction.guild.iconURL({ dynamic: true })
        });

      // إرسال رسالة التأكيد
      await interaction.update({
        content: "**تــم حــذف الــمــتــجــر بــنــجــاح**",
        embeds: [embed],
        components: []
      });

      // إرسال رسالة خاصة للمالك
      try {
        const ownerUser = await client.users.fetch(owner);
        await ownerUser.send({
          content: `**تــم حــذف مــتــجــرك \`${channel.name}\` بــنــجــاح**`,
          embeds: [embed]
        });
      } catch (err) {
        console.log("❌ فشل في إرسال رسالة خاصة للمالك");
      }
      
      // تسجيل في اللوق
        if (logsData && logsData.shopLogRoom) {
        try {
                const logChannel = await client.channels.fetch(logsData.shopLogRoom);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setTitle("لــوق حــذف مــتــجــر")
              .addFields(
                { name: "الــمــتــجــر", value: `\`${channel.name}\``, inline: true },
                { name: "الــمــالــك", value: `<@${owner}>`, inline: true },
                { name: "الــمــســؤؤل", value: `<@${interaction.user.id}>`, inline: true },
                { name: "الــوقــت", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
              )
              .setColor("Red")
              .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] });
          }
        } catch (err) {
          console.log("❌ فشل في إرسال اللوق");
        }
      }

      // حذف الروم بعد ثانيتين
      setTimeout(async () => {
        try {
          await channel.delete("حذف المتجر بواسطة المالك");
        } catch (err) {
          console.log("❌ فشل في حذف الروم:", err);
        }
      }, 2000);
    }

    // === إلغاء حذف المتجر ===
    if (interaction.isButton() && interaction.customId === "cancel_shop_delete") {
      await interaction.update({
        content: "**تــم إلــغــاء عــمــلــيــة حــذف الــمــتــجــر**",
        embeds: [],
        components: []
      });
    }
  }
};