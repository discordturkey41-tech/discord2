const { EmbedBuilder } = require("discord.js");
const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js");

module.exports = {
  name: "shop-data",
  description: "عــرض جــمــيــع مــعــلــومــات مــتــجــر مــعــيــن",
  options: [
    {
      name: "shop",
      description: "اخــتــر الــمــتــجــر",
      type: 7, // Channel
      required: false
    }
  ],

  async execute(client, interaction) {
    // التحقق من صلاحيات المسؤول
    const setupData = await Setup.findOne({ guildId: interaction.guild.id });
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
    let shopData;

    if (shopChannel) {
      // جلب بيانات المتجر المحدد
      shopData = await Shop.findOne({ channelId: shopChannel.id });
      if (!shopData) {
        return interaction.reply({
          content: "**هـذة الـروم لـيـسـت مـتـجـراً**",
          ephemeral: true
        });
      }
    } else {
      // جلب أول متجر إذا لم يتم تحديد متجر
      shopData = await Shop.findOne({ guildId: interaction.guild.id });
      if (!shopData) {
        return interaction.reply({
          content: "**لا يــوجــد مــتــاجــر فــي هــذا الــســيــرفــر**",
          ephemeral: true
        });
      }
    }

    // جلب معلومات السيرفر
    const guild = interaction.guild;
    const shopMentionRoleId = setupData.shopMention;

    // جلب معلومات الرتبة
    const role = guild.roles.cache.get(shopData.role);
    const roleName = role ? role.toString() : "غير محدد";

    // جلب معلومات المالك
    const owner = await guild.members.fetch(shopData.ownerId).catch(() => null);
    const ownerName = owner ? owner.toString() : "غير معروف";
    const taxDisplay = shopData.tax > 0 ? `${shopData.tax}` : "**لا يــوجــد**";
    // إنشاء الإيمبد
const embed = new EmbedBuilder()
  .setTitle(`مــعــلــومــات الــمــتــجــر ${shopChannel.name}`)
  .addFields(
    { name: "صــاحــب الــمــتــجــر", value: `<@${shopData.ownerId}>`, inline: true },
    { name: "نــوع الــمــتــجــر", value: `<@&${shopData.role}>`, inline: true },
    { name: "تــاريــخ الإنــشــاء", value: shopData.time, inline: true },
    { name: "الــضــريــبــة", value: taxDisplay, inline: true },
    { name: "الــتــحــذيــرات", value: `${shopData.warns}/${shopData.maxWarns}`, inline: true },
    { name: "شــركــاء الــمــتــجــر", value: shopData.partners.length > 0 ? shopData.partners.map(p => `<@${p}>`).join(", ") : "لا يــوجــد شــركــاء", inline: true },
{ 
  name: "الــمــنــشــنــات", 
  value: 
    `**<a:hox_star_light:1326824621722435655> \`-\` __ @everyone :  \`${shopData.everyone || 0}\`__\n` +
    `<a:hox_star_gray:1326824634397626478> \`-\` __ @here :  \`${shopData.here || 0}\`__\n` +
    `<a:hox_star_orange:1326824692648116407> \`-\` __ <@&${shopMentionRoleId}> :  \`${shopData.shop || 0}\`__ **`, 
  inline: false 
},
      { 
  name: "حــالــة الــمــتــجــر", 
  value: shopData.status === "1" ? "مــفــعــل" : "مــعــطــل", 
  inline: true 
},
{ 
  name: "الإجــازة", 
  value: shopData.vacation === "0" ? "الــمــتــجــر فــي إجــازة" : " الــمــتــجــر لــيــس فــي إجــازة", 
  inline: true 
},


  )

      .setImage(setupData.line || null)
      .setAuthor({
        name: guild.name,
        iconURL: guild.iconURL({ dynamic: true })
      })
      .setFooter({
        text: "Dev By Hox Devs",
        iconURL: guild.iconURL({ dynamic: true })
      })
      .setTimestamp();


    await interaction.reply({
      embeds: [embed],
      ephemeral: false
    });
  }
};