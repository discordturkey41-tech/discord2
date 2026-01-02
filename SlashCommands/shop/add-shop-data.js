const { EmbedBuilder } = require("discord.js");
const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js");
const Logs = require("../../Mangodb/logs.js"); // استيراد Logs
const Types = require("../../Mangodb/types.js"); // استيراد Types model

module.exports = {
  name: "add-shop-data",
  description: "إضــافــة بــيــانــات مــتــجــر لــشــخــص",
  options: [
    {
      name: "type",
      description: "نــوع الــمــتــجــر",
      type: 3, // String
      required: true,
      autocomplete: true,
    },
    {
      name: "owner",
      description: "صــاحــب الــمــتــجــر",
      type: 6, // User
      required: true,
    },
    {
      name: "everyone-mention",
      description: "عــدد مــنــشــنــات @everyone",
      type: 4, // Integer
      required: true,
    },
    {
      name: "here-mention",
      description: "عــدد مــنــشــنــات @here",
      type: 4, // Integer
      required: true,
    },
    {
      name: "shop-mention",
      description: "عــدد مــنــشــنــات مــنــشــن الــمــتــجــر",
      type: 4, // Integer
      required: true,
    },
    {
      name: "max-warns",
      description: "الــحــد الأقــصــى لــلــتــحــذيــرات",
      type: 4, // Integer
      required: true,
    }
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
    const sellerUser = interaction.options.getUser("owner");
    const typeName = interaction.options.getString("type");
    const everyoneMention = interaction.options.getInteger("everyone-mention");
    const hereMention = interaction.options.getInteger("here-mention");
    const shopMention = interaction.options.getInteger("shop-mention");
    const maxWarns = interaction.options.getInteger("max-warns");

    if (sellerUser.bot) {
      return interaction.reply({
        content: "**بــتــحــط بــوت اونــر الــمــتــجــر شــارب انــت؟**",
        ephemeral: true,
      });
    }

    // إيجاد النوع
    const type = types.find((t) => t.name === typeName);
    if (!type) {
      return interaction.reply({
        content: `**هــذا الــنــوع غــيــر مــوجــود الرجــاء الــتــحــقــق مــنــه او الاتــصــال بــدعــم**`,
        ephemeral: true,
      });
    }

    const time = Math.floor(Date.now() / 1000);

    // إنشاء بيانات المتجر بدون قناة فعلية
    const shopData = new Shop({
      guildId: interaction.guild.id,
      channelId: null, // لا توجد قناة فعلية
      ownerId: sellerUser.id,
      type: type.name,
      maxWarns: maxWarns,
      time: `<t:${time}:R>`,
      emoji: type.emoji || "",
      status: "1",
      vacation: "1",
      vacationData: {
        reason: "",
        duration: "",
        requestedAt: null,
        approvedAt: null,
        endsAt: null,
        approvedBy: ""
      },
      role: type.role,
      everyone: everyoneMention,
      here: hereMention,
      shop: shopMention,
      warns: 0,
      partners: [],
      shape: type.shape,
      tax: type.tax ?? 0,
    });

    await shopData.save();

    const guild = interaction.guild;
    const line = setupData.line;
    const shopMentionRoleId = setupData.shopMention;

    // احضر اسم الرتبة إذا موجودة
    const role = interaction.guild.roles.cache.get(type.role);
    const roleName = role ? role.name : "غير محدد";

    // إنشاء الإيمبد للمتجر
    const embedShop = new EmbedBuilder()
      .setTitle(`بــيــانــات مــتــجــر - ${type.name}`)
      .setDescription(
        `**- ${type.emoji || ""}  \`﹣\` صــاحــب الــمــتــجــر : <@${sellerUser.id}>\n` +
        `- ${type.emoji || ""}  \`﹣\` نــوع الــمـتـجـر : ${roleName}\n` +
        `- ${type.emoji || ""}  \`﹣\` تـاريـخ الانـشـاء :  <t:${time}:R>\n` +
        `- ${type.emoji || ""}  \`﹣\` الــحــد الاقــصــي لــتــحــذيــرات :  ${maxWarns}\n\n` +
        `<a:hox_star_light:1326824621722435655> \`-\` __ @everyone :  \`${everyoneMention}\`__\n` +
        `<a:hox_star_gray:1326824634397626478> \`-\` __ @here :  \`${hereMention}\`	__\n` +
        `<a:hox_star_orange:1326824692648116407> \`-\` __ <@&${shopMentionRoleId}> :  \`${shopMention}\`__ **`
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

    // رد على الأمر مع منشن للبائع
    await interaction.reply({
      content: `**تـــم اضــافــة بــيــانــات مــتــجــر لــ <@${sellerUser.id}>**`,
      embeds: [embedShop],
      ephemeral: false,
    });

    // إضافة رتبة النوع للبائع (إذا موجودة)
    const memberSeller = await interaction.guild.members.fetch(sellerUser.id);
    if (memberSeller && type.role) {
      await memberSeller.roles.add(type.role);
    }

    // إرسال رسالة خاصة للبائع مع تفاصيل المتجر
    try {
      await sellerUser.send({
        content: `**تـــم اضــافــة بــيــانــات مــتــجــر لــك**`,
        embeds: [embedShop],
      });
    } catch (error) {
      console.error('Cannot send DM to user:', error);
    }

    // تسجيل الحدث في لوق المتاجر
    if (logsData && logsData.shopLogRoom) {
      const logChannel = await client.channels.fetch(logsData.shopLogRoom);
      if (logChannel) {
        const embedLog = new EmbedBuilder()
          .setTitle("تــم اضــافــة بــيــانــات مــتــجــر")
          .addFields(
            { name: "بـواسـطـة:", value: `<@${interaction.user.id}>`, inline: true },
            { name: "صـاحـب الــمـتـجـر:", value: `<@${sellerUser.id}>`, inline: true },
            { name: "نــوع الــمـتـجـر:", value: `${roleName}`, inline: true },
            { name: "مــنــشــنــات @everyone:", value: `${everyoneMention}`, inline: true },
            { name: "مــنــشــنــات @here:", value: `${hereMention}`, inline: true },
            { name: "مــنــشــنــات الــمــتــجــر:", value: `${shopMention}`, inline: true },
            { name: "الــحــد الاقــصــى لــلــتــحــذيــرات:", value: `${maxWarns}`, inline: true },
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