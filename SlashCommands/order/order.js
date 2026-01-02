const { EmbedBuilder, PermissionsBitField, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Setup = require('../../Mangodb/setup.js');

module.exports = {
  name: "order",
  description: "إنــشــاء طــلــب جــديــد",
  options: [
    {
      name: "order",
      description: "الــطــلــب",
      type: 3, // String
      required: true
    },
    {
      name: "user",
      description: "صــاحــب الــطــلــب",
      type: 6, // User
      required: true
    },
    {
      name: "mention",
      description: "نــوع الــمــنــشــن",
      type: 3, // String
      required: true,
      choices: [
        { name: "مــنــشــن ايــفــري ون", value: "everyone" },
        { name: "مــنــشــن هــيــر", value: "here" },
        { name: "مــنــشــن الــطــلــبــات", value: "order" }
      ]
    },
    // 10 اختيارات للصور
    ...Array.from({ length: 10 }, (_, i) => ({
      name: `image${i+1}`,
      description: `صــورة ${i+1}`,
      type: 3, // String (رابط الصورة)
      required: false
    }))
  ],

  async execute(client, interaction) {
    const setupData = await Setup.findOne({ guildId: interaction.guild.id });

    if (!setupData.orderAdmin) {
      return interaction.reply(
        `**الــرجــاء تــحــديــد مــســؤول طــلــبــات مــن امــر \n/setup**`
      );
    }
    if (!setupData.orderRoom) {
      return interaction.reply({
        content: `**الــرجــاء تــحــديــد روم طــلــبــات مــن امــر \n/setup**`,
        ephemeral: true
      });
    }

    if (!interaction.member.roles.cache.has(setupData.orderAdmin)) {
      return interaction.reply(
        `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هـذا الأمـر، تـحـتـاج رتـبـة <@&${setupData.orderAdmin}>**`
      );
    }

    const orderContent = interaction.options.getString("order");
    const mentionType = interaction.options.getString("mention");
    const user = interaction.options.getUser("user");

    // المنشن
    let mention = "";
    switch (mentionType) {
      case "everyone":
        mention = "@everyone"; break;
      case "here":
        mention = "@here"; break;
      case "order":
        mention = `<@&${setupData.orderMention}>`; break;
    }

    // تجميع الصور من الاختيارات
    const images = [];
    for (let i = 1; i <= 10; i++) {
      const img = interaction.options.getString(`image${i}`);
      if (img) images.push(img);
    }

    // الأزرار
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("buyy_order_ticket")
        .setLabel("شـــراء طـــلـــب")
        .setEmoji("<a:003:1326822406316097568>")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("orderss-pricee")
        .setLabel("رؤيــة الاســعــار")
        .setEmoji("<a:0091:1326822365908303933>")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("order-owner")
        .setLabel("تــواصــل مــع صــاحــب الــطــلــب")
        .setEmoji("<a:004:1326822409227210845>")
        .setStyle(ButtonStyle.Secondary)
    );

    const orderChannel = await interaction.guild.channels.fetch(setupData.orderRoom);

    await orderChannel.send({
      content: `**\`﹣\` <a:hox_star_light:1326824621722435655> تــواصــل مــع : __<@${user.id}>__**\n**\`﹣\` <a:hox_star_gray:1326824634397626478> الــطــلــب : ${orderContent}**\n**\`﹣\` <a:hox_star_blue:1326824579389456394> الــمــنــشــن : __${mention}__**`,
      files: images, // هنا الصور هتترفق مع الرسالة
      components: [row]
    });

    await interaction.reply({
      content: `**تــم ارســال الــطــلــب بــنــجــاح الــي ${orderChannel}**`,
      ephemeral: false
    });
  }
};
