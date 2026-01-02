const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js");

module.exports = {
  name: "unwarn",
  description: "لــإزالــة تــحــذيــر مــن مــتــجــر",
  options: [
    {
      name: "channel",
      description: "الــمــتــجــر الــذي تــريــد إزالــة تــحــذيــره",
      type: 7, // Channel
      required: false, // غير إلزامي
    },
    {
      name: "reason",
      description: "ســبــب إزالــة الــتــحــذيــر",
      type: 3, // String
      required: false, // غير إلزامي
    },
    {
      name: "amount",
      description: "عــدد الــتــحــذيــرات الــمــراد إزالــتــهـا",
      type: 4, // Integer
      required: false,
      min_value: 1,
    },
  ],

  async execute(client, interaction) {
    // جلب إعدادات السيرفر
    const setupData = await Setup.findOne({ guildId: interaction.guild.id });
    if (!setupData || !setupData.shopAdmin) {
      return interaction.reply({
        content: `**الــرجــاء تــحــديــد مــســؤول مــتــاجــر مــن امــر \n/setup**`,
        ephemeral: true,
      });
    }

    // تحقق من صلاحيات المسؤول على المتاجر في السيرفر
    if (!interaction.member.roles.cache.has(setupData.shopAdmin)) {
      return interaction.reply({
        content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج رتـبـه <@&${setupData.shopAdmin}>**`,
        ephemeral: true,
      });
    }

    // جلب بيانات الخيارات مع قيم افتراضية
    const channel = interaction.options.getChannel("channel") || interaction.channel;
    const reason = interaction.options.getString("reason") || "لــم يــتــم تــحــديــد ســبــب";
    let amount = interaction.options.getInteger("amount") || 1;

    // التحقق من أن القناة هي متجر
    const shopData = await Shop.findOne({ 
      guildId: interaction.guild.id, 
      channelId: channel.id 
    });

    if (!shopData) {
      return interaction.reply({
        content: "**هــذه الــروم لــيــســت مــتــجــر كــيــف بــتــحــذرهــا**",
        ephemeral: true,
      });
    }
if (amount > shopData.warns) {
  return interaction.reply({
    content: `**كــيــف تــســتــهــبــل ؟ 🤨  \nالــمــتــجــر عــلــيــه ${shopData.warns} تــحــذيــر فــقــط ، وانــت تــبــي تــشــيــل ${amount} ؟**`,
    ephemeral: true,
  });
}
    // تحديث عدد التحذيرات (طرح بدل الجمع)
    const newWarns = Math.max(0, shopData.warns - amount); // التأكد من عدم النزول تحت الصفر
    await Shop.updateOne(
      { guildId: interaction.guild.id, channelId: channel.id },
      { $set: { warns: newWarns } }
    );

    // حساب التحذيرات المتبقية
    const remainingWarns = shopData.maxWarns - newWarns;

    let emb = new EmbedBuilder()
      .setTitle("تــم إزالــة تــحــذيــر مــن الــمــتــجــر")
      .addFields([
        {
          name: "**الــمــتــجــر :**",
          value: `<#${channel.id}>`,
          inline: true,
        },
        {
          name: "**ســبـــب الإزالــة :**",
          value: `**${reason}**`,
          inline: true,
        },
        {
          name: "**عــدد تـحـذيـرات الـمـزالـة :**",
          value: `**${amount}**`,
          inline: true,
        },
        {
          name: "**عــدد تــحــذيـرات الــمـتــجــر الــحــالي :**",
          value: `**${newWarns}**`,
          inline: true,
        },
        {
          name: "**الــتــحـذيــرات الــمــتــبــقــيــة :**",
          value: `**${remainingWarns}**`,
          inline: true,
        },
        {
          name: "**الــوقــت :**",
          value: `**<t:${Math.floor(Date.now() / 1000)}:R>**`,
          inline: true,
        },
      ])
      .setFooter({ 
        text: "Dev By Hox Devs", 
        iconURL: interaction.guild.iconURL() 
      });

    // إرسال الرد
    await interaction.reply({
      content: `**تــم إزالــة تــحــذيــر مــن الــمــتــجــر <#${channel.id}> بــنــجــاح**`
    });

    // إرسال إشعار في قناة المتجر
    await channel.send({
      content: `<@${shopData.ownerId}>`,
      embeds: [emb]
      });

    if (setupData.line) {
      channel.send({
        files: [setupData.line]
      });
    }

    // إرسال إشعار لصاحب المتجر
    try {
      const owner = await client.users.fetch(shopData.ownerId);
      await owner.send({
        content: `**تــم إزالــة تــحــذيــر مــن مــتــجــرك <#${channel.id}>**`,
        embeds: [emb],
      });
    } catch (err) {
      console.log("فشل في إرسال رسالة خاصة لصاحب المتجر");
    }

    // تسجيل الحدث في سجلات السيرفر إذا كانت موجودة
    if (setupData.logs) {
      const logChannel = await client.channels.fetch(setupData.logs);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle("لــوق إزالــة تــحــذيــر")
          .addFields(
            { name: "الــمــتــجــر", value: `<#${channel.id}>`, inline: true },
            { name: "الــمــســؤؤل", value: `<@${interaction.user.id}>`, inline: true },
            { name: "عــدد تــحــذيــرات الــمــتــجــر", value: `${newWarns}`, inline: true },
            { name: "الــســبــب", value: reason, inline: false }
          )
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  },
};