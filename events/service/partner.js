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
  updateTransaction,
  removeTransaction
} = require("../../functions/serverDataManager.js");

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(client, interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.guild) return;

    const guildId = interaction.guild.id;

    // === زر الشركاء ===
    if (interaction.isButton() && interaction.customId === "partners-manage") {
      const shopData = await Shop.findOne({ guildId, channelId: interaction.channel.id });
      if (!shopData) {
        return interaction.reply({
          content: "❌ هـذه الـروم لـيست مـتـجـر",
          ephemeral: true
        });
      }

      const owner = shopData.ownerId;
      const partners = shopData.partners;

      if (interaction.user.id !== owner) {
        return interaction.reply({
          content: "**انــت مــالــك بــ الــمــتــجــر\n يــلا روح اشــحــت بــعــيــد**",
          ephemeral: true 
        });
      }

      const saleState = await SaleState.findOne({
        guildId: interaction.guild.id,
        type: "partners"
      });

      if (saleState?.state === "disable") {
        return interaction.reply({
          content: "**خــدمــة تــنــظــيــم الــشــركــاء مــعــطــلــة حالياً**",
          ephemeral: true
        });
      }

      const setupData = await Setup.findOne({ guildId });
      
      const embed = new EmbedBuilder()
        .setAuthor({
          name: interaction.guild.name,
          iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setImage(setupData?.line || null)
        .setTitle("إدارة شــركــاء الــمــتــجــر")
        .setDescription("**<a:hox_star_pink:1326824571130613771> اخــتــر الــعــمــلــيــة الــتــي تــريــدهــا <a:hox_star_purble:1326824672817319969>**")
        .setFooter({
          text: "Dev By Hox Devs",
          iconURL: interaction.guild.iconURL({ dynamic: true })
        });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("add_partner_btn")
          .setLabel("إضــافــة شــريــك")
          .setStyle(ButtonStyle.Success)
          .setEmoji("<a:0091:1326822365908303933>"),
        new ButtonBuilder()
          .setCustomId("remove_partner_btn")
          .setLabel("إزالــة شــريــك")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("<a:hox_red_spar:1405145176027959366>")
      );

      return interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
      });
    }

    // === زر إضافة شريك ===
    if (interaction.isButton() && interaction.customId === "add_partner_btn") {
      const shopData = await Shop.findOne({ guildId, channelId: interaction.channel.id });
      if (!shopData) {
        return interaction.reply({ content: "❌ هـذه الـروم لـيست مـتـجـر", ephemeral: true });
      }

      const saleState = await SaleState.findOne({
        guildId: interaction.guild.id,
        type: "partners"
      });

      if (saleState?.state === "disable") {
        return interaction.reply({
          content: "**خــدمــة تــنــظــيــم الــشــركــاء مــعــطــلــة حالياً**",
          ephemeral: true
        });
      }

      // التحقق من وجود عملية شراء نشطة باستخدام ملف JSON
      if (await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id)) {
        const cancelButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('astacancel-add-partner')
            .setLabel('الــغــاء')
            .setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({
          ephemeral: true,
          content: `**عــنــدك عــمــلــيــه شــراء\n-# لو عــنــدك مــشــكــلــة اســتــعــمــل زر الــغــاء ســوف يــتــم حــل جــمــيــع مــشــاكــلــك**`,
          components: [cancelButton],
        });
      }

      await interaction.reply({
        content: "**مــعــاك دقــيــقــة عــشــان تــمــنــشــن أو تــكــتــب آيــدي الــشــخــص الــمــراد اضــافــتــه شــريــك**",
        ephemeral: true
      });

      const filter = m => m.author.id === interaction.user.id;
      const messageCollector = interaction.channel.createMessageCollector({
        filter,
        time: 60000,
        max: 1
      });

      messageCollector.on("collect", async (message) => {
        let targetUser;
        
        // محاولة جلب المستخدم من المينشن
        if (message.mentions.users.size > 0) {
          targetUser = message.mentions.users.first();
        } else {
          // محاولة جلب المستخدم من الأيدي
          const userId = message.content.match(/\d+/)?.[0];
          if (userId) {
            try {
              targetUser = await client.users.fetch(userId);
            } catch (error) {
              // إذا فشل الجلب بالأيدي
            }
          }
        }

        if (!targetUser) {
          await interaction.followUp({
            content: "❌ لــم يــتــم الــعــثــور عــلــى الــمــســتــخــدم، الــرجــاء الــتــأكــد مــن الــمــنــشــن أو الــآيــدي",
            ephemeral: true
          });
          await removeTransaction(guildId, interaction.user.id, interaction.channel.id);
          return;
        }

        if (targetUser.bot) {
          await interaction.followUp({
            content: "**❌ لا يــمــكــن اضــافــة بــوت كــشــريــك**",
            ephemeral: true
          });
          await removeTransaction(guildId, interaction.user.id, interaction.channel.id);
          return;
        }

        if (targetUser.id === shopData.ownerId) {
          await interaction.followUp({
            content: "**❌ لا يــمــكــن اضــافــة مــالــك الــمــتــجــر كــشــريــك**",
            ephemeral: true
          });
          await removeTransaction(guildId, interaction.user.id, interaction.channel.id);
          return;
        }

        if (shopData.partners && shopData.partners.includes(targetUser.id)) {
          await interaction.followUp({
            content: "**❌ هــذا الــشــخــص شــريــك بــالــفــعــل**",
            ephemeral: true
          });
          await removeTransaction(guildId, interaction.user.id, interaction.channel.id);
          return;
        }

        // حفظ بيانات العملية في ملف JSON
        await addTransaction(guildId, interaction.user.id, interaction.channel.id, "partner-add", {
          targetUserId: targetUser.id
        });

        const pricesData = await Prices.findOne({ guildId });
        const setupData = await Setup.findOne({ guildId });
        
        const price = pricesData?.addPartnersPrice || 0;
        if (price <= 0) {
          await interaction.followUp({
            content: "❌ ســعــر اضــافــة شــريــك غــيــر مــحــدد! الــرجــاء اخــبــار الادارة",
            ephemeral: true
          });
          await removeTransaction(guildId, interaction.user.id, interaction.channel.id);
          return;
        }

        const typeEmbed = new EmbedBuilder()
          .setTitle("تــفــاصــيــل اضــافــة شــريــك")
          .setAuthor({
            name: interaction.guild.name,
            iconURL: interaction.guild.iconURL({ dynamic: true }),
          })
          .setImage(setupData.line)
          .addFields(
            { name: "الــشــريــك الــمــراد اضــافــتــه", value: `<@${targetUser.id}>`, inline: true },
            { name: "الــمــتــجــر", value: `<#${interaction.channel.id}>`, inline: true },
          )
          .setFooter({
            text: "Dev By Hox Devs",
            iconURL: interaction.guild.iconURL({ dynamic: true }),
          });

        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("6c13on5firm_partner_add")
            .setLabel("تــأكــيــد الــشــراء")
            .setStyle(ButtonStyle.Success)
            .setEmoji("<a:yes:1405131777948909599>"),
          new ButtonBuilder()
            .setCustomId("cancel_partner_purchase")
            .setLabel("إلــغــاء الــعــمــلــيــة")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("<a:no:1405131885146800148>")
        );

        await interaction.followUp({
          content: `${interaction.user}`,
          embeds: [typeEmbed],
          components: [confirmRow],
          ephemeral: false,
        });

        // حذف رسالة المستخدم
        await message.delete().catch(() => {});
      });

      messageCollector.on("end", async (collected) => {
        if (collected.size === 0) {
          await interaction.followUp({ content: "انــتــهــى الــوقــت لادخــال الــمــســتــخــدم", ephemeral: true });
          await removeTransaction(guildId, interaction.user.id, interaction.channel.id);
        }
      });
    }

    // === زر إزالة شريك ===
    if (interaction.isButton() && interaction.customId === "remove_partner_btn") {
      const shopData = await Shop.findOne({ guildId, channelId: interaction.channel.id });
      if (!shopData) {
        return interaction.reply({ content: "❌ هـذه الـروم لـيست مـتـجـر", ephemeral: true });
      }

      const saleState = await SaleState.findOne({
        guildId: interaction.guild.id,
        type: "partners"
      });

      if (saleState?.state === "disable") {
        return interaction.reply({
          content: "**خــدمــة تــنــظــيــم الــشــركــاء مــعــطــلــة حالياً**",
          ephemeral: true
        });
      }

      if (!shopData.partners || shopData.partners.length === 0) {
        return interaction.reply({
          content: "**💡 لا يــوجــد شــركــاء فــي هــذا الــمــتــجــر**",
          ephemeral: true
        });
      }

      // التحقق من وجود أي عملية نشطة
      if (await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id)) {
        const cancelButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('astacancel-remove-partner')
            .setLabel('الــغــاء')
            .setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({
          ephemeral: true,
          content: `**عــنــدك عــمــلــيــه شــراء\n-# لو عــنــدك مــشــكــلــة اســتــعــمــل زر الــغــاء ســوف يــتــم حــل جــمــيــع مــشــاكــلــك**`,
          components: [cancelButton],
        });
      }

      await interaction.reply({
        content: "**مــعــاك دقــيــقــة عــشــان تــمــنــشــن أو تــكــتــب آيــدي الــشــريــك الــمــراد ازالــتــه**",
        ephemeral: true
      });

      const filter = m => m.author.id === interaction.user.id;
      const messageCollector = interaction.channel.createMessageCollector({
        filter,
        time: 60000,
        max: 1
      });

      messageCollector.on("collect", async (message) => {
        let targetUser;
        
        // محاولة جلب المستخدم من المينشن
        if (message.mentions.users.size > 0) {
          targetUser = message.mentions.users.first();
        } else {
          // محاولة جلب المستخدم من الأيدي
          const userId = message.content.match(/\d+/)?.[0];
          if (userId) {
            try {
              targetUser = await client.users.fetch(userId);
            } catch (error) {
              // إذا فشل الجلب بالأيدي
            }
          }
        }

        if (!targetUser) {
          await interaction.followUp({
            content: "❌ لــم يــتــم الــعــثــور عــلــى الــمــســتــخــدم، الــرجــاء الــتــأكــد مــن الــمــنــشــن أو الــآيــدي",
            ephemeral: true
          });
          await removeTransaction(guildId, interaction.user.id, interaction.channel.id);
          return;
        }

        if (!shopData.partners.includes(targetUser.id)) {
          await interaction.followUp({
            content: "**❌ هــذا الــشــخــص لــيــس شــريــكــاً فــي الــمــتــجــر**",
            ephemeral: true
          });
          await removeTransaction(guildId, interaction.user.id, interaction.channel.id);
          return;
        }

        // حفظ بيانات العملية في ملف JSON
        await addTransaction(guildId, interaction.user.id, interaction.channel.id, "partner-remove", {
          targetUserId: targetUser.id
        });

        const pricesData = await Prices.findOne({ guildId });
        const setupData = await Setup.findOne({ guildId });
        
        const price = pricesData?.removePartnersPrice || 0;
        if (price <= 0) {
          await interaction.followUp({
            content: "❌ ســعــر ازالــة شــريــك غــيــر مــحــدد! الــرجــاء اخــبــار الادارة",
            ephemeral: true
          });
          await removeTransaction(guildId, interaction.user.id, interaction.channel.id);
          return;
        }

        const typeEmbed = new EmbedBuilder()
          .setTitle("تــفــاصــيــل ازالــة شــريــك")
          .setAuthor({
            name: interaction.guild.name,
            iconURL: interaction.guild.iconURL({ dynamic: true }),
          })
          .setImage(setupData.line)
          .addFields(
            { name: "الــشــريــك الــمــراد ازالــتــه", value: `<@${targetUser.id}>`, inline: true },
            { name: "الــمــتــجــر", value: `<#${interaction.channel.id}>`, inline: true },
          )
          .setFooter({
            text: "Dev By Hox Devs",
            iconURL: interaction.guild.iconURL({ dynamic: true }),
          });

        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("6c1on65firm_partner_remove")
            .setLabel("تــأكــيــد الــشــراء")
            .setStyle(ButtonStyle.Success)
            .setEmoji("<a:yes:1405131777948909599>"),
          new ButtonBuilder()
            .setCustomId("cancel_partner_purchase")
            .setLabel("إلــغــاء الــعــمــلــيــة")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("<a:no:1405131885146800148>")
        );

        await interaction.followUp({
          content: `${interaction.user}`,
          embeds: [typeEmbed],
          components: [confirmRow],
          ephemeral: false,
        });

        // حذف رسالة المستخدم
        await message.delete().catch(() => {});
      });

      messageCollector.on("end", async (collected) => {
        if (collected.size === 0) {
          await interaction.followUp({ content: "انــتــهــى الــوقــت لادخــال الــمــســتــخــدم", ephemeral: true });
          await removeTransaction(guildId, interaction.user.id, interaction.channel.id);
        }
      });
    }

    // === تأكيد إضافة شريك ===
    if (interaction.isButton() && interaction.customId === "6c13on5firm_partner_add") {
      const originalMessageContent = interaction.message.content;
      
      // التحقق من وجود عملية نشطة
      if (await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id)) {
        const cancelButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('astacancel-remove-warn')
            .setLabel('الــغــاء')
            .setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({
          ephemeral: true,
          content: `**عــنــدك عــمــلــيــه شــراء\n-# لو عــنــدك مــشــكــلــة اســتــعــمــل زر الــغــاء ســوف يــتــم حــل جــمــيــع مــشــاكــلــك**`,
          components: [cancelButton],
        });
      }
      
      // البحث عن المذكرين في الرسالة
      const mentionedUsers = interaction.message.mentions.users;
      
      // التحقق من أن المستخدم الذي ضغط على الزر هو المذكور في الرسالة
      if (mentionedUsers.size === 0 || !mentionedUsers.has(interaction.user.id)) {
        return interaction.reply({
          content: "**شــو دخــلــك بــ الــشــراء\nيــلا انــقــلــع**",
          ephemeral: true
        });
      }     
      
      await handlePartnerTransaction(client, interaction, "add");
    }

    // === تأكيد إزالة شريك ===
    if (interaction.isButton() && interaction.customId === "6c1on65firm_partner_remove") {
      const originalMessageContent = interaction.message.content;
      
      // التحقق من وجود عملية نشطة
      if (await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id)) {
        const cancelButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('astacancel-remove-warn')
            .setLabel('الــغــاء')
            .setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({
          ephemeral: true,
          content: `**عــنــدك عــمــلــيــه شــراء\n-# لو عــنــدك مــشــكــلــة اســتــعــمــل زر الــغــاء ســوف يــتــم حــل جــمــيــع مــشــاكــلــك**`,
          components: [cancelButton],
        });
      }
      
      // البحث عن المذكرين في الرسالة
      const mentionedUsers = interaction.message.mentions.users;
      
      // التحقق من أن المستخدم الذي ضغط على الزر هو المذكور في الرسالة
      if (mentionedUsers.size === 0 || !mentionedUsers.has(interaction.user.id)) {
        return interaction.reply({
          content: "**شــو دخــلــك بــ الــشــراء\nيــلا انــقــلــع**",
          ephemeral: true
        });
      }     
      
      await handlePartnerTransaction(client, interaction, "remove");
    }

    // === إلغاء عملية الشركاء ===
    if (interaction.isButton() && interaction.customId === "cancel_partner_purchase") {
      const originalMessageContent = interaction.message.content;
      
      // التحقق من وجود عملية نشطة
      if (await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id)) {
        return interaction.reply({
          content: "**لــديــك عــمــلــيــة شــراء نــشــطــة بالفــعــل، الــرجــاء الانتــظــار حــتــى تــنــتــهــي**",
          ephemeral: true
        });
      }
      
      // البحث عن المذكرين في الرسالة
      const mentionedUsers = interaction.message.mentions.users;
      
      // التحقق من أن المستخدم الذي ضغط على الزر هو المذكور في الرسالة
      if (mentionedUsers.size === 0 || !mentionedUsers.has(interaction.user.id)) {
        return interaction.reply({
          content: "**شــو دخــلــك بــ الــشــراء\nيــلا انــقــلــع**",
          ephemeral: true
        });
      }     

      // حذف العملية من الملف
      await removeTransaction(guildId, interaction.user.id, interaction.channel.id);

      await interaction.update({
        content: "**تــم إلــغــاء عــمــلــيــة الــشــركــاء**",
        embeds: [],
        components: []
      });
    }

    if (interaction.customId === "astacancel-add-partner") {
      // حذف العملية من الملف
      await removeTransaction(guildId, interaction.user.id, interaction.channel.id);

      await interaction.update({
        content: "**تــم حــل مــشــكــلــتــك بــنــجــاح**",
        components: [] // يشيل الأزرار
      });
    }

    if (interaction.customId === "astacancel-remove-partner") {
      // حذف العملية من الملف
      await removeTransaction(guildId, interaction.user.id, interaction.channel.id);

      await interaction.update({
        content: "**تــم حــل مــشــكــلــتــك بــنــجــاح**",
        components: [] // يشيل الأزرار
      });
    }
  }
};

// دالة معالجة معاملة الشركاء
async function handlePartnerTransaction(client, interaction, action) {
  const guildId = interaction.guild.id;
  const setupData = await Setup.findOne({ guildId });
  
  if (!setupData || !setupData.bank) {
    return interaction.reply({
      content: "**الــرجــاء اخــبــار الادارة بــوضــع صــاحــب الــتــحــويــل مــن امــر\n /setup**",
      ephemeral: true,
    });
  }

  // التحقق من وجود العملية في ملف JSON
  const activeTransaction = await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id);
  if (!activeTransaction) {
    return interaction.reply({ content: "❌ لم يتم العثور على بيانات العملية", ephemeral: true });
  }

  const targetUserId = activeTransaction.targetUserId;
  const pricesData = await Prices.findOne({ guildId });
                const logsData = await Logs.findOne({ guildId: interaction.guild.id }); // جلب بيانات اللوجات

  const price = action === "add" 
    ? pricesData?.addPartnersPrice || 0 
    : pricesData?.removePartnersPrice || 0;
  
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

  const paymentMessage = await interaction.reply({ 
    embeds: [paymentEmbed], 
    ephemeral: false,
    fetchReply: true 
  });
  
  const creditMessage = await interaction.followUp({
    content: `**مــعــك 5 دقــائــق للــتــحــويــل**\n\`\`\`#credit ${bank} ${taxs}\`\`\``,
    ephemeral: false,
    fetchReply: true
  });

  // تحديث بيانات العملية بإضافة معلومات الرسائل
  updateTransaction(interaction.user.id, interaction.channel.id, {
    paymentMessageId: paymentMessage.id,
    creditMessageId: creditMessage.id
  });

  const filter = (m) =>
    m.author.bot &&
    (m.content === `**:moneybag: | ${interaction.user.username}, has transferred \`$${price}\` to <@!${bank}> **` ||
      m.content === `**ـ ${interaction.user.username}, قام بتحويل \`$${price}\` لـ <@!${bank}> ** |:moneybag:**`);

  const messageCollector = interaction.channel.createMessageCollector({ filter, time: 300000 });

  messageCollector.on("collect", async () => {
    try {
      messageCollector.stop();

      // التحقق من أن العملية ما زالت موجودة في الملف
      const transactionCheck = await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id);
      if (!transactionCheck) return;

      // حذف العملية من الملف بعد النجاح
      await removeTransaction(guildId, interaction.user.id, interaction.channel.id);

      const shopData = await Shop.findOne({ guildId, channelId: interaction.channel.id });
      if (!shopData) return;

      const channel = await client.channels.fetch(interaction.channel.id);
      const targetUser = await client.users.fetch(targetUserId);

      if (action === "add") {
        // إضافة الشريك
        await channel.permissionOverwrites.edit(targetUserId, {
          SendMessages: true,
          EmbedLinks: true,
          AttachFiles: true,
          ViewChannel: true
        });

        await Shop.updateOne(
          { guildId, channelId: interaction.channel.id },
          { 
            $push: { 
              partners: targetUserId,
              partnersData: {
                userId: targetUserId,
                addedAt: new Date(),
                addedBy: interaction.user.id,
                isActive: true
              }
            } 
          }
        );
      } else {
        // إزالة الشريك
        await channel.permissionOverwrites.edit(targetUserId, {
          SendMessages: null,
          EmbedLinks: null,
          AttachFiles: null,
          ViewChannel: null
        });

        await Shop.updateOne(
          { 
            guildId, 
            channelId: interaction.channel.id 
          },
          {
            $pull: { partners: targetUserId },
            $set: { 
              "partnersData.$[elem].isActive": false,
              "partnersData.$[elem].removedAt": new Date(),
              "partnersData.$[elem].removedBy": interaction.user.id
            }
          },
          {
            arrayFilters: [{ "elem.userId": targetUserId }]
          }
        );
      }

      // إنشاء الإيمبد
      const embed = new EmbedBuilder()
        .setTitle(action === "add" ? "**تــم اضــافــة شــريــك جــديــد**" : "**تــم ازالــة شــريــك**")
        .setAuthor({
          name: interaction.guild.name,
          iconURL: interaction.guild.iconURL({ dynamic: true }),
        })
        .setImage(setupData.line)
        .addFields(
          { name: "الــمــتــجــر", value: `<#${interaction.channel.id}>`, inline: true },
          { name: action === "add" ? "الــشــريــك الــجــديــد" : "الــشــريــك الــمــزال", value: `<@${targetUserId}>`, inline: true },
          { name: "الــمــالــك", value: `<@${shopData.ownerId}>`, inline: true },
        )
        .setFooter({
          text: "Dev By Hox Devs",
          iconURL: interaction.guild.iconURL({ dynamic: true })
        });

      // إرسال الإشعارات
      await interaction.followUp({
        content: `**تــم ${action === "add" ? "اضــافــة" : "ازالــة"} <@${targetUserId}> ${action === "add" ? "كــشــريــك" : "مــن الــشــركــاء"} فــي <#${interaction.channel.id}> بــنــجــاح**`,
        ephemeral: true
      });

      await channel.send({
        content: `<@${shopData.ownerId}> ${action === "add" ? `<@${targetUserId}>` : ""}`,
        embeds: [embed]
      });

      // إرسال رسالة خاصة للشريك
      try {
        await targetUser.send({
          content: `**تــم ${action === "add" ? "اضــافــتــك كــشــريــك" : "ازالــتــك مــن الــشــركــاء"} فــي مــتــجــر <#${interaction.channel.id}>**`,
          embeds: [embed]
        });
      } catch (err) {
        console.log("فشل في إرسال رسالة خاصة للشريك");
      }

      // إرسال رسالة خاصة للمالك
      try {
        const owner = await client.users.fetch(shopData.ownerId);
        await owner.send({
          content: `**تــم ${action === "add" ? "اضــافــة" : "ازالــة"} <@${targetUserId}> ${action === "add" ? "كــشــريــك" : "مــن الــشــركــاء"} فــي مــتــجــرك <#${interaction.channel.id}>**`,
          embeds: [embed]
        });
      } catch (err) {
        console.log("فشل في إرسال رسالة خاصة للمالك");
      }

      // اللوق
        if (logsData && logsData.shopLogRoom) {
                const logChannel = await client.channels.fetch(logsData.shopLogRoom);
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setTitle(action === "add" ? "اضــافــة شــريــك" : "ازالــة شــريــك")
            .addFields(
              { name: "الــمــتــجــر", value: `<#${interaction.channel.id}>`, inline: true },
              { name: "الــمــســؤؤل", value: `<@${interaction.user.id}>`, inline: true },
              { name: action === "add" ? "الــشــريــك الــجــديــد" : "الــشــريــك الــمــزال", value: `<@${targetUserId}>`, inline: true },
            )
            .setTimestamp();

          await logChannel.send({ embeds: [logEmbed] });
        }
      }
    } catch (error) {
      console.error(error);
      // حذف العملية من الملف في حالة الخطأ
      await removeTransaction(guildId, interaction.user.id, interaction.channel.id);
      
      await interaction.followUp({
        content: `**حــدث خــطــأ، الرجــاء الــتــواصــل مــع الدعــم لــحــل الــمــشــكــلــة**\n[رابــط الدعــم](https://discord.gg/DDEMEczWAx)\n**الــمــشــكــلــة:** ${error.message}`,
        ephemeral: false
      });
    }
  });

  messageCollector.on('end', async (collected) => {
    if (collected.size === 0) {
      // إذا انتهى الوقت ولم يتم التحويل، نحذف الداتا
      const check = await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id);
      if (check) {
        await removeTransaction(guildId, interaction.user.id, interaction.channel.id);
        await interaction.followUp({
          content: "**تــم انــتــهــاء الــوقــت\nالــرجــاء عــدم الــتــحــويــل**",
          ephemeral: false
        });
      }
    }
  });
}