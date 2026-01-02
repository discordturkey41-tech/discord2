const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Setup = require("../../Mangodb/setup.js");
const Shop = require("../../Mangodb/shop.js");
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
    if (!interaction.isButton()) return;
    if (!interaction.guild) return;
    const guildId = interaction.guild.id;

    if (interaction.isButton() && interaction.customId === "owner_buy") {
      // التحقق من وجود عملية شراء (بدون حفظ)
      if (await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id)) {
        const cancelButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('astacancel-change-owner')
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
      const owner = shopData.ownerId;

      if (interaction.user.id !== owner) {
        return interaction.reply({
          content: "**انــت مــالــك بــ الــمــتــجــر\n يــلا روح اشــحــت بــعــيــد**",
          ephemeral: true 
        });
      }

      const saleState = await SaleState.findOne({
        guildId: interaction.guild.id,
        type: "change_owner"
      });

      if (saleState?.state === "disable") {
        return interaction.reply({
          content: "**خــدمــة تــغــيــيــر صــاحــب الــمــتــجــر مــعــطــلــة حالياً**",
          ephemeral: true
        });
      }

      await interaction.reply({
        content: "**مــعــاك دقــيــقــة عــشــان تــمــنــشــن أو تــكــتــب آيــدي صــاحــب الــمــتــجــر الــجــديــد**",
        ephemeral: true
      });

      const filter = m => m.author.id === interaction.user.id;
      const messageCollector = interaction.channel.createMessageCollector({
        filter,
        time: 60000,
        max: 1
      });

      messageCollector.on('collect', async (m) => {
        let newOwnerId;
        if (m.mentions.users.size > 0) {
          newOwnerId = m.mentions.users.first().id;
        } else if (/^\d{17,19}$/.test(m.content)) {
          newOwnerId = m.content;
        }

        if (!newOwnerId) {
          return interaction.followUp({
            content: "**مــن فــضــلــك ارســل مــنــشــن أو آيــدي صــحــيــح**",
            ephemeral: true
          });
        }
        await processOwnerChange(client, interaction, newOwnerId);
      });

      messageCollector.on('end', async (collected) => {
        if (collected.size === 0) {
          await interaction.followUp({
            content: "**انــتــهــى الــوقــت**",
            ephemeral: true
          });
        }
      });
    }

    // === عند التأكيد لتغيير المالك ===
    if (interaction.isButton() && interaction.customId.startsWith("5co5nfirmowner_")) {
      const [_, typeOrder, newOwnerId] = interaction.customId.split("_");
      
      // التحقق قبل الحفظ
      if (await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id)) {
        const cancelButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('astacancel-change-owner')
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
      await processPayment(client, interaction, newOwnerId);
    }

    // إلغاء شراء تغيير المالك
    if (interaction.isButton() && interaction.customId === "11owner_cancel_purchase2") { 
      const mentionedUsers = interaction.message.mentions.users;
      if (mentionedUsers.size === 0 || !mentionedUsers.has(interaction.user.id)) {
        return interaction.reply({
          content: "**شــو دخــلــك بــ الــشــراء\nيــلا انــقــلــع**",
          ephemeral: true
        });
      }     

      await removeTransaction(guildId, interaction.user.id, interaction.channel.id);

      await interaction.update({
        content: "**تــم إلــغــاء عــمــلــيــة تــغــيــيــر صــاحــب الــمــتــجــر**",
        embeds: [],
        components: []
      });
    }

    async function processOwnerChange(client, interaction, newOwnerId) {
      // التحقق مرة أخرى قبل عرض الفاتورة
      if (await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id)) {
        const cancelButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('astacancel-change-owner')
            .setLabel('الــغــاء')
            .setStyle(ButtonStyle.Danger)
        );
        return interaction.followUp({
          ephemeral: true,
          content: `**عــنــدك عــمــلــيــه شــراء\n-# لو عــنــدك مــشــكــلــة اســتــعــمــل زر الــغــاء ســوف يــتــم حــل جــمــيــع مــشــاكــلــك**`,
          components: [cancelButton],
        });
      }

      const guildId = interaction.guild.id;
      const setupData = await Setup.findOne({ guildId });
      const pricesData = await Prices.findOne({ guildId });
      const channel = interaction.channel;

      const shopData = await Shop.findOne({ guildId, channelId: channel.id });
      if (!shopData) return;

      if (newOwnerId === shopData.ownerId) {
        return interaction.followUp({
          content: "**بــتــحــط نــفــس الاونــر الــقــديــم تــســتــهــبــل؟**",
          ephemeral: true,
        });
      }

      const newOwnerUser = await client.users.fetch(newOwnerId).catch(() => null);
      if (!newOwnerUser || newOwnerUser.bot) {
        return interaction.followUp({
          content: "**بــتــحــط بــوت اونــر الــمــتــجــر شــارب انــت؟**",
          ephemeral: true,
        });
      }

      if (!pricesData?.changeOwnerPrice || pricesData.changeOwnerPrice <= 0) {
        return interaction.followUp({
          content: "❌ سـعـر تـغـيـيـر صـاحـب الـمـتـجـر غـيـر مـحـدد! الـرجـاء اخـبـار الادارة",
          ephemeral: true
        });
      }

      const price = pricesData.changeOwnerPrice;

      const typeEmbed = new EmbedBuilder()
        .setTitle("تــفــاصــيــل الــخــدمــه:")
        .setImage(setupData.line)
        .addFields(
          { name: "الــســعــر", value: `${price}`, inline: true },
          { name: "الــمــالــك الــجــديــد", value: `<@${newOwnerId}>`, inline: true },
          { name: "الــمــتــجــر", value: `<#${channel.id}>`, inline: true }
        )
        .setFooter({
          text: "Dev By Hox Devs",
          iconURL: interaction.guild.iconURL({ dynamic: true }),
        });

      // تمرير الـ ID الجديد في الزر (بدون حفظ داتا)
      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`5co5nfirmowner_${Date.now()}_${newOwnerId}`)
          .setLabel("تــأكــيــد الــشــراء")
          .setStyle(ButtonStyle.Success)
          .setEmoji("<a:yes:1405131777948909599>"),
        new ButtonBuilder()
          .setCustomId("11owner_cancel_purchase2")
          .setLabel("إلــغــاء الــعــمــلــيــة")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("<a:no:1405131885146800148>")
      );

      return interaction.followUp({
        content: `${interaction.user}`,
        embeds: [typeEmbed],
        components: [confirmRow],
        ephemeral: true,
      });
    }

    async function processPayment(client, interaction, newOwnerId) {
      const guildId = interaction.guild.id;
      const setupData = await Setup.findOne({ guildId });
      const pricesData = await Prices.findOne({ guildId });
              const logsData = await Logs.findOne({ guildId: interaction.guild.id }); // جلب بيانات اللوجات

      if (!setupData || !setupData.bank) {
        return interaction.reply({
          content: "**الــرجــاء اخــبــار الادارة بــوضــع صــاحــب الــتــحــويــل مــن امــر\n /setup**",
          ephemeral: true,
        });
      }

      const price = pricesData.changeOwnerPrice;
      
      // === حفظ الداتا في server.json الآن فقط ===
      await addTransaction(guildId, interaction.user.id, interaction.channel.id, "owner-change", { newOwnerId, price });

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

          const newOwnerUser = await client.users.fetch(newOwnerId).catch(() => null);
          if (!newOwnerUser) return;

          const oldOwnerMember = await interaction.guild.members.fetch(shopData.ownerId).catch(() => null);
          const newOwnerMember = await interaction.guild.members.fetch(newOwnerId).catch(() => null);

          // تحديث الصلاحيات
          await interaction.channel.permissionOverwrites.edit(shopData.ownerId, {
            SendMessages: null,
            MentionEveryone: null,
            EmbedLinks: null,
            AttachFiles: null,
            ViewChannel: null
          });

          await interaction.channel.permissionOverwrites.edit(newOwnerId, {
            SendMessages: true,
            MentionEveryone: true,
            EmbedLinks: true,
            AttachFiles: true,
            ViewChannel: true
          });

          if (shopData.role) {
            if (oldOwnerMember) await oldOwnerMember.roles.remove(shopData.role);
            if (newOwnerMember) await newOwnerMember.roles.add(shopData.role);
          }

          if (shopData.partners && shopData.partners.includes(newOwnerId)) {
            await Shop.updateOne(
              { guildId, channelId: interaction.channel.id },
              {
                $pull: { partners: newOwnerId },
                $set: { 
                  "partnersData.$[elem].isActive": false,
                  "partnersData.$[elem].removedAt": new Date(),
                  "partnersData.$[elem].removedBy": interaction.user.id
                }
              },
              { arrayFilters: [{ "elem.userId": newOwnerId }] }
            );
          }

          await Shop.updateOne(
            { guildId: interaction.guild.id, channelId: interaction.channel.id },
            { $set: { ownerId: newOwnerId } }
          );

          const embed = new EmbedBuilder()
            .setTitle("تــم تــغــيــيــر صــاحــب الــمــتــجــر")
            .addFields(
              { name: "الــمــتــجــر", value: `<#${interaction.channel.id}>`, inline: true },
              { name: "الــمــالــك الــقــديــم", value: `<@${shopData.ownerId}>`, inline: true },
              { name: "الــمــالــك الــجــديــد", value: `<@${newOwnerId}>`, inline: true },
              { name: "الــوقــت", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: false }
            )
            .setAuthor({
              name: interaction.guild.name,
              iconURL: interaction.guild.iconURL({ dynamic: true }),
            })
            .setImage(setupData.line)
            .setFooter({ 
              text: "Dev By Hox Devs", 
              iconURL: interaction.guild.iconURL() 
            });

          await interaction.followUp({
            content: `**تــم تــغــيــيــر صــاحــب الــمــتــجــر <#${interaction.channel.id}> بــنــجــاح**`,
            ephemeral: false
          });

          await interaction.channel.send({ content: `<@${newOwnerId}>`, embeds: [embed] });

          try {
            const oldOwnerUser = await client.users.fetch(shopData.ownerId);
            await oldOwnerUser.send({
              content: `**❌ تــم إزالــة مــلــكــيــتــك لــلــمــتــجــر <#${interaction.channel.id}>**`,
              embeds: [embed]
            });
          } catch (err) {
            console.log("فشل في إرسال رسالة خاصة للمالك القديم");
          }

          try {
            await newOwnerUser.send({
              content: `**تــم تــعــيــيــنــك مــالــكــاً جــديــداً لــلــمــتــجــر <#${interaction.channel.id}>**`,
              embeds: [embed]
            });
          } catch (err) {
            console.log("فشل في إرسال رسالة خاصة للمالك الجديد");
          }

        if (logsData && logsData.shopLogRoom) {
                const logChannel = await client.channels.fetch(logsData.shopLogRoom);
            if (logChannel) {
              const logEmbed = new EmbedBuilder()
                .setTitle("لــوق تــغــيــيــر مــالــك مــتــجــر")
                .addFields(
                  { name: "الــمــتــجــر", value: `<#${interaction.channel.id}>`, inline: true },
                  { name: "الــمــســؤؤل", value: `<@${interaction.user.id}>`, inline: true },
                  { name: "الــمــالــك الــقــديــم", value: `<@${shopData.ownerId}>`, inline: true },
                  { name: "الــمــالــك الــجــديــد", value: `<@${newOwnerId}>`, inline: true }
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

    if (interaction.customId === "astacancel-change-owner") {
      await removeTransaction(guildId, interaction.user.id, interaction.channel.id);
      await interaction.update({
        content: "**تــم حــل مــشــكــلــتــك بــنــجــاح**",
        components: [] 
      });
    }
  }
};