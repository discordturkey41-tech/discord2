const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Setup = require("../../Mangodb/setup.js");
const SetupPhoto = require("../../Mangodb/setupPhoto.js");
const Roles = require("../../Mangodb/roles.js");

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(client, interaction) {
    if (!interaction.isButton()) return;

    // زر أسعار الرتب
    if (interaction.customId === "roles_prices") {
      const setupData = await Setup.findOne({ guildId: interaction.guild.id });
      const setupPhotoData = await SetupPhoto.findOne({ guildId: interaction.guild.id });
      
      const roles = await Roles.find({ guildId: interaction.guild.id });

      if (!roles.length) {
        return interaction.reply({
          content: "**لا يــوجــد رتــب مــتــاحــة لــلــشــراء، الــرجــاء مــراســلــة الادارة**",
          ephemeral: true
        });
      }

      const imageUrl = setupPhotoData?.priceRolePhoto || setupData?.line || null;

      const embed = new EmbedBuilder()
        .setTitle("أســعــار الــرتــب")
        .setDescription("**<a:004:1326822409227210845> لــمــعــرفــة تــفــاصــيــل الــرتــب وأســعــارهــا\nالــرجــاء الــضــغــط عــلــى الــزر الــذي تــريــد مــعــرفــة تــفــاصــيــلــه <a:004:1326822409227210845>**")
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

      roles.forEach((role, index) => {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`role_${role.roleId}`)
            .setLabel(role.roleName)
            .setStyle(ButtonStyle.Secondary)
        );

        if ((index + 1) % 5 === 0 || index === roles.length - 1) {
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

    // زر رتبة معينة
    if (interaction.customId.startsWith("role_")) {
      const roleId = interaction.customId.replace("role_", "");
      const setupData = await Setup.findOne({ guildId: interaction.guild.id });
      const setupPhotoData = await SetupPhoto.findOne({ guildId: interaction.guild.id });
      
      const roles = await Roles.find({ guildId: interaction.guild.id });
      
      const roleData = roles.find(r => r.roleId === roleId);
      
      if (!roleData) {
        return interaction.reply({
          content: "**هــذه الــرتــبــة غــيــر مــوجــودة**",
          ephemeral: true
        });
      }
      
      const role = interaction.guild.roles.cache.get(roleData.roleId);
      
      if (!role) {
        return interaction.reply({
          content: "**هــذه الــرتــبــة غــيــر مــوجــودة فــي الــســيــرفــر**",
          ephemeral: true
        });
      }

      const imageUrl = setupPhotoData?.priceRolePhoto || setupData?.line || null;

      const embed = new EmbedBuilder()
        .setTitle(`مــعــلــومــات الــرتــبــة ${roleData.roleName}`)
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
          `>  \`﹣\` اســم الــرتــبــة : ${roleData.roleName}\n` +
          `>  \`•\` الــرتــبــة : ${role}\n` +
          `>  \`•\` الــكــاتــاغــوري : <#${roleData.category}>\n\n` +
          `> <a:hox_money:1416511233141637252> الــســعــر\n` +
          `>  \`•\` ســعــر الــرتــبــة : ${roleData.price || "10000"}`
        )
        .setTimestamp();

      return interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }
  }
};