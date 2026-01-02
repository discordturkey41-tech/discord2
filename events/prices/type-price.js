const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Setup = require("../../Mangodb/setup.js");
const SetupPhoto = require("../../Mangodb/setupPhoto.js");
const Types = require("../../Mangodb/types.js");

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(client, interaction) {
    if (!interaction.isButton()) return;

    // زر أسعار المتاجر
    if (interaction.customId === "shop_prices") {
      const setupData = await Setup.findOne({ guildId: interaction.guild.id });
      const setupPhotoData = await SetupPhoto.findOne({ guildId: interaction.guild.id });
      const types = await Types.find({ guildId: interaction.guild.id });

      if (!types.length) {
        return interaction.reply({
          content: "**لا يــوجــد انــواع مــتــاجــر، الــرجــاء مــراســلــة الادارة**",
          ephemeral: true
        });
      }

      const imageUrl = setupPhotoData?.priceShopPhoto || setupData?.line || null;

      const embed = new EmbedBuilder()
        .setTitle("أســعــار الــمــتــاجــر")
        .setDescription("**<a:004:1326822409227210845> لــمــعــرفــة تــفــاصــيــل أنــواع الــمــتــاجــر وأســعــارهــا\nالــرجــاء الــضــغــط عــلــى الــزر الــذي تــريــد مــعــرفــة تــفــاصــيــلــه <a:004:1326822409227210845>**")
        .setImage(imageUrl)
        .setFooter({
          text: "Dev By Hox Devs",
          iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setAuthor({
          name: interaction.guild.name,
          iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

      const rows = [];
      let row = new ActionRowBuilder();

      types.forEach((type, index) => {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`type_${type.category}`)
            .setLabel(type.name)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("🛒")
        );

        if ((index + 1) % 5 === 0 || index === types.length - 1) {
          rows.push(row);
          row = new ActionRowBuilder();
        }
      });

      return interaction.reply({
        content: `${interaction.user}`,
        embeds: [embed],
        components: rows,
        ephemeral: true
      });
    }

    // زر نوع متجر معين
    if (interaction.customId.startsWith("type_")) {
      const categoryId = interaction.customId.replace("type_", "");
      const setupData = await Setup.findOne({ guildId: interaction.guild.id });
      const setupPhotoData = await SetupPhoto.findOne({ guildId: interaction.guild.id });
      const types = await Types.find({ guildId: interaction.guild.id });
      const type = types.find(t => t.category === categoryId);

      if (!type) {
        return interaction.reply({
          content: "**هــذا الــنــوع غــيــر مــوجــود**",
          ephemeral: true
        });
      }

      const imageUrl = setupPhotoData?.priceShopPhoto || setupData?.line || null;
      const taxDisplay = type.tax > 0 ? `${type.tax}` : "**لا يــوجــد**";
const maxWarns = type.maxWarns
      const embed = new EmbedBuilder()
        .setTitle(`${type.emoji} مــعــلــومــات الــنــوع ${type.name}`)
        .setImage(imageUrl)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({
          text: "Dev By Hox Devs",
          iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setAuthor({
          name: interaction.guild.name,
          iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setDescription(
          `> ${type.emoji} \`﹣\` اســم الــنــوع : ${type.name}\n >  ${type.emoji} \`•\` رتــبــة الــنــوع :  <@&${type.role}>\n > ${type.emoji} \`•\` الــضــريــبــة : ${taxDisplay}\n > ${type.emoji} \`•\` الــحــد الاقــصــي لــتــحــذيــرات : ${maxWarns}  \n\n > مــنــشــنــات الــنــوع :\n > <a:hox_star_light:1326824621722435655> \`﹣\`@everyone: ${type.everyoneMention}\n > <a:hox_star_gray:1326824634397626478> \`﹣\`@here: ${type.hereMention}\n > <a:hox_star_orange:1326824692648116407> \`﹣\`<@&${setupData.shopMention}>: ${type.shopMention}\n\n > <a:hox_money:1416511233141637252> الــســعــر\n > ${type.emoji} \`•\` ســعــر الــنــوع : ${type.price}`
        )
        .setTimestamp();

      return interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }
  }
};