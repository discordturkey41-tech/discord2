const { EmbedBuilder } = require("discord.js");
const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js");
const Logs = require("../../Mangodb/logs.js"); // استيراد Logs

module.exports = {
  name: "add-mention",
  description: "اضــافــة الــمــنــشــنــات لــمــتــجــر",
  options: [
    {
      name: "shop",
      description: "الــمــتــجــر",
      type: 7, // CHANNEL
      required: false,
    },
    {
      name: "everyone",
      description: "عــدد مــنــشــنــات @everyone",
      type: 4,
      required: false,
    },
    {
      name: "here",
      description: "عــدد مــنــشــنــات @here",
      type: 4,
      required: false,
    },
    {
      name: "shop-mention",
      description: "عــدد مــنــشــنــات مــنــشــن الــمــتــجــر",
      type: 4,
      required: false,
    },
  ],

  async execute(client, interaction) {
    const setupData = await Setup.findOne({ guildId: interaction.guild.id });
    const logsData = await Logs.findOne({ guildId: interaction.guild.id }); // جلب بيانات اللوجات

    if (!setupData || !setupData.shopAdmin) {
      return interaction.reply({
        content: `**الــرجــاء تــحــديــد مــســؤول مــتــاجــر مــن امــر \n/setup**`,
        ephemeral: true,
      });
    }

    if (!interaction.member.roles.cache.has(setupData.shopAdmin)) {
      return interaction.reply({
        content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج رتـبـه <@&${setupData.shopAdmin}>**`,
        ephemeral: true,
      });
    }

    const shopChannel = interaction.options.getChannel("shop") || interaction.channel;
    const everyoneAdd = interaction.options.getInteger("everyone");
    const hereAdd = interaction.options.getInteger("here");
    const shopMentionAdd = interaction.options.getInteger("shop-mention");

    // تحقق إذا مفيش أي حاجة مختارة
    if (!shopChannel && everyoneAdd === null && hereAdd === null && shopMentionAdd === null) {
      return interaction.reply({
        content: " **انـت شـارب ايـه ؟ انـت مـش مـخـتـار اي حـاجـة\nمـلـيـتـو الـبـلـد**",
        ephemeral: true,
      });
    }
    
    const hasValidInput = 
      (everyoneAdd !== null && everyoneAdd > 0) || // لو كتب everyone
      (hereAdd !== null && hereAdd > 0) || // لو كتب here
      (shopMentionAdd !== null && shopMentionAdd > 0); // لو كتب shop-mention

    if (!hasValidInput) {
      return interaction.reply({
        content: " **انـت شـارب ايـه ؟ انـت مـش مـخـتـار اي حـاجـة\nمـلـيـتـو الـبـلـد**",
        ephemeral: true,
      });
    }

    // لو متجر مش محدد، نجيب أول متجر موجود
    let shopData;
    if (shopChannel) {
      shopData = await Shop.findOne({ guildId: interaction.guild.id, channelId: shopChannel.id });
    } else {
      shopData = await Shop.findOne({ guildId: interaction.guild.id });
    }

    if (!shopData) {
      return interaction.reply({
        content: "**هـذة الـروم لـيـسـت مـتـجـراً**",
        ephemeral: true,
      });
    }

    // حفظ القيم القديمة لللوق
    const oldEveryone = shopData.everyone;
    const oldHere = shopData.here;
    const oldShop = shopData.shop;

    // الإضافة على القيم القديمة
    if (everyoneAdd !== null) shopData.everyone += everyoneAdd;
    if (hereAdd !== null) shopData.here += hereAdd;
    if (shopMentionAdd !== null) shopData.shop += shopMentionAdd;

    await shopData.save();
    
    const shopMentionRoleId = setupData.shopMention;
    const shopMentionRole = interaction.guild.roles.cache.get(shopMentionRoleId);

    const embed = new EmbedBuilder()
      .setAuthor({
        name: interaction.guild.name,
        iconURL: interaction.guild.iconURL({ dynamic: true })
      })
      .setTitle("تــم اضــافــة الــمــنــشــنــات")
      .addFields(
        { name: `@everyone`, value: `\`${shopData.everyone}\``, inline: true },
        { name: `@here`, value: `\`${shopData.here}\``, inline: true },
        { name: `@${shopMentionRole?.name || "رتبة غير موجودة"}`, value: `\`${shopData.shop}\``, inline: true }
      )
      .setFooter({
        text: `Dev By Hox Devs`,
        iconURL: interaction.guild.iconURL({ dynamic: true })
      });

    // لو فيه line نضيفه كصورة في الإيمبد
    if (setupData.line) {
      embed.setImage(setupData.line);
    }

    shopChannel.send({ 
      content: `<@${shopData.ownerId}>`, 
      embeds: [embed] 
    });

    await interaction.reply({
      content: `**تــم اضــافــة مــنــشــنــات لــ ${shopChannel} بــنــجــاح**`,
      ephemeral: true
    });

    // اللوق
    if (logsData && logsData.shopLogRoom) {
      const logChannel = await client.channels.fetch(logsData.shopLogRoom);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle("لــوق اضــافــة مــنــشــنــات")
          .addFields(
            { name: "الــمــســؤول", value: `<@${interaction.user.id}>`, inline: true },
            { name: "الــمــتــجــر", value: `<#${shopData.channelId}>`, inline: true },
            { name: "@everyone", value: `\`${oldEveryone}\` → \`${shopData.everyone}\``, inline: true },
            { name: "@here", value: `\`${oldHere}\` → \`${shopData.here}\``, inline: true },
            { name: `@${shopMentionRole?.name || "shop"}`, value: `\`${oldShop}\` → \`${shopData.shop}\``, inline: true },
            { name: "الــوقــت", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: false }
          )
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  }
};