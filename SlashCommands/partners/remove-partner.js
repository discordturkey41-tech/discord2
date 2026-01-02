const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js");

module.exports = {
  name: "remove-partner",
  description: "إزالــة شــريــك مــن الــمــتــجــر",
  options: [
    {
      name: "user",
      description: "الــشــريــك الــمــراد إزالــتــه",
      type: 6, // User
      required: true,
    },
    {
      name: "shop",
      description: "الــمــتــجــر الــمــراد إزالــة شــريــك مــنــه",
      type: 7, // Channel
      required: false,
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

    // تحقق من صلاحيات المسؤول
    if (!interaction.member.roles.cache.has(setupData.shopAdmin)) {
      return interaction.reply({
        content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج رتـبـه <@&${setupData.shopAdmin}>**`,
        ephemeral: true,
      });
    }

    // جلب بيانات الخيارات
    const user = interaction.options.getUser("user");
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
    if (!shopData.partners || shopData.partners.length === 0) {
            return interaction.reply({
                content: "**💡 لا يــوجــد شــركــاء فــي هــذا الــمــتــجــر يــا ذكــي 🤓**",
                ephemeral: true,
            });
        }
    // التحقق من أن المستخدم ليس مالك المتجر
    if (user.id === shopData.ownerId) {
      return interaction.reply({
        content: "**هــذا الــشــخــص هــو مــالــك الــمــتــجــر يــا ذكــي**",
        ephemeral: true,
      });
    }
    // التحقق من أن المستخدم شريك بالفعل
    if (!shopData.partners.includes(user.id)) {
      return interaction.reply({
        content: "**هــذا الــشــخــص مــش شــريــك فــي الــمــتــجــر**",
        ephemeral: true,
      });
    }

    // إزالة الصلاحيات من الشريك في القناة
    await channel.permissionOverwrites.edit(user.id, {
      SendMessages: null,
      EmbedLinks: null,
      AttachFiles: null,
      ViewChannel: null
    });

    // تحديث بيانات المتجر في الداتا بيز
// بعد قسم تحديث بيانات المتجر
await Shop.updateOne(
    { 
        guildId: interaction.guild.id, 
        channelId: channel.id 
    },
    {
        $pull: { partners: user.id },
        $set: { 
            "partnersData.$[elem].isActive": false,
            "partnersData.$[elem].removedAt": new Date(),
            "partnersData.$[elem].removedBy": interaction.user.id
        }
    },
    {
        arrayFilters: [{ "elem.userId": user.id }]
    }
);

    // إنشاء إيمبد التقرير
    const embed = new EmbedBuilder()
      .setTitle("تــم إزالــة شــريــك مــن الــمــتــجــر")
      .addFields(
        { name: "الــمــتــجــر", value: `<#${channel.id}>`, inline: true },
        { name: "الــشــريــك الــمــزال", value: `<@${user.id}>`, inline: true },
        { name: "الــمــالــك", value: `<@${shopData.ownerId}>`, inline: true },
        { name: "الــوقــت", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: false }
      )
      .setFooter({ 
        text: "Dev By Hox Devs", 
        iconURL: interaction.guild.iconURL() 
      });

    // إرسال الرد
    await interaction.reply({
      content: `**تــم إزالــة <@${user.id}> كــشــريــك مــن <#${channel.id}> بــنــجــاح**`,
      ephemeral: false
    });

    // إرسال إشعار في قناة المتجر
    await channel.send({
      content: `<@${shopData.ownerId}>`,
      embeds: [embed]
    });

    if (setupData.line) {
      await channel.send({
        files: [setupData.line]
      });
    }

    // إرسال إشعار للشريك المزال
    try {
      await user.send({
        content: `**تــم إزالــتــك كــشــريــك مــن مــتــجــر <#${channel.id}>**`,
        embeds: [embed]
      });
    } catch (err) {
      console.log("فشل في إرسال رسالة خاصة للشريك المزال");
    }

    // تسجيل الحدث في سجلات السيرفر إذا كانت موجودة
    if (setupData.logs) {
      const logChannel = await client.channels.fetch(setupData.logs);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle("لــوق إزالــة شــريــك")
          .addFields(
            { name: "الــمــتــجــر", value: `<#${channel.id}>`, inline: true },
            { name: "الــمــســؤؤل", value: `<@${interaction.user.id}>`, inline: true },
            { name: "الــشــريــك الــمــزال", value: `<@${user.id}>`, inline: true }
          )
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  },
};