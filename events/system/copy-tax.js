// events/interactionCreate.js
const { Events } = require("discord.js");

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(client, interaction) {
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith("copytax_")) {
      const [, authorId, value] = interaction.customId.split("_");

      if (interaction.user.id !== authorId) {
        return interaction.reply({
          content: `**شــو دخــلك بــضــريــبــة الــنــاس\nانــقــلــع شــحــات ${interaction.user}**`,
          ephemeral: true
        });
      }

      return interaction.reply({
        content: `${value}`,
        ephemeral: true
      });
    }
  }
};
