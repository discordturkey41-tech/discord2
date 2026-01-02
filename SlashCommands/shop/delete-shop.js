const { EmbedBuilder, ApplicationCommandOptionType, PermissionsBitField } = require("discord.js");
const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js");
const Logs = require("../../Mangodb/logs.js"); // استيراد Logs

module.exports = {
  name: "delete-shop",
  description: "لــحــذف مــتــجــر",
  options: [
    {
      name: "channel",
      description: "الــمــتــجــر الــذي تــريــد حــذفــه",
      type: ApplicationCommandOptionType.Channel,
      required: false,
    },
    {
      name: "reason",
      description: "ســبــب حــذف الــمــتــجــر",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: "image",
      description: "صــورة الــدلــيــل عــلــى الحذف",
      type: ApplicationCommandOptionType.Attachment,
      required: false,
    },
  ],

  async execute(client, interaction) {
    const setupData = await Setup.findOne({ guildId: interaction.guild.id });
    const logsData = await Logs.findOne({ guildId: interaction.guild.id }); // جلب بيانات اللوجات

    if (!setupData || !setupData.shopAdmin) {
      return interaction.reply({
        content: `** الــرجــاء تــحــديــد مــســؤول مــتــاجــر مــن أمــر \n /setup **`,
        ephemeral: true,
      });
    }

    if (!interaction.member.roles.cache.has(setupData.shopAdmin)) {
      return interaction.reply({
        content: `** لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر ، تـحـتـاج رتـبـه <@&${setupData.shopAdmin}> **`,
        ephemeral: true,
      });
    }

    const channel = interaction.options.getChannel("channel") || interaction.channel;
    const reason = interaction.options.getString("reason") || "لــم يــتــم تــحــديــد ســبــب";
    const evidence = interaction.options.getAttachment("image");

    const shopData = await Shop.findOne({
      guildId: interaction.guild.id,
      channelId: channel.id,
    });

    if (!shopData) {
      return interaction.reply({
        content: "** هــذه الــقــنــاة لــيــســت مــتــجــر **",
        ephemeral: true,
      });
    }

    // حفظ بيانات المتجر لللوق قبل الحذف
    const shopOwnerId = shopData.ownerId;
    const shopType = shopData.type;
    const shopName = channel.name;

    // حذف المتجر من الداتابيز
    await Shop.deleteOne({ guildId: interaction.guild.id, channelId: channel.id });

    const embed = new EmbedBuilder()
      .setTitle("تــم حــذف الــمــتــجــر")
      .addFields(
        { name: "الــمــتــجــر", value: `> <#${channel.id}>`, inline: true },
        { name: "الــســبــب", value: `> ${reason}`, inline: true },
        { name: "الــوقــت", value: `> <t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      )
      .setColor("Red")
      .setFooter({ text: "Dev By Hox Devs", iconURL: interaction.guild.iconURL({ dynamic: true }) });

    if (evidence) embed.setImage(evidence.url);

    await interaction.reply({
      content: `** تــم حــذف الــمــتــجــر <#${channel.id}> بــنــجــاح **`,
      ephemeral: false
    });

    // إرسال إشعار لمالك المتجر
    try {
      const owner = await client.users.fetch(shopOwnerId);
      await owner.send({
        content: `** تــم حــذف مــتــجــرك <#${channel.id}> **`,
        embeds: [embed],
      });
    } catch (err) {
      console.log("فشل إرسال رسالة لصاحب المتجر");
    }

    // تسجيل الحدث في لوق المتاجر
    if (logsData && logsData.shopLogRoom) {
      const logChannel = await client.channels.fetch(logsData.shopLogRoom);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle("لــوق حــذف مــتــجــر")
          .addFields(
            { name: "الــمــتــجــر", value: `> ${shopName}`, inline: true },
            { name: "الــمــســؤؤل", value: `> <@${interaction.user.id}>`, inline: true },
            { name: "صــاحــب الــمــتــجــر", value: `> <@${shopOwnerId}>`, inline: true },
            { name: "نــوع الــمــتــجــر", value: `> ${shopType}`, inline: true },
            { name: "الــســبــب", value: `> ${reason}`, inline: false },
            { name: "الــوقــت", value: `> <t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
          )
          .setColor("Red")
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    }

    // حذف القناة
    try {
      await channel.delete(`حذف المتجر - السبب: ${reason}`);
    } catch (err) {
      console.log("تعذر حذف القناة:", err);
    }
  },
};