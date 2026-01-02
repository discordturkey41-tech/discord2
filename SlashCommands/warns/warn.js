const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js");

module.exports = {
  name: "warn",
  description: "لــتــحــذيــر مــتــجــر",
  options: [
    {
      name: "channel",
      description: "الــمــتــجــر الــذي تــريــد تــحــذيــره",
      type: 7, // Channel
      required: false,
    },
    {
      name: "reason",
      description: "ســبــب الــتــحــذيــر",
      type: 3, // String
      required: false,
    },
    {
      name: "amount",
      description: "عــدد الــتــحــذيــرات",
      type: 4, // Integer
      required: false,
      min_value: 1,
    },
    {
      name: "image",
      description: "صــورة الــدلــيــل عــلــى الــتــحــذيــر",
      type: 11, // Attachment
      required: false,
    },
  ],

  async execute(client, interaction) {
    // جلب إعدادات السيرفر
    const setupData = await Setup.findOne({ guildId: interaction.guild.id });
    console.log(`[WARN COMMAND] Guild ${interaction.guild.id} setup data:`, {
      found: !!setupData,
      shopAdmin: setupData?.shopAdmin,
      timestamp: new Date()
    });
    
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
    const evidence = interaction.options.getAttachment("image");
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

    // التحقق إذا وصل المتجر للحد الأقصى
    if (shopData.warns >= shopData.maxWarns) {
      return interaction.reply({
        content: `**المتجر <#${channel.id}> وصل للحد الأقصى من التحذيرات ولا يمكن تحذيره**`,
        ephemeral: true,
      });
    }

    // التأكد من أن العدد لا يتجاوز الحد الأقصى
    const totalAfterWarn = shopData.warns + amount;
    if (totalAfterWarn > shopData.maxWarns) {
      amount = shopData.maxWarns - shopData.warns;
    }

    // إنشاء سجلات التحذيرات
    const warningsToAdd = [];
    const currentWarningsCount = shopData.warnings?.length || 0;
    
    for (let i = 1; i <= amount; i++) {
      warningsToAdd.push({
        warningNumber: currentWarningsCount + i,
        reason: reason,
        warnedBy: interaction.user.id,
        warnedAt: new Date(),
        evidence: evidence ? evidence.url : null
      });
    }

    // تحديث عدد التحذيرات وإضافة السجلات
    const newWarns = shopData.warns + amount;
    await Shop.updateOne(
      { guildId: interaction.guild.id, channelId: channel.id },
      { 
        $set: { warns: newWarns },
        $push: { warnings: { $each: warningsToAdd } }
      }
    );

    // حساب التحذيرات المتبقية
    const remainingWarns = shopData.maxWarns - newWarns;

    let emb = new EmbedBuilder()
      .setTitle("تــم تــحــذيــر الــمــتــجــر")
      .addFields([
        {
          name: "**الــمــتــجــر :**",
          value: `<#${channel.id}>`,
          inline: true,
        },
        {
          name: "**ســبـــب الـــتـــحـــذيـــر :**",
          value: `**${reason}**`,
          inline: true,
        },
        {
          name: "**رقــم آخــر تــحــذيــر :**",
          value: `**${currentWarningsCount + amount}**`,
          inline: true,
        },
        {
          name: "**عــدد تـحـذيـرات :**",
          value: `**${amount}**`,
          inline: true,
        },
        {
          name: "**عــدد تــحــذيـرات الــمـتــجــر :**",
          value: `**${newWarns}**`,
          inline: true,
        },
        {
          name: "**الــتــحـذيــرات الــمــتــبــقــيــة :**",
          value: `**${remainingWarns > 0 ? remainingWarns : 'تــم الــوصــول للــحــد الأقــصــى'}**`,
          inline: true,
        },
        {
          name: "**الــمــســؤول :**",
          value: `<@${interaction.user.id}>`,
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

    if (evidence) {
      emb.setImage(evidence.url);
    }

    const button = new ButtonBuilder()
      .setCustomId("remove_warnings")
      .setLabel("لـــ ازالــة الــتــحــذيــر")
      .setEmoji("<a:005:1326822412607684618>")
      .setStyle("Secondary");

    const row = new ActionRowBuilder().addComponents(button);

    // إرسال الرد
    await interaction.reply({
      content: `**تــم تــحــذيــر الــمــتــجــر <#${channel.id}> بــنــجــاح**`
    });

    // إرسال إشعار في قناة المتجر
    await channel.send({
      content: `<@${shopData.ownerId}>`,
      embeds: [emb],
      components: [row],
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
        content: `**تــم تــحــذيــر مــتــجــرك <#${channel.id}>**`,
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
          .setTitle("لــوق الــتــحــــذيــر")
          .addFields(
            { name: "الــمــتــجــر", value: `<#${channel.id}>`, inline: true },
            { name: "الــمــســؤؤل", value: `<@${interaction.user.id}>`, inline: true },
            { name: "رقــم آخــر تــحــذيــر", value: `${currentWarningsCount + amount}`, inline: true },
            { name: "عــدد تــحــذيــرات الــمــتــجــر", value: `${newWarns}`, inline: true },
            { name: "الــســبــب", value: reason, inline: false }
          )
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  },
};