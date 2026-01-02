const { EmbedBuilder } = require("discord.js");
const Setup = require("../../Mangodb/setup.js");
const SetupPhoto = require("../../Mangodb/setupPhoto.js");
const Prices = require("../../Mangodb/prices.js");

module.exports = {
  name: "interactionCreate",
  once: false,

  async execute(client, interaction) {
    if (!interaction.isButton()) return;

    if (interaction.customId === "service_prices") {
      const setupData = await Setup.findOne({ guildId: interaction.guild.id });
      const setupPhotoData = await SetupPhoto.findOne({ guildId: interaction.guild.id });
      const pricesData = await Prices.findOne({ guildId: interaction.guild.id }) || {};

      // استخدام صورة الخدمة أولاً، ثم صورة عامة، ثم fallback
      const imageUrl = setupPhotoData?.servicePhoto || setupPhotoData?.priceShopPhoto || setupData?.line || null;

      const servicesMap = {
        removeWarnPrice: "ســعــر ازالــة الــتــحــذيــر",
        changeNamePrice: "ســعــر تــغــيــر اســم مــتــجــر",
        changeOwnerPrice: "ســعــر تــغــيــر اونــر مــتــجــر",
        addPartnersPrice: "ســعــر اضــافــة شــريــك",
        removePartnersPrice: "ســعــر ازالــة شــريــك",
        changeShapePrice: "ســعــر تــغــيــر شــكــل",
        everyonePrice: "ســعــر شــراء مــنــشــن ايــفــري",
        herePrice: "ســعــر شــراء مــنــشــن هــيــر",
        shopMentionPrice: "ســعــر شــراء مــنــشــن مــتــجــر"
      };

      const embedFields = [];
      for (const [key, serviceName] of Object.entries(servicesMap)) {
        const price = pricesData[key] ?? "غير محدد";
        embedFields.push({
          name: serviceName,
          value: `\`${price}\``,
          inline: true
        });
      }

      const embed = new EmbedBuilder()
        .setTitle("أســعــار الــخــدمــات")
        .setDescription("**---------<a:004:1326822409227210845> هــنــا تــجــد جــمــيــع أســعــار خــدمــاتــنــا <a:004:1326822409227210845>---------**")
        .setImage(imageUrl)
        .addFields(embedFields)
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
