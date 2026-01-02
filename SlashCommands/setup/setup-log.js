const { ApplicationCommandOptionType, EmbedBuilder, ChannelType } = require("discord.js");
const Logs = require("../../Mangodb/logs.js");
const Setup = require("../../Mangodb/setup.js");

module.exports = {
  name: "setup-logs",
  description: "تــنــظــيــم رومــات الــلــوقــات",
  options: [
    { 
      name: "shop-log", 
      description: "روم لــوقــات الــمــتــاجــر", 
      type: ApplicationCommandOptionType.Channel,
      channel_types: [ChannelType.GuildText]
    },
  ],

  async execute(client, interaction) {
    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.reply({
        content: "**لا تــمــلــك صــلــاحــيــات الــمــســـؤول**",
        ephemeral: true,
      });
    }

    const shopLog = interaction.options.getChannel("shop-log");
    const auctionLog = interaction.options.getChannel("auction-log");
    const orderLog = interaction.options.getChannel("order-log");

    // إذا لم يختر أي روم، ننشئ روم افتراضي باسم Logs
    if (!shopLog && !auctionLog && !orderLog) {
      try {
        const category = await interaction.guild.channels.create({
          name: "Logs",
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: ["ViewChannel"]
            }
          ]
        });

        const shopChannel = await interaction.guild.channels.create({
          name: "shop-logs",
          type: ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: ["ViewChannel"]
            }
          ]
        });

        const auctionChannel = await interaction.guild.channels.create({
          name: "auction-logs",
          type: ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: ["ViewChannel"]
            }
          ]
        });

        const orderChannel = await interaction.guild.channels.create({
          name: "order-logs",
          type: ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: ["ViewChannel"]
            }
          ]
        });

        let logsData = await Logs.findOne({ guildId: interaction.guild.id });
        
        if (!logsData) {
          logsData = new Logs({
            guildId: interaction.guild.id,
            shopLogRoom: shopChannel.id,
            auctionLogRoom: auctionChannel.id,
            orderLogRoom: orderChannel.id,
            category: "Logs",
          });
        } else {
          logsData.shopLogRoom = shopChannel.id;
          logsData.auctionLogRoom = auctionChannel.id;
          logsData.orderLogRoom = orderChannel.id;
          logsData.category = "Logs";
        }

        await logsData.save();

        const embed = new EmbedBuilder()
          .setTitle("✅ تــم إنــشــاء رومــات الــلــوقــات بــنــجــاح")
          .addFields(
            { name: "روم المتاجر", value: `<#${shopChannel.id}>`, inline: true },
            { name: "روم المزادات", value: `<#${auctionChannel.id}>`, inline: true },
            { name: "روم الطلبات", value: `<#${orderChannel.id}>`, inline: true }
          );

        return interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (error) {
        console.error(error);
        return interaction.reply({
          content: "**حــدث خــطــأ أثــنــاء إنــشــاء الــرومــات**",
          ephemeral: true,
        });
      }
    }

    // إذا اختار رومات معينة
    try {
      let logsData = await Logs.findOne({ guildId: interaction.guild.id });

      if (!logsData) {
        logsData = new Logs({
          guildId: interaction.guild.id,
        });
      }

      if (shopLog) logsData.shopLogRoom = shopLog.id;
      if (auctionLog) logsData.auctionLogRoom = auctionLog.id;
      if (orderLog) logsData.orderLogRoom = orderLog.id;

      await logsData.save();

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("✅ تــم تــحــديــث رومــات الــلــوقــات بــنــجــاح");

      if (shopLog) embed.addFields({ name: "روم المتاجر", value: `<#${shopLog.id}>`, inline: true });
      if (auctionLog) embed.addFields({ name: "روم المزادات", value: `<#${auctionLog.id}>`, inline: true });
      if (orderLog) embed.addFields({ name: "روم الطلبات", value: `<#${orderLog.id}>`, inline: true });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error(error);
      return interaction.reply({
        content: "**حــدث خــطــأ أثــنــاء تــحــديــث الــبــيــانــات**",
        ephemeral: true,
      });
    }
  },
};
