const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const Setup = require("../../Mangodb/setup.js");
const Shop = require("../../Mangodb/shop.js");
const Prices = require("../../Mangodb/prices.js");
const Logs = require("../../Mangodb/logs.js");
const {
  getActiveTransaction,
  addTransaction,
  removeTransaction
} = require("../../functions/serverDataManager.js");

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(client, interaction) {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;
    if (!interaction.guild) return;

    const guildId = interaction.guild.id;

    // === زر name_buy ===
    if (interaction.isButton() && interaction.customId === "name_buy") {
      // التحقق من وجود عملية شراء (دون حفظ)
      if (await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id)) {
        const cancelButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('astacancel-change-name')
            .setLabel('الــغــاء')
            .setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({
          ephemeral: true,
          content: `**عــنــدك عــمــلــيــه شــراء\n-# لو عــنــدك مــشــكــلــة اســتــعــمــل زر الــغــاء ســوف يــتــم حــل جــمــيــع مــشــاكــلــك**`,
          components: [cancelButton],
        });
      }

      const shopData1 = await Shop.findOne({ guildId, channelId: interaction.channel.id });
      if (!shopData1) return interaction.reply({ content: "❌ هـذه الـروم لـيست مـتـجـر", ephemeral: true });

      const owner = shopData1.ownerId;
      const partners = shopData1.partners;

      if (interaction.user.id !== owner && (!partners || !partners.includes(interaction.user.id))) {
        return interaction.reply({
          content: "**انــت مــالــك بــ الــمــتــجــر\n يــلا روح اشــحــت بــعــيــد**",
          ephemeral: true 
        });
      }

      const modal = new ModalBuilder()
        .setCustomId("modal_change_name")
        .setTitle("تــغــيــيــر اســم الــمــتــجــر");

      const nameInput = new TextInputBuilder()
        .setCustomId("new_shop_name")
        .setLabel("الاســم الــجــديــد")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
      return interaction.showModal(modal);
    }

    // === عند إرسال المودال ===
    if (interaction.isModalSubmit() && interaction.customId === "modal_change_name") {
      // التحقق مرة أخرى
      if (await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id)) {
        const cancelButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('astacancel-change-name')
            .setLabel('الــغــاء')
            .setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({
          ephemeral: true,
          content: `**عــنــدك عــمــلــيــه شــراء\n-# لو عــنــدك مــشــكــلــة اســتــعــمــل زر الــغــاء ســوف يــتــم حــل جــمــيــع مــشــاكــلــك**`,
          components: [cancelButton],
        });
      }

      const newName = interaction.fields.getTextInputValue("new_shop_name").replace(/\s+/g, "︲");
      const setupData = await Setup.findOne({ guildId });
      const pricesData = await Prices.findOne({ guildId });
      const channel = interaction.channel;

      const shopData = await Shop.findOne({ guildId, channelId: channel.id });
      if (!shopData) {
        return interaction.reply({ content: "❌ هـذه الـروم لـيست مـتـجـر", ephemeral: true });
      }

      if (!pricesData?.changeNamePrice || pricesData.changeNamePrice <= 0) {
        return interaction.reply({
          content: "❌ سـعـر تـغـيـيـر الاسـم غـيـر مـحـدد! الـرجـاء اخـبـار الادارة",
          ephemeral: true
        });
      }

      const currentChannelName = channel.name;
      const newChannelNamePart = newName;
      const currentNameParts = currentChannelName.split(/[-・ ]+/);
      const currentNamePart = currentNameParts.length > 1 ? currentNameParts.slice(1).join(' ').trim() : currentChannelName;

      if (currentNamePart.toLowerCase() === newChannelNamePart.toLowerCase()) {
        return interaction.reply({
          content: "**انـت حـاطـط نـفـس الاسـم الـقـديـم! انـت عـبـيـط يـبـنـي؟\n روح اتـعـالـج احـسـن لـك**",
          ephemeral: true
        });
      }

      const price = pricesData.changeNamePrice;

      const typeEmbed = new EmbedBuilder()
        .setTitle("تــفــاصــيــل الــخــدمــه:")
        .setImage(setupData.line)
        .addFields(
          { name: "الــســعــر", value: `${price}`, inline: true },
          { name: "الاســم الــجــديــد", value: `${newName}`, inline: true }
        )
        .setFooter({
          text: "Dev By Hox Devs",
          iconURL: interaction.guild.iconURL({ dynamic: true }),
        });

      // نمرر الاسم الجديد في الـ ID لأننا لا نحفظ الداتا الآن
      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`5co5nfirmname_${Date.now()}_${newName}`)
          .setLabel("تــأكــيــد الــشــراء")
          .setStyle(ButtonStyle.Success)
          .setEmoji("<a:yes:1405131777948909599>"),
        new ButtonBuilder()
          .setCustomId("11name_cancel_purchase2")
          .setLabel("إلــغــاء الــعــمــلــيــة")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("<a:no:1405131885146800148>")
      );

      return interaction.reply({
        content: `${interaction.user}`,
        embeds: [typeEmbed],
        components: [confirmRow],
        ephemeral: true,
      });
    }

    // === عند التأكيد ===
    if (interaction.isButton() && interaction.customId.startsWith("5co5nfirmname_")) {
      // التحقق النهائي قبل الحفظ
      if (await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id)) {
        const cancelButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('astacancel-change-name')
            .setLabel('الــغــاء')
            .setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({
          ephemeral: true,
          content: `**عــنــدك عــمــلــيــه شــراء\n-# لو عــنــدك مــشــكــلــة اســتــعــمــل زر الــغــاء ســوف يــتــم حــل جــمــيــع مــشــاكــلــك**`,
          components: [cancelButton],
        });
      }

      const [_, typeOrder, newName] = interaction.customId.split("_");
      
      const mentionedUsers = interaction.message.mentions.users;
      if (mentionedUsers.size === 0 || !mentionedUsers.has(interaction.user.id)) {
        return interaction.reply({
          content: "**شــو دخــلــك بــ الــشــراء\nيــلا انــقــلــع**",
          ephemeral: true
        });
      }     
      
      const setupData = await Setup.findOne({ guildId });
      const pricesData = await Prices.findOne({ guildId });
        const logsData = await Logs.findOne({ guildId: interaction.guild.id }); // جلب بيانات اللوجات

      if (!setupData || !setupData.bank) {
        return interaction.reply({
          content: "**الــرجــاء اخــبــار الادارة بــوضــع صــاحــب الــتــحــويــل مــن امــر\n /setup**",
          ephemeral: true,
        });
      }

      const price = pricesData.changeNamePrice;

      // === حفظ الداتا في server.json الآن فقط ===
      await addTransaction(guildId, interaction.user.id, interaction.channel.id, "name-change", { newName, price });

      const taxs = Math.floor((price * 20) / 19 + 1);
      const bank = setupData.bank;

      const paymentEmbed = new EmbedBuilder()
        .setTitle("عــمــلــيــة الــتــحــويــل")
        .setAuthor({
          name: interaction.guild.name,
          iconURL: interaction.guild.iconURL({ dynamic: true }),
        })
        .setImage(setupData.line)
        .setDescription("**<a:011:1326822363785990205> الــرجــاء الــتــحــويــل فــي اســرع وقــت لــ شــراء الـطـلـب <a:011:1326822363785990205>**")
        .setFooter({
          text: "Dev By Hox Devs",
          iconURL: interaction.guild.iconURL({ dynamic: true }),
        });

      await interaction.reply({ 
        embeds: [paymentEmbed], 
        ephemeral: false,
        fetchReply: true 
      });
      
      await interaction.followUp({
        content: `**مــعــك 5 دقــائــق للــتــحــويــل**\n\`\`\`#credit ${bank} ${taxs}\`\`\``,
        ephemeral: false,
        fetchReply: true
      });

      const filter = (m) =>
        m.author.bot &&
        (m.content === `**:moneybag: | ${interaction.user.username}, has transferred \`$${price}\` to <@!${bank}> **` ||
          m.content === `**ـ ${interaction.user.username}, قام بتحويل \`$${price}\` لـ <@!${bank}> ** |:moneybag:**`);

      const messageCollector = interaction.channel.createMessageCollector({ filter, time: 300000 });

      messageCollector.on("collect", async () => {
        try {
          // التحقق من أن الداتا ما زالت موجودة
          const transactionData = await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id);
          if (!transactionData) return;

          messageCollector.stop();
          await removeTransaction(guildId, interaction.user.id, interaction.channel.id);

          const shopData = await Shop.findOne({ guildId, channelId: interaction.channel.id });
          if (!shopData) return;

          const currentShape = shopData.shape;
          const newChannelName = `${currentShape}︲${newName}`;

          await interaction.channel.setName(newChannelName);
          await Shop.updateOne({ guildId, channelId: interaction.channel.id }, { $set: { name: newName } });

          await interaction.followUp({
            content: `**تــم تــغــيــيــر اســم الــمــتــجــر لــ __${newName}__ بــنــجــاح**`,
            ephemeral: true
          });

          const embed = new EmbedBuilder()
            .setTitle("تــم تــغــيــيــر اســم الــمــتــجــر")
            .setAuthor({
              name: interaction.guild.name,
              iconURL: interaction.guild.iconURL({ dynamic: true }),
            })
            .setImage(setupData.line)
            .addFields(
              { name: "الــمــتــجــر", value: `<#${interaction.channel.id}>`, inline: true },
              { name: "الاســم الــقــديــم", value: `\`${interaction.channel.name}\``, inline: true },
              { name: "الاســم الــجــديــد", value: `\`${newChannelName}\``, inline: true },
            )
            .setFooter({ 
              text: "Dev By Hox Devs", 
              iconURL: interaction.guild.iconURL() 
            });

          await interaction.channel.send({ content: `<@${shopData.ownerId}>`, embeds: [embed] });

        if (logsData && logsData.shopLogRoom) {
                const logChannel = await client.channels.fetch(logsData.shopLogRoom);
            if (logChannel) {
              const logEmbed = new EmbedBuilder()
                .setTitle("لــوق تــغــيــر اســم مــتــجــر")
                .addFields(
                  { name: "الــمــتــجــر", value: `<#${interaction.channel.id}>`, inline: true },
                  { name: "الــمــســؤؤل", value: `<@${interaction.user.id}>`, inline: true },
                  { name: "الاســم الــجــديــد", value: `\`${newChannelName}\``, inline: true }
                )
                .setTimestamp();

              await logChannel.send({ embeds: [logEmbed] });
            }
          }
        } catch (error) {
          console.error(error);
          await removeTransaction(guildId, interaction.user.id, interaction.channel.id);
          await interaction.followUp({
            content: `**حــدث خــطــأ، الرجــاء الــتــواصــل مــع الدعــم لــحــل الــمــشــكــلــة**\n[رابــط الدعــم](https://discord.gg/DDEMEczWAx)\n**الــمــشــكــلــة:** ${error.message}`,
            ephemeral: false
          });
        }
      });

      messageCollector.on('end', async (collected) => {
        if (collected.size === 0) {
          const check = await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id);
          if (check) {
            await removeTransaction(guildId, interaction.user.id, interaction.channel.id);
            interaction.followUp({
              content: "**تــم انــتــهــاء الــوقــت\nالــرجــاء عــدم الــتــحــويــل**",
              ephemeral: false
            });
          }
        }
      });
    }

    // إلغاء الشراء
    if (interaction.isButton() && interaction.customId === "11name_cancel_purchase2") { 
      const mentionedUsers = interaction.message.mentions.users;
      if (mentionedUsers.size === 0 || !mentionedUsers.has(interaction.user.id)) {
        return interaction.reply({
          content: "**شــو دخــلــك بــ الــشــراء\nيــلا انــقــلــع**",
          ephemeral: true
        });
      }     
      
      // حذف الداتا إن وجدت
      await removeTransaction(guildId, interaction.user.id, interaction.channel.id);

      await interaction.update({
        content: "**تــم إلــغــاء عــمــلــيــة تــغــيــيــر اســم الــمــتــجــر**",
        embeds: [],
        components: []
      });
    }

    // زر الإلغاء الطارئ
    if (interaction.isButton() && interaction.customId === "astacancel-change-name") {
      await removeTransaction(guildId, interaction.user.id, interaction.channel.id);
      await interaction.update({
        content: "**تــم حــل مــشــكــلــتــك بــنــجــاح**",
        components: []
      });
    }
  }
}