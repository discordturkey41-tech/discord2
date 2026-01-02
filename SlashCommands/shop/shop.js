const { EmbedBuilder, ChannelType, PermissionsBitField } = require("discord.js");
const Shop = require("../../Mangodb/shop.js"); // مــوديــل الــمــونــجــو لــلــمــتــاجــر
const Setup = require("../../Mangodb/setup.js"); // مــوديــل اعــدادات الــســيــرفــر
const Logs = require("../../Mangodb/logs.js"); // استيراد Logs
const Types = require("../../Mangodb/types.js"); // استيراد Types model

module.exports = {
  name: "create-shop",
  description: "انــشــاء مــتــجــر لــشــخــص",
  options: [
    {
      name: "name",
      description: "اســم الــمــتــجــر",
      type: 3, // String
      required: true,
    },
    {
      name: "type",
      description: "نــوع الــمــتــجــر",
      type: 3, // String
      required: true,
      autocomplete: true,
    },
    {
      name: "seller",
      description: "صــاحــب الــمــتــجــر",
      type: 6, // User
      required: true,
    },
  ],

  async execute(client, interaction) {
    const types = await Types.find({ guildId: interaction.guild.id });
    const logsData = await Logs.findOne({ guildId: interaction.guild.id }); // جلب بيانات اللوجات

    // جلب إعدادات السيرفر من MongoDB
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

    // جلب بيانات الأمر
    let name = interaction.options.getString("name");
    const sellerUser = interaction.options.getUser("seller");
    const typeName = interaction.options.getString("type");
    
    if (sellerUser.bot) {
      return interaction.reply({
        content: "**بــتــحــط بــوت اونــر الــمــتــجــر شــارب انــت؟**",
        ephemeral: true,
      });
    }
    
    // إيجاد النوع
    const type = types.find((t) => t.name === typeName);
    if (!type)
      return interaction.reply({
        content: `**هــذا الــنــوع غــيــر مــوجــود الرجــاء الــتــحــقــق مــنــه او الاتــصــال بــدعــم**`,
        ephemeral: true,
      });

    // استبدال المسافات بالـ ・
    name = name.replace(/\s+/g, "︲");

    // إنشاء قناة نصية جديدة للمتجر
    const channel = await interaction.guild.channels.create({
      name: `${type.shape}︲${name}`,
      type: ChannelType.GuildText,
      parent: type.category,
      permissionOverwrites: [
        {
          id: sellerUser.id,
          allow: [
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.MentionEveryone,
            PermissionsBitField.Flags.EmbedLinks,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.ViewChannel,
          ],
        },
        {
          id: setupData.shopAdmin,
          allow: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.SendMessages],
          allow: [PermissionsBitField.Flags.ViewChannel],
        },
      ],
    });

    const time = Math.floor(Date.now() / 1000);

    const shopData = new Shop({
      guildId: interaction.guild.id,
      channelId: channel.id,
      ownerId: sellerUser.id,
      type: type.name,
      maxWarns: type.maxWarns,
      time: `<t:${time}:R>`,
      emoji: type.emoji || "",
      status: "1",
      vacation: "1", // لا إجازة حالياً
      vacationData: {
        reason: "",
        duration: "",
        requestedAt: null,
        approvedAt: null,
        endsAt: null,
        approvedBy: ""
      },
      role: type.role,
      everyone: type.everyoneMention ?? 0,
      here: type.hereMention ?? 0,
      shop: type.shopMention ?? 0,
      warns: 0,
      partners: [],
      shape: type.shape,
      tax: type.tax ?? 0,
      lastTaxPayment: null, // تاريخ آخر دفع ضريبة
      taxPaid: "yes", // حالة الدفع (افتراضي yes لأن المتجر جديد ولم يحن وقت الضريبة بعد)
      createdAt: new Date() // تاريخ الإنشاء
    });

    await shopData.save();

    const guild = interaction.guild;
    const line = setupData.line;
    const shopMentionRoleId = setupData.shopMention;
    const taxDisplay = type.tax > 0 ? `${type.tax}` : "**لا يــوجــد**";

    // احضر اسم الرتبة اذا موجودة
    const role = interaction.guild.roles.cache.get(type.role);
    const roleName = role ? role.name : "غير محدد";
    const embedShop = new EmbedBuilder()
      .setTitle(channel.name)
      .setDescription(
        `**- ${type.emoji || ""}  \`﹣\` صــاحــب الــمــتــجــر : <@${sellerUser.id}>\n` +
          `- ${type.emoji || ""}  \`﹣\` نــوع الــمـتـجـر : ${role}\n` +
          `- ${type.emoji || ""}  \`﹣\` تـاريـخ الانـشـاء : <t:${time}:R>\n` +
          `- ${type.emoji || ""}  \`﹣\` الــضــريــبــة : ${taxDisplay}\n` +
          `- ${type.emoji || ""}  \`﹣\` الــحــد الاقــصــي لــتــحــذيــرات : ${type.maxWarns}\n\n` +
          `<a:hox_star_light:1326824621722435655> \`-\` __ @everyone : \`${type.everyoneMention || 0}\`__\n` +
          `<a:hox_star_gray:1326824634397626478> \`-\` __ @here : \`${type.hereMention || 0}\`	__\n` +
          `<a:hox_star_orange:1326824692648116407> \`-\` __ <@&${shopMentionRoleId}> : \`${type.shopMention || 0}\`__ **`
      )
      .setImage(line || null)
      .setAuthor({
        name: guild.name,
        iconURL: guild.iconURL(),
      })
      .setFooter({
        text: "Dev By Hox Devs",
        iconURL: guild.iconURL({ dynamic: true }),
      });
    
    const embedUser = new EmbedBuilder()
      .setTitle(channel.name)
      .setDescription(
        `**- ${type.emoji || ""}  \`﹣\` صــاحــب الــمــتــجــر : <@${sellerUser.id}>\n` +
          `- ${type.emoji || ""}  \`﹣\` نــوع الــمـتـجـر : ${role}\n` +
          `- ${type.emoji || ""}  \`﹣\` تـاريـخ الانـشـاء :  <t:${time}:R>\n` +
          `- ${type.emoji || ""}  \`﹣\` الــضــريــبــة :  ${taxDisplay}\n` +
          `- ${type.emoji || ""}  \`﹣\` الــحــد الاقــصــي لــتــحــذيــرات :  ${type.maxWarns}\n\n` +
          `<a:hox_star_light:1326824621722435655> \`-\` __ @everyone :  \`${type.everyoneMention || 0}\`__\n` +
          `<a:hox_star_gray:1326824634397626478> \`-\` __ @here :  \`${type.hereMention || 0}\`	__\n` +
          `<a:hox_star_orange:1326824692648116407> \`-\` __ <@&${shopMentionRoleId}> :  \`${type.shopMention || 0}\`__ **`
      )
      .setImage(line || null)
      .setAuthor({
        name: guild.name,
        iconURL: guild.iconURL(),
      })
      .setFooter({
        text: "Dev By Hox Devs",
        iconURL: guild.iconURL({ dynamic: true }),
      });
    
    // رد على الأمر
    await interaction.reply({
      content: `**تـــم انــشــاء الــمــتــجــر: <#${channel.id}>**`,
      embeds: [embedShop],
      ephemeral: false,
    });

    // إرسال في قناة المتجر منشن للبائع
    await channel.send({
      content: `<@${sellerUser.id}>`,
      embeds: [embedShop],
    });

    // إضافة رتبة النوع للبائع (إذا موجودة)
    const memberSeller = await interaction.guild.members.fetch(sellerUser.id);
    if (memberSeller && type.role) {
      await memberSeller.roles.add(type.role);
    }

    // إرسال رسالة خاصة للبائع مع تفاصيل المتجر
    try {
      await sellerUser.send({
        content: `**تـــم انــشــاء مــتــجــرك: <#${channel.id}>**`,
        embeds: [embedUser],
      });
    } catch (error) {
      console.error('Cannot send DM to user:', error);
    }

    // تسجيل الحدث في لوق المتاجر
    if (logsData && logsData.shopLogRoom) {
      const logChannel = await client.channels.fetch(logsData.shopLogRoom);
      if (logChannel) {
        const embedLog = new EmbedBuilder()
          .setTitle("لــوق انــشــاء مــتــجــر")
          .addFields(
            { name: "بـواسـطـة:", value: `<@${interaction.user.id}>`, inline: true },
            { name: "مــتــجــر:", value: `<#${channel.id}>`, inline: true },
            { name: "صــاحــب الــمــتــجــر:", value: `<@${sellerUser.id}>`, inline: true },
            { name: "نــوع الــمـتـجـر:", value: `${roleName}`, inline: true },
            { name: "الــضــريــبــة:", value: `${taxDisplay}`, inline: true },
            { name: "الــحــد الاقــصــى لــلــتــحــذيــرات:", value: `${type.maxWarns}`, inline: true },
            { name: "الــوقــت", value: `<t:${time}:R>`, inline: false }
          )
          .setTimestamp();

        await logChannel.send({ embeds: [embedLog] });
      }
    }
  },

  async autocomplete(interaction) {
    const types = await Types.find({ guildId: interaction.guild.id });
    if (!types || types.length === 0) return interaction.respond([]);

    const focused = interaction.options.getFocused()?.toLowerCase() || "";

    const filtered = types
      .filter((t) => t.name.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((t) => ({
        name: t.name,
        value: t.name,
      }));

    await interaction.respond(filtered);
  },
};