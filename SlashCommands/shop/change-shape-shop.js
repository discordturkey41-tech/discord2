const { EmbedBuilder } = require("discord.js");
const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js");
const Logs = require("../../Mangodb/logs.js"); // استيراد Logs

module.exports = {
  name: "change-shape-shop",
  description: "تــغــيــيــر شــكــل الــمــتــجــر",
  options: [
    {
      name: "new-shape",
      description: "الشــكــل الــجــديــد لــلــمــتــجــر",
      type: 3, // String
      required: true,
    },
    {
      name: "shop",
      description: "الــمــتــجــر الــمــراد تــغــيــيــر شــكــلــه",
      type: 7, // Channel
      required: false,
    },
  ],

  async execute(client, interaction) {
    const setupData = await Setup.findOne({ guildId: interaction.guild.id });
    const logsData = await Logs.findOne({ guildId: interaction.guild.id }); // جلب بيانات اللوجات

    // جلب إعدادات السيرفر
    if (!setupData || !setupData.shopAdmin) {
      return interaction.reply({
        content: `**الــرجــاء تــحــديــد مــســؤول مــتــاجــر مــن امــر \n/setup**`,
        ephemeral: true,
      });
    }

    // تحقق من صلاحيات المسؤول
    if (!interaction.member.roles.cache.has(setupData.shopAdmin)) {
      return interaction.reply({
        content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج رتـبـه <@&${setupData.shopAdmin}>**`,
        ephemeral: true,
      });
    }

    // جلب بيانات الخيارات
    const newShape = interaction.options.getString("new-shape");
    const channel = interaction.options.getChannel("shop") || interaction.channel;

    // التحقق من أن القناة هي متجر
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

    // حفظ الشكل القديم لللوق
    const oldShape = shopData.shape;

    // استخراج الاسم الحالي (بدون الشكل)
    const currentName = channel.name.split("︲").slice(1).join("︲") || shopData.name;
    
    // إنشاء الاسم الجديد (يحتفظ بالاسم القديم)
    const newChannelName = `${newShape}︲${currentName}`;

    // تحديث اسم القناة
    await channel.setName(newChannelName);

    // تحديث بيانات المتجر (الشكل الجديد)
    await Shop.updateOne(
      { guildId: interaction.guild.id, channelId: channel.id },
      { $set: { shape: newShape } }
    );

    // إنشاء إيمبد التقرير
    const embed = new EmbedBuilder()
      .setTitle("تــم تــغــيــيــر شــكــل الــمــتــجــر")
      .addFields(
        { name: "الــمــتــجــر", value: `<#${channel.id}>`, inline: true },
        { name: "الشــكــل الــقــديــم", value: `\`${oldShape}\``, inline: true },
        { name: "الشــكــل الــجــديــد", value: `\`${newShape}\``, inline: true },
        { name: "الاســم الــجــديــد", value: `\`${newChannelName}\``, inline: true },
        { name: "الــوقــت", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      )
      .setFooter({ 
        text: "Dev By Hox Devs", 
        iconURL: interaction.guild.iconURL() 
      });

    if (setupData.line) {
      embed.setImage(setupData.line);
    }

    // إرسال الرد
    await interaction.reply({
      content: `**تــم تــغــيــيــر شــكــل الــمــتــجــر <#${channel.id}> بــنــجــاح**`,
      ephemeral: false
    });

    // إرسال إشعار في قناة المتجر
    await channel.send({
      content: `<@${shopData.ownerId}>`,
      embeds: [embed]
    });

    // تسجيل الحدث في لوق المتاجر
    if (logsData && logsData.shopLogRoom) {
      const logChannel = await client.channels.fetch(logsData.shopLogRoom);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle("لــوق تــغــيــيــر شــكــل مــتــجــر")
          .addFields(
            { name: "الــمــتــجــر", value: `<#${channel.id}>`, inline: true },
            { name: "الــمــســؤؤل", value: `<@${interaction.user.id}>`, inline: true },
            { name: "الشــكــل الــقــديــم", value: `\`${oldShape}\``, inline: true },
            { name: "الشــكــل الــجــديــد", value: `\`${newShape}\``, inline: true },
            { name: "الاســم الــجــديــد", value: `\`${newChannelName}\``, inline: true },
            { name: "الــوقــت", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: false }
          )
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  },
};