const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js");
const Logs = require("../../Mangodb/logs.js"); // استيراد Logs

module.exports = {
  name: "change-owner-shop",
  description: "تــغــيــيــر صــاحــب الــمــتــجــر",
  options: [
    {
      name: "owner",
      description: "الــمــالــك الــجــديــد لــلــمــتــجــر",
      type: 6, // User
      required: true,
    },
    {
      name: "shop",
      description: "الــمــتــجــر الــمــراد تــغــيــيــر مــالــكــه",
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

    // تحقق من صلاحيات المسؤول على المتاجر في السيرفر
    if (!interaction.member.roles.cache.has(setupData.shopAdmin)) {
      return interaction.reply({
        content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج رتـبـه <@&${setupData.shopAdmin}>**`,
        ephemeral: true,
      });
    }

    // جلب بيانات الخيارات
    const newOwner = interaction.options.getUser("owner");
    const channel = interaction.options.getChannel("shop") || interaction.channel;

    // جلب المالك الجديد
    const OWNERRR = await interaction.guild.members.fetch(newOwner.id).catch(() => null);

    // التحقق إذا المالك الجديد غير موجود في السيرفر
    if (!OWNERRR) {
      return interaction.reply({
        content: "**هووو فينننن مــش لاقــيــه فــي ســيــرفــر\n بــطــلــو عــبــط بــقــا**",
        ephemeral: true,
      });
    }

    // التحقق من أن المالك الجديد ليس بوتًا
    if (newOwner.bot) {
      return interaction.reply({
        content: "**بــتــحــط بــوت اونــر الــمــتــجــر شــارب انــت؟**",
        ephemeral: true,
      });
    }

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

    // التحقق من أن المالك الجديد ليس نفس القديم
    if (newOwner.id === shopData.ownerId) {
      return interaction.reply({
        content: "**بــتــحــط نــفــس الاونــر الــقــديــم تــســتــهــبــل؟**",
        ephemeral: true,
      });
    }

    if (shopData.partners && shopData.partners.includes(newOwner.id)) {
      // إزالة من partners
      await Shop.updateOne(
        { guildId: interaction.guild.id, channelId: channel.id },
        {
          $pull: { partners: newOwner.id },
          $set: { 
            "partnersData.$[elem].isActive": false,
            "partnersData.$[elem].removedAt": new Date(),
            "partnersData.$[elem].removedBy": interaction.user.id
          }
        },
        { arrayFilters: [{ "elem.userId": newOwner.id }] }
      );

      // إزالة صلاحيات الشريك القديمة
      await channel.permissionOverwrites.edit(newOwner.id, {
        SendMessages: null,
        EmbedLinks: null,
        AttachFiles: null,
        ViewChannel: null
      });
    }

    // جلب العضو القديم والجديد
    let oldOwnerMember;
    try {
      oldOwnerMember = await interaction.guild.members.fetch(shopData.ownerId);
    } catch {
      oldOwnerMember = null; // المستخدم مو موجود في السيرفر
    }
    
    const newOwnerMember = await interaction.guild.members.fetch(newOwner.id);

    // تغيير صلاحيات القناة
    await channel.permissionOverwrites.edit(shopData.ownerId, {
      SendMessages: null,
      MentionEveryone: null,
      EmbedLinks: null,
      AttachFiles: null,
      ViewChannel: null
    });

    await channel.permissionOverwrites.edit(newOwner.id, {
      SendMessages: true,
      MentionEveryone: true,
      EmbedLinks: true,
      AttachFiles: true,
      ViewChannel: true
    });

    // إزالة رتبة النوع من المالك القديم وإضافتها للجديد
    if (shopData.role) {
      if (oldOwnerMember) await oldOwnerMember.roles.remove(shopData.role);
      if (newOwnerMember) await newOwnerMember.roles.add(shopData.role);
    }

    // حفظ المالك القديم لللوق
    const oldOwnerId = shopData.ownerId;

    // تحديث بيانات المتجر في الداتا بيز
    await Shop.updateOne(
      { guildId: interaction.guild.id, channelId: channel.id },
      { $set: { ownerId: newOwner.id } }
    );

    // إنشاء إيمبد التقرير
    const embed = new EmbedBuilder()
      .setTitle("تــم تــغــيــيــر صــاحــب الــمــتــجــر")
      .addFields(
        { name: "الــمــتــجــر", value: `<#${channel.id}>`, inline: true },
        { name: "الــمــالــك الــقــديــم", value: `<@${oldOwnerId}>`, inline: true },
        { name: "الــمــالــك الــجــديــد", value: `<@${newOwner.id}>`, inline: true },
        { name: "الــوقــت", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: false }
      )
      .setFooter({ 
        text: "Dev By Hox Devs", 
        iconURL: interaction.guild.iconURL() 
      });

    // إرسال الرد
    await interaction.reply({
      content: `**تــم تــغــيــيــر صــاحــب الــمــتــجــر <#${channel.id}> بــنــجــاح**`,
      ephemeral: false
    });

    // إرسال إشعار في قناة المتجر
    await channel.send({
      content: `<@${newOwner.id}>`,
      embeds: [embed]
    });

    if (setupData.line) {
      embed.setImage(setupData.line);
    }

    // إرسال إشعار للطرفين
    try {
      const oldOwnerUser = await client.users.fetch(oldOwnerId);
      await oldOwnerUser.send({
        content: `**❌ تــم إزالــة مــلــكــيــتــك لــلــمــتــجــر <#${channel.id}>**`,
        embeds: [embed]
      });
    } catch (err) {
      console.log("فشل في إرسال رسالة خاصة للمالك القديم");
    }

    try {
      await newOwner.send({
        content: `**تــم تــعــيــيــنــك مــالــكــاً جــديــداً لــلــمــتــجــر <#${channel.id}>**`,
        embeds: [embed]
      });
    } catch (err) {
      console.log("فشل في إرسال رسالة خاصة للمالك الجديد");
    }

    // تسجيل الحدث في لوق المتاجر
    if (logsData && logsData.shopLogRoom) {
      const logChannel = await client.channels.fetch(logsData.shopLogRoom);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle("لــوق تــغــيــيــر مــالــك مــتــجــر")
          .addFields(
            { name: "الــمــتــجــر", value: `<#${channel.id}>`, inline: true },
            { name: "الــمــســؤؤل", value: `<@${interaction.user.id}>`, inline: true },
            { name: "الــمــالــك الــقــديــم", value: `<@${oldOwnerId}>`, inline: true },
            { name: "الــمــالــك الــجــديــد", value: `<@${newOwner.id}>`, inline: true },
            { name: "الــوقــت", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: false }
          )
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  },
};