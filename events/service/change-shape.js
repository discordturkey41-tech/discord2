const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js");
const Prices = require("../../Mangodb/prices.js");
const SaleState = require('../../Mangodb/saleState.js');
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

    // === زر تغيير الشكل ===
    if (interaction.isButton() && interaction.customId === "change-shape") {
      // التحقق من وجود عملية (بدون حفظ)
      if (await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id)) {
        const cancelButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('astacancel-change-shape')
            .setLabel('الــغــاء')
            .setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({
          ephemeral: true,
          content: `**عــنــدك عــمــلــيــه شــراء\n-# لو عــنــدك مــشــكــلــة اســتــعــمــل زر الــغــاء ســوف يــتــم حــل جــمــيــع مــشــاكــلــك**`,
          components: [cancelButton],
        });
      }

      const shopData = await Shop.findOne({ guildId, channelId: interaction.channel.id });
      if (!shopData) return interaction.reply({ content: "❌ هـذه الـروم لـيست مـتـجـر", ephemeral: true });

      const owner = shopData.ownerId;
      const partners = shopData.partners;

      if (interaction.user.id !== owner && (!partners || !partners.includes(interaction.user.id))) {
        return interaction.reply({
          content: "**انــت مــالــك بــ الــمــتــجــر\n يــلا روح اشــحــت بــعــيــد**",
          ephemeral: true 
        });
      }

      const saleState = await SaleState.findOne({
        guildId: interaction.guild.id,
        type: "change_style"
      });

      if (saleState?.state === "disable") {
        return interaction.reply({
          content: "**خــدمــة تــغــيــيــر شــكــل الــمــتــجــر مــعــطــلــة حالياً**",
          ephemeral: true
        });
      }

      const modal = new ModalBuilder()
        .setCustomId('shape_change_modal')
        .setTitle('تــغــيــيــر شــكــل الــمــتــجــر');

      const shapeInput = new TextInputBuilder()
        .setCustomId('new_shape_input')
        .setLabel('الشــكــل الــجــديــد')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(20)
        .setPlaceholder('أدخل الشكل الجديد للمتجر...');

      const firstActionRow = new ActionRowBuilder().addComponents(shapeInput);
      modal.addComponents(firstActionRow);

      await interaction.showModal(modal);
    }

    // === عند إرسال المودال ===
    if (interaction.isModalSubmit() && interaction.customId === 'shape_change_modal') {
      // التحقق مرة أخرى
      if (await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id)) {
        const cancelButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('astacancel-change-shape')
            .setLabel('الــغــاء')
            .setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({
          ephemeral: true,
          content: `**عــنــدك عــمــلــيــه شــراء\n-# لو عــنــدك مــشــكــلــة اســتــعــمــل زر الــغــاء ســوف يــتــم حــل جــمــيــع مــشــاكــلــك**`,
          components: [cancelButton],
        });
      }

      const newShape = interaction.fields.getTextInputValue('new_shape_input');
      const saleState = await SaleState.findOne({
        guildId: interaction.guild.id,
        type: "change_style"
      });

      if (saleState?.state === "disable") {
        return interaction.reply({
          content: "**خــدمــة تــغــيــيــر شــكــل الــمــتــجــر مــعــطــلــة حالياً**",
          ephemeral: true
        });
      }

      const setupData = await Setup.findOne({ guildId });
      const pricesData = await Prices.findOne({ guildId });
      
      const shopData = await Shop.findOne({ guildId, channelId: interaction.channel.id });
      if (!shopData) {
        return interaction.reply({ content: "❌ هـذه الـروم لـيست مـتـجـر", ephemeral: true });
      }

      const price = pricesData?.changeShapePrice;
      if (!pricesData?.changeShapePrice || pricesData.changeShapePrice <= 0) {
        return interaction.followUp({
          content: "❌ سـعـر تـغـيـيـر شـكـل الـمـتـجـر غـيـر مـحـدد! الـرجـاء اخـبـار الادارة",
          ephemeral: true
        });
      }

      const typeEmbed = new EmbedBuilder()
        .setTitle("تــفــاصــيــل تــغــيــيــر شــكــل الــمــتــجــر")
        .setImage(setupData?.line || null)
        .addFields(
          { name: "الــشــكــل الــحــالــي", value: `\`${shopData.shape}\``, inline: true },
          { name: "الــشــكــل الــجــديــد", value: `\`${newShape}\``, inline: true },
          { name: "الــمــتــجــر", value: `<#${interaction.channel.id}>`, inline: true }
        )
        .setFooter({
          text: "Dev By Hox Devs",
          iconURL: interaction.guild.iconURL({ dynamic: true }),
        });

      // تمرير الشكل الجديد عبر الـ ID
      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`c73on37firm_sh74325ape_change_${newShape}`)
          .setLabel("تــأكــيــد الــشــراء")
          .setStyle(ButtonStyle.Success)
          .setEmoji("<a:yes:1405131777948909599>"),
        new ButtonBuilder()
          .setCustomId("cancel_shape_purchase")
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

    // === عند تأكيد تغيير الشكل ===
    if (interaction.isButton() && interaction.customId.startsWith("c73on37firm_sh74325ape_change_")) {
      // التحقق النهائي قبل الحفظ
      if (await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id)) {
        const cancelButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('astacancel-change-shape')
            .setLabel('الــغــاء')
            .setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({
          ephemeral: true,
          content: `**عــنــدك عــمــلــيــه شــراء\n-# لو عــنــدك مــشــكــلــة اســتــعــمــل زر الــغــاء ســوف يــتــم حــل جــمــيــع مــشــاكــلــك**`,
          components: [cancelButton],
        });
      }

      const newShape = interaction.customId.replace("c73on37firm_sh74325ape_change_", "");
      const mentionedUsers = interaction.message.mentions.users;
      if (mentionedUsers.size === 0 || !mentionedUsers.has(interaction.user.id)) {
        return interaction.reply({
          content: "**شــو دخــلــك بــ الــشــراء\nيــلا انــقــلــع**",
          ephemeral: true
        });
      }     
              const logsData = await Logs.findOne({ guildId: interaction.guild.id }); // جلب بيانات اللوجات

      const setupData = await Setup.findOne({ guildId });
      const pricesData = await Prices.findOne({ guildId });
      if (!setupData || !setupData.bank) {
        return interaction.reply({
          content: "**الــرجــاء اخــبــار الادارة بــوضــع صــاحــب الــتــحــويــل مــن امــر\n /setup**",
          ephemeral: true,
        });
      }

      const price = pricesData?.changeShapePrice || 0;
      
      // === حفظ الداتا في server.json الآن فقط ===
      await addTransaction(guildId, interaction.user.id, interaction.channel.id, "shape-change", { newShape, price });

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
          const transactionData = await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id);
          if (!transactionData) return;

          messageCollector.stop();
          await removeTransaction(guildId, interaction.user.id, interaction.channel.id);

          const shopData = await Shop.findOne({ guildId, channelId: interaction.channel.id });
          if (!shopData) return;

          // استخراج الاسم الحالي (بدون الشكل)
          const currentName = interaction.channel.name.split("︲").slice(1).join("︲") || shopData.name;
          
          // إنشاء الاسم الجديد
          const newChannelName = `${newShape}︲${currentName}`;

          await interaction.channel.setName(newChannelName);
          await Shop.updateOne(
            { guildId: interaction.guild.id, channelId: interaction.channel.id },
            { $set: { shape: newShape } }
          );

          const embed = new EmbedBuilder()
            .setTitle("تــم تــغــيــيــر شــكــل الــمــتــجــر")
            .setAuthor({
              name: interaction.guild.name,
              iconURL: interaction.guild.iconURL({ dynamic: true }),
            })
            .setImage(setupData.line)
            .addFields(
              { name: "الشــكــل الــقــديــم", value: `\`${shopData.shape}\``, inline: true },
              { name: "الشــكــل الــجــديــد", value: `\`${newShape}\``, inline: true },
              { name: "الاســم الــجــديــد", value: `\`${newChannelName}\``, inline: true },
              { name: "الــمــتــجــر", value: `<#${interaction.channel.id}>`, inline: true },
              { name: "الــوقــت", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
            )
            .setFooter({ 
              text: "Dev By Hox Devs", 
              iconURL: interaction.guild.iconURL() 
            });

          await interaction.followUp({
            content: `**تــم تــغــيــيــر شــكــل الــمــتــجــر <#${interaction.channel.id}> بــنــجــاح**`,
            ephemeral: true
          });

          await interaction.channel.send({
            content: `<@${shopData.ownerId}>`,
            embeds: [embed]
          });

          try {
            const owner = await client.users.fetch(shopData.ownerId);
            await owner.send({
              content: `**تــم تــغــيــيــر شــكــل مــتــجــرك <#${interaction.channel.id}>**`,
              embeds: [embed]
            });
          } catch (err) {
            console.log("فشل في إرسال رسالة خاصة للمالك");
          }

        if (logsData && logsData.shopLogRoom) {
                const logChannel = await client.channels.fetch(logsData.shopLogRoom);
            if (logChannel) {
              const logEmbed = new EmbedBuilder()
                .setTitle("لــوق تــغــيــيــر شــكــل مــتــجــر")
                .addFields(
                  { name: "الــمــتــجــر", value: `<#${interaction.channel.id}>`, inline: true },
                  { name: "الــمــســؤؤل", value: `<@${interaction.user.id}>`, inline: true },
                  { name: "الشــكــل الــجــديــد", value: `\`${newShape}\``, inline: true },
                  { name: "الــســعــر", value: `${price}$`, inline: true }
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

    // === إلغاء تغيير الشكل ===
    if (interaction.isButton() && (interaction.customId === "cancel_shape_change" || interaction.customId === "cancel_shape_purchase")) {
      const mentionedUsers = interaction.message.mentions.users;
      if (mentionedUsers.size === 0 || !mentionedUsers.has(interaction.user.id)) {
        return interaction.reply({
          content: "**شــو دخــلــك بــ الــشــراء\nيــلا انــقــلــع**",
          ephemeral: true
        });
      }     

      await removeTransaction(guildId, interaction.user.id, interaction.channel.id);

      await interaction.update({
        content: "**تــم إلــغــاء عــمــلــيــة تــغــيــيــر شــكــل الــمــتــجــر**",
        embeds: [],
        components: []
      });
    }

    // زر الإلغاء الطارئ
    if (interaction.isButton() && interaction.customId === "astacancel-change-shape") {
      await removeTransaction(guildId, interaction.user.id, interaction.channel.id);
      await interaction.update({
        content: "**تــم حــل مــشــكــلــتــك بــنــجــاح**",
        components: [] 
      });
    }
  }
};