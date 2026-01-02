const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js");

module.exports = {
  name: "add-partner",
  description: "إضــافــة شــريــك لــلــمــتــجــر",
  options: [
    {
      name: "user",
      description: "الــشــخــص الــمــراد اضــافــتــه كــشــريــك",
      type: 6, // User
      required: true,
    },
    {
      name: "shop",
      description: "الــمــتــجــر الــمــراد اضــافــة شــريــك لــه",
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
   if (user.bot) {
      return interaction.reply({
        content: "**ازاي هتــضــيــف بــوت شــريــك فــي مــتــجــر؟ تــســتــهــبــل؟**",
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

    // التحقق من أن المستخدم ليس شريكاً بالفعل
    if (shopData.partners.includes(user.id)) {
      return interaction.reply({
        content: "**هــذا الــشــخــص شــريــك بــالــفــعــل**",
        ephemeral: true,
      });
    }

    // منح الصلاحيات للشريك في القناة
    await channel.permissionOverwrites.edit(user.id, {
      SendMessages: true,
      EmbedLinks: true,
      AttachFiles: true,
      ViewChannel: true
    });

    // تحديث بيانات المتجر في الداتا بيز
// بعد قسم تحديث بيانات المتجر
await Shop.updateOne(
    { guildId: interaction.guild.id, channelId: channel.id },
    { 
        $push: { 
            partners: user.id,
            partnersData: {
                userId: user.id,
                addedAt: new Date(),
                addedBy: interaction.user.id,
                isActive: true
            }
        } 
    }
);
    // إنشاء إيمبد التقرير
    const embed = new EmbedBuilder()
      .setTitle("تــم اضــافــة شــريــك جــديــد")
      .addFields(
        { name: "الــمــتــجــر", value: `<#${channel.id}>`, inline: true },
        { name: "الــشــريــك الــجــديــد", value: `<@${user.id}>`, inline: true },
        { name: "الــمــالــك", value: `<@${shopData.ownerId}>`, inline: true },
        { name: "الــوقــت", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: false }
      )
      .setFooter({ 
        text: "Dev By Hox Devs", 
        iconURL: interaction.guild.iconURL() 
      });

    // إرسال الرد
    await interaction.reply({
      content: `**تــم اضــافــة <@${user.id}> كــشــريــك فــي <#${channel.id}> بــنــجــاح**`,
      ephemeral: false
    });

    // إرسال إشعار في قناة المتجر
    await channel.send({
      content: `<@${shopData.ownerId}> <@${user.id}>`,
      embeds: [embed]
    });

    if (setupData.line) {
      await channel.send({
        files: [setupData.line]
      });
    }

    // إرسال إشعار للشريك الجديد
    try {
      await user.send({
        content: `**تــم تــعــيــيــنــك شــريــكــاً فــي مــتــجــر <#${channel.id}>**`,
        embeds: [embed]
      });
    } catch (err) {
      console.log("فشل في إرسال رسالة خاصة للشريك الجديد");
    }

    // تسجيل الحدث في سجلات السيرفر إذا كانت موجودة
    if (setupData.logs) {
      const logChannel = await client.channels.fetch(setupData.logs);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle("لــوق اضــافــة شــريــك")
          .addFields(
            { name: "الــمــتــجــر", value: `<#${channel.id}>`, inline: true },
            { name: "الــمــســؤؤل", value: `<@${interaction.user.id}>`, inline: true },
            { name: "الــشــريــك الــجــديــد", value: `<@${user.id}>`, inline: true }
          )
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  },
};