const { EmbedBuilder } = require("discord.js");
const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js");
const Logs = require("../../Mangodb/logs.js"); // استيراد Logs

module.exports = {
  name: "change-name-shop",
  description: "تــغــيــيــر اســم الــمــتــجــر",
  options: [
    {
      name: "new-name",
      description: "الاســم الــجــديــد لــلــمــتــجــر",
      type: 3, // String
      required: true,
    },
    {
      name: "shop",
      description: "الــمــتــجــر الــمــراد تــغــيــيــر اســمــه",
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
    const newName = interaction.options.getString("new-name").replace(/\s+/g, "︲");
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

    // الحصول على الشكل الحالي
    const currentShape = shopData.shape;
    
    // إنشاء الاسم الجديد (يحتفظ بالشكل القديم)
    const newChannelName = `${currentShape}︲${newName}`;

    if (channel.name.toLowerCase() === newChannelName.toLowerCase()) {
      return interaction.reply({
        content: "**انـت حـاطـط نـفـس الاسـم الـقـديـم! انـت عـبـيـط يـبـنـي؟\n روح اتـعـالـج احـسـن لـك**",
        ephemeral: true
      });
    }

    // حفظ الاسم القديم
    const oldName = channel.name;

    // تحديث اسم القناة
    await channel.setName(newChannelName);

    // تحديث بيانات المتجر
    await Shop.updateOne(
      { guildId: interaction.guild.id, channelId: channel.id },
      { $set: { name: newName } }
    );

    // إنشاء إيمبد التقرير
    const embed = new EmbedBuilder()
      .setTitle("تــم تــغــيــيــر اســم الــمــتــجــر")
      .setImage(setupData.line)
      .addFields(
        { name: "الــمــتــجــر", value: `<#${channel.id}>`, inline: true },
        { name: "الاســم الــقــديــم", value: `\`${oldName}\``, inline: true },
        { name: "الاســم الــجــديــد", value: `\`${newChannelName}\``, inline: true },
        { name: "الــوقــت", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: false }
      )
      .setFooter({ 
        text: "Dev By Hox Devs", 
        iconURL: interaction.guild.iconURL() 
      });

    // إرسال الرد
    await interaction.reply({
      content: `**تــم تــغــيــيــر اســم الــمــتــجــر <#${channel.id}> بــنــجــاح**`,
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
          .setTitle("لــوق تــغــيــيــر اســم مــتــجــر")
          .addFields(
            { name: "الــمــتــجــر", value: `<#${channel.id}>`, inline: true },
            { name: "الــمــســؤؤل", value: `<@${interaction.user.id}>`, inline: true },
            { name: "الاســم الــقــديــم", value: `\`${oldName}\``, inline: true },
            { name: "الاســم الــجــديــد", value: `\`${newChannelName}\``, inline: true },
            { name: "الــوقــت", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: false }
          )
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  },
};