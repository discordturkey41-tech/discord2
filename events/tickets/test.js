const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const ActivePurchase = require("../../Mangodb/ActivePurchase.js");
const Ticket = require("../../Mangodb/tickets.js");
const activeCollectors = new Map();

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(client, interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.guild) return;

    const guildId = interaction.guild.id;

    if (interaction.customId === "astacancel-auction-ticket") {
      await Ticket.deleteMany({ 
        guildId: guildId, 
        userId: interaction.user.id,
        ticketType: "auction",
        closed: false
      });

      // تحديث الرسالة بدلاً من الرد
      await interaction.update({
        content: "**تــم حــل مــشــكــلــتــك بــنــجــاح**",
        components: [] // إزالة الأزرار لمنع استخدامها مرة أخرى
      });
    }

    if (interaction.customId === "astacancel-order-ticket") {
      await Ticket.deleteMany({ 
        guildId: guildId, 
        userId: interaction.user.id,
        ticketType: "order",
        closed: false
      });

      // تحديث الرسالة بدلاً من الرد
      await interaction.update({
        content: "**تــم حــل مــشــكــلــتــك بــنــجــاح**",
        components: [] // إزالة الأزرار لمنع استخدامها مرة أخرى
      });
    }

    if (interaction.customId === "astacancel-role-ticket") {
      await Ticket.deleteMany({ 
        guildId: guildId, 
        userId: interaction.user.id,
        ticketType: "role",
        closed: false
      });

      // تحديث الرسالة بدلاً من الرد
      await interaction.update({
        content: "**تــم حــل مــشــكــلــتــك بــنــجــاح**",
        components: [] // إزالة الأزرار لمنع استخدامها مرة أخرى
      });
    }

    if (interaction.customId === "astacancel-shop-ticket") {
      await Ticket.deleteMany({ 
        guildId: guildId, 
        userId: interaction.user.id,
        ticketType: "shop",
        closed: false
      });

      // تحديث الرسالة بدلاً من الرد
      await interaction.update({
        content: "**تــم حــل مــشــكــلــتــك بــنــجــاح**",
        components: [] // إزالة الأزرار لمنع استخدامها مرة أخرى
      });
    }
  }
};