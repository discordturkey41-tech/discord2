const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js");
const Logs = require("../../Mangodb/logs.js"); // استيراد Logs
const Types = require("../../Mangodb/types.js"); // استيراد Types model

module.exports = {
  name: "change-type",
  description: "تــغــيــيــر نــوع الــمــتــجــر",
  options: [
    {
      name: "type",
      description: "الــنــوع الــجــديــد",
      type: 3,
      required: true,
      autocomplete: true
    },
    {
      name: "shop",
      description: "الــمــتــجــر الــذي تــريــد تــغــيــيــر نــوعــه",
      type: 7,
      required: false
    },
  ],

  async execute(client, interaction) {
    const types = await Types.find({ guildId: interaction.guild.id });
    const logsData = await Logs.findOne({ guildId: interaction.guild.id }); // جلب بيانات اللوجات

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
        content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر\n تـحـتـاج رتـبـه <@&${setupData.shopAdmin}>**`,
        ephemeral: true,
      });
    }

    const shopChannel = interaction.options.getChannel("shop") || interaction.channel;
    const newTypeName = interaction.options.getString("type");

    const shopData = await Shop.findOne({
      guildId: interaction.guild.id,
      channelId: shopChannel.id
    });

    if (!shopData) {
      return interaction.reply({
        content: "**هــذا الــروم لــيــس مــتــجــرا**",
        ephemeral: true
      });
    }

    const newType = types.find(t => t.name === newTypeName);
    if (!newType) {
      return interaction.reply({
        content: "**هــذا الــنــوع غــيــر مــوجــود**",
        ephemeral: true
      });
    }

    if (shopData.type === newType.name) {
      return interaction.reply({
        content: "**كــيــف تــغــيــر نــوع وتــخــتــار نــفــس الــنــوع ؟ تــســتــهــبــل؟**",
        ephemeral: true
      });
    }

    const oldType = types.find(t => t.name === shopData.type);

    // حفظ القيم القديمة لللوق
    const oldMaxWarns = shopData.maxWarns;
    const oldEveryone = shopData.everyone;
    const oldHere = shopData.here;
    const oldShopMention = shopData.shop;
    const oldTax = shopData.tax;

    // إزالة جميع الصلاحيات الحالية
    const overwrites = shopChannel.permissionOverwrites.cache;
    for (const overwrite of overwrites.values()) {
      await overwrite.delete();
    }

    // إضافة الصلاحيات الجديدة
    await shopChannel.permissionOverwrites.create(shopData.ownerId, {
      ViewChannel: true,
      SendMessages: true,
      MentionEveryone: true,
      EmbedLinks: true,
      AttachFiles: true
    });

    await shopChannel.permissionOverwrites.create(setupData.shopAdmin, {
      ViewChannel: true,
      SendMessages: true
    });

    await shopChannel.permissionOverwrites.create(interaction.guild.roles.everyone, {
      ViewChannel: true,
      SendMessages: false
    });

    // تحديث صلاحيات الشركاء
    for (const partnerId of shopData.partners) {
      await shopChannel.permissionOverwrites.create(partnerId, {
        ViewChannel: true,
        SendMessages: true
      });
    }

    // تحديث إعدادات القناة
    const newChannelName = `${newType.shape}・${shopChannel.name.split('︲')[1] || shopChannel.name}`;
    await shopChannel.edit({
      name: newChannelName,
      parent: newType.category
    });

    // تحديث بيانات المتجر
    await Shop.updateOne(
      { guildId: interaction.guild.id, channelId: shopChannel.id },
      {
        $set: {
          type: newType.name,
          maxWarns: newType.maxWarns,
          emoji: newType.emoji || "",
          role: newType.role,
          everyone: newType.everyoneMention ?? 0,
          here: newType.hereMention ?? 0,
          shop: newType.shopMention ?? 0,
          shape: newType.shape,
          tax: newType.tax ?? 0 // إضافة الضريبة الجديدة
        }
      }
    );

    // تحديث رتبة البائع
    const seller = await interaction.guild.members.fetch(shopData.ownerId);
    if (oldType && oldType.role) {
      await seller.roles.remove(oldType.role);
    }
    if (newType.role) {
      await seller.roles.add(newType.role);
    }

    // إنشاء وإرسال الإيمبدات
    const embed = new EmbedBuilder()
      .setTitle("**تــم تــغــيــيــر نــوع الــمــتــجــر**")
      .addFields(
        { name: "الــمــتــجــر", value: `<#${shopChannel.id}>`, inline: true },
        { name: "صــاحــب الــمــتــجــر", value: `<@${shopData.ownerId}>`, inline: true },
        { name: "الــوقــت", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
        { name: "الــنــوع الــقــديــم", value: oldType && oldType.role ? `<@&${oldType.role}>` : shopData.type, inline: true },
        { name: "الــنــوع الــجــديــد", value: newType.role ? `<@&${newType.role}>` : newType.name, inline: true }
      )
      .setFooter({
        text: "Dev By Hox Devs",
        iconURL: interaction.guild.iconURL({ dynamic: true })
      });

    if (setupData.line) {
      embed.setImage(setupData.line);
    }

    await interaction.reply({
      content: `**تــم تــغــيــيــر نــوع الــمــتــجــر <#${shopChannel.id}> إلــى ${newType.role ? `<@&${newType.role}>` : newType.name}**`,
      embeds: [embed],
      ephemeral: false
    });

    await shopChannel.send({
      content: `<@${shopData.ownerId}>`,
      embeds: [embed]
    });

    // إرسال إشعار خاص للبائع
    try {
      const owner = await client.users.fetch(shopData.ownerId);
      await owner.send({
        content: `**تــم تــغــيــيــر نــوع مــتــجــرك <#${shopChannel.id}>**`,
        embeds: [embed]
      });
    } catch (err) {
      console.log("فشل إرسال رسالة خاصة للبائع");
    }

    // تسجيل الحدث في لوق المتاجر
    if (logsData && logsData.shopLogRoom) {
      const logChannel = await client.channels.fetch(logsData.shopLogRoom);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle("لــوق تــغــيــيــر نــوع مــتــجــر")
          .addFields(
            { name: "الــمــتــجــر", value: `<#${shopChannel.id}>`, inline: true },
            { name: "الــمــســؤؤل", value: `<@${interaction.user.id}>`, inline: true },
            { name: "الــنــوع الــقــديــم", value: oldType && oldType.role ? `<@&${oldType.role}>` : shopData.type, inline: true },
            { name: "الــنــوع الــجــديــد", value: newType.role ? `<@&${newType.role}>` : newType.name, inline: true },
            { name: "الــحــد الاقــصــى لــلــتــحــذيــرات", value: `\`${oldMaxWarns}\` → \`${newType.maxWarns}\``, inline: true },
            { name: "ضــريــبــة الــمــتــجــر", value: `\`${oldTax}\` → \`${newType.tax ?? 0}\``, inline: true },
            { name: "الــوقــت", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: false }
          )
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  },

  async autocomplete(interaction) {
    const types = await Types.find({ guildId: interaction.guild.id });
    if (!types || types.length === 0) return interaction.respond([]);

    const focused = interaction.options.getFocused()?.toLowerCase() || "";

    const filtered = types
      .filter(t => t.name.toLowerCase().includes(focused))
      .slice(0, 25)
      .map(t => ({
        name: t.name,
        value: t.name
      }));

    await interaction.respond(filtered);
  }
};