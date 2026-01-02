const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js");
const Types = require("../../Mangodb/types.js");
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
    if (!interaction.isButton()) return;
    if (!interaction.guild) return;

    const guildId = interaction.guild.id;
    if (interaction.isButton() && interaction.customId === "activate_shop") {
      // التحقق من وجود عملية شراء نشطة في الملف
      if (await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id)) {
        const cancelButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('astacancel-activate-shop')
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

      const saleState = await SaleState.findOne({
          guildId: interaction.guild.id,
          type: "auto_activate_shop"
      });

      if (saleState?.state === "disable") {
          return interaction.reply({
              content: "**خــدمــة تــفــعــيــل الــمــتــجــر الــتــلــقــائــي مــعــطــلــة حالياً**",
              ephemeral: true
          });
      }

      if (!shopData) {
        return interaction.reply({
          content: "**❌ هـذه الـروم لـيست مـتـجـر**",
          ephemeral: true
        });
      }

      if (shopData.status === "1") {
        return interaction.reply({
          content: "**الــمــتــجــر مــتــفــعــل اصــلا \nانــت شــارب حــاجــة؟**",
          ephemeral: true
        });
      }

      const setupData = await Setup.findOne({ guildId });

      if (!setupData || !setupData.bank) {
        return interaction.reply({
          content: "**الــرجــاء اخــبــار الادارة بــوضــع صــاحــب الــتــحــويــل مــن امــر\n /setup**",
          ephemeral: true,
        });
      }

      const activateEmbed = new EmbedBuilder()
        .setTitle("تــفــاصــيــل تــفــعــيــل الــمــتــجــر")
        .setImage(setupData?.line || null)
        .addFields(
          { name: "الــمــتــجــر", value: `<#${interaction.channel.id}>`, inline: true },
          { name: "صــاحــب الــمــتــجــر", value: `<@${shopData.ownerId}>`, inline: true },
          { name: "الــحــالــة", value: "مــعــطــل", inline: true }
        )
        .setFooter({
          text: "Dev By Hox Devs",
          iconURL: interaction.guild.iconURL({ dynamic: true }),
        });

      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("15c643onf65463irm_s1hop_activation")
          .setLabel("تــأكــيــد الــشــراء")
          .setStyle(ButtonStyle.Success)
          .setEmoji("<a:yes:1405131777948909599>"),
        new ButtonBuilder()
          .setCustomId("cancel_activation_purchase")
          .setLabel("إلــغــاء الــعــمــلــيــة")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("<a:no:1405131885146800148>")
      );

      return interaction.reply({
        content: `${interaction.user}`,
        embeds: [activateEmbed],
        components: [confirmRow],
        ephemeral: true,
      });
    }

    // === عند تأكيد تفعيل المتجر ===
    if (interaction.isButton() && interaction.customId === "15c643onf65463irm_s1hop_activation") {
      // التحقق من الداتا قبل البدء
      if (await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id)) {
        const cancelButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('astacancel-activate-shop')
            .setLabel('الــغــاء')
            .setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({
          ephemeral: true,
          content: `**عــنــدك عــمــلــيــه شــراء\n-# لو عــنــدك مــشــكــلــة اســتــعــمــل زر الــغــاء ســوف يــتــم حــل جــمــيــع مــشــاكــلــك**`,
          components: [cancelButton],
        });
      }

      const mentionedUsers = interaction.message.mentions.users;
      if (mentionedUsers.size === 0 || !mentionedUsers.has(interaction.user.id)) {
        return interaction.reply({
          content: "**شــو دخــلــك بــ الــشــراء\nيــلا انــقــلــع**",
          ephemeral: true
        });
      }     

      const setupData = await Setup.findOne({ guildId });
      if (!setupData || !setupData.bank) {
        return interaction.reply({
          content: "**الــرجــاء اخــبــار الادارة بــوضــع صــاحــب الــتــحــويــل مــن امــر\n /setup**",
          ephemeral: true,
        });
      }     
         const logsData = await Logs.findOne({ guildId: interaction.guild.id }); // جلب بيانات اللوجات


      const saleState = await SaleState.findOne({
          guildId: interaction.guild.id,
          type: "auto_activate_shop"
      });

      if (saleState?.state === "disable") {
          return interaction.reply({
              content: "**خــدمــة تــفــعــيــل الــمــتــجــر الــتــلــقــائــي مــعــطــلــة حالياً**",
              ephemeral: true
          });
      }

      const shopData = await Shop.findOne({ guildId, channelId: interaction.channel.id });
      const currentType = await Types.findOne({ guildId, name: shopData.type });
      const price = currentType?.price || 0;

      if (!currentType) {
        return interaction.reply({
          content: "**❌ نوع المتجر غير موجود**",
          ephemeral: true
        });
      }

      // حفظ الداتا في server.json هنا فقط
      await addTransaction(guildId, interaction.user.id, interaction.channel.id, "shop-activation");

      const taxs = Math.floor((price * 20) / 19 + 1);
      const bank = setupData.bank;

      const paymentEmbed = new EmbedBuilder()
        .setTitle("عــمــلــيــة الــتــحــويــل")
        .setAuthor({
          name: interaction.guild.name,
          iconURL: interaction.guild.iconURL({ dynamic: true }),
        })
        .setImage(setupData.line)
        .setDescription("**<a:011:1326822363785990205> الــرجــاء الــتــحــويــل فــي اســرع وقــت لــ تــفــعــيــل الـمـتـجـر <a:011:1326822363785990205>**")
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
          // التحقق من أن الداتا ما زالت موجودة في server.json
          // إذا قام المستخدم بالإلغاء أثناء التحويل، فلن نجد الداتا وسنتوقف
          const transactionCheck = await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id);
          if (!transactionCheck) return;

          messageCollector.stop();
          // حذف الداتا بعد النجاح
          await removeTransaction(guildId, interaction.user.id, interaction.channel.id);

          const shopData = await Shop.findOne({ guildId, channelId: interaction.channel.id });
          if (!shopData) return;

          await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { 
            ViewChannel: true 
          });

          await Shop.updateOne(
            { guildId: interaction.guild.id, channelId: interaction.channel.id },
            { $set: { status: "1", warns: 0 } }
          );

          const embed = new EmbedBuilder()
            .setTitle("تــم تـفـعـيـل الـمـتـجـر")
            .setImage(setupData.line)
            .addFields(
              { name: "الــمــتــجــر", value: `<#${interaction.channel.id}>`, inline: true },
              { name: "صــاحــب الــمــتــجــر", value: `<@${shopData.ownerId}>`, inline: true },
              { name: "الــوقــت", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
            )
            .setFooter({ 
              text: "Dev By Hox Devs", 
              iconURL: interaction.guild.iconURL({ dynamic: true }) 
            });

          await interaction.followUp({
            content: `**تــم تـفـعـيـل الـمـتـجـر <#${interaction.channel.id}> بــنــجــاح**`,
            ephemeral: true
          });

          await interaction.channel.send({
            content: `<@${shopData.ownerId}>`,
            embeds: [embed]
          });

          try {
            const owner = await client.users.fetch(shopData.ownerId);
            await owner.send({
              content: `**تــم تـفـعـيـل مــتــجــرك <#${interaction.channel.id}>**`,
              embeds: [embed],
            });
          } catch (err) {
            console.log("فشل في إرسال رسالة خاصة للمالك");
          }

        if (logsData && logsData.shopLogRoom) {
                const logChannel = await client.channels.fetch(logsData.shopLogRoom);
            if (logChannel) {
              const logEmbed = new EmbedBuilder()
                .setTitle("لــوق تـفـعـيـل مــتــجــر")
                .addFields(
                  { name: "الــمــتــجــر", value: `<#${interaction.channel.id}>`, inline: true },
                  { name: "الــمــســؤؤل", value: `<@${interaction.user.id}>`, inline: true },
                  { name: "صــاحــب الــمــتــجــر", value: `<@${shopData.ownerId}>`, inline: true }
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
        // إذا انتهى الوقت ولم يتم التحويل، نحذف الداتا
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

    // === إلغاء تفعيل المتجر ===
    if (interaction.isButton() && interaction.customId === "cancel_activation_purchase") {
      const mentionedUsers = interaction.message.mentions.users;
      if (mentionedUsers.size === 0 || !mentionedUsers.has(interaction.user.id)) {
        return interaction.reply({
          content: "**شــو دخــلــك بــ الــشــراء\nيــلا انــقــلــع**",
          ephemeral: true
        });
      }     

      // حذف الداتا من الملف
      await removeTransaction(guildId, interaction.user.id, interaction.channel.id);

      await interaction.update({
        content: "**تــم إلــغــاء عــمــلــيــة تــفــعــيــل الــمــتــجــر**",
        embeds: [],
        components: []
      });
    }

    // === زر الإلغاء الطارئ (astacancel) ===
    if (interaction.isButton() && interaction.customId === "astacancel-activate-shop") {
      // حذف الداتا لحل مشكلة التعليق
      await removeTransaction(guildId, interaction.user.id, interaction.channel.id);

      await interaction.update({
        content: "**تــم حــل مــشــكــلــتــك بــنــجــاح**",
        components: []
      });
    }
  }
};