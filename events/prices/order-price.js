const { EmbedBuilder } = require("discord.js");
const Setup = require("../../Mangodb/setup.js");
const SetupPhoto = require("../../Mangodb/setupPhoto.js");
const Prices = require("../../Mangodb/prices.js");

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(client, interaction) {
    if (!interaction.isButton()) return;

    if (interaction.customId === "orderss-pricee") {
      const setupData = await Setup.findOne({ guildId: interaction.guild.id });
      const setupPhotoData = await SetupPhoto.findOne({ guildId: interaction.guild.id });
      const roleName = interaction.guild.roles.cache.get(setupData.orderMention)?.name || "رتبة غير موجودة";
      let data = await Prices.findOne({ guildId: interaction.guild.id });

      const imageUrl = setupPhotoData?.priceOrderPhoto || setupData?.line || null;

      const embed = new EmbedBuilder()
        .setTitle("أســعــار الــطــلــبــات")
        .setDescription(`** <a:hox_star_light:1326824621722435655> @Everyone \n <a:hox_money:1416511233141637252> الــســعــر:\n${data?.orderEveryPrice} \n\n <a:hox_star_gray:1326824634397626478> @Here \n<a:hox_money:1416511233141637252> الــســعــر:\n${data?.orderHerePrice} \n\n <a:hox_star_orange:1326824692648116407> @${roleName}\n <a:hox_money:1416511233141637252> الــســعــر:\n${data?.orderMentionPrice}\n\n <a:hox_moneybag:1326822451094491156>  الــتــحــويــل الــي : <@${setupData.bank}> | ${setupData.bank}**`)
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

      return interaction.reply({
        content: `${interaction.user}`,
        embeds: [embed],
        ephemeral: true
      });
    }
  }
};