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

    // === عند الضغط على زر إزالة التحذيرات ===
    if (interaction.isButton() && interaction.customId === "remove_warnings") {
      const saleState = await SaleState.findOne({
        guildId: interaction.guild.id,
        type: "remove_warnings"
      });

      if (saleState?.state === "disable") {
        return interaction.reply({
          content: "**خــدمــة ازالــة الــتــحــذيــرات مــعــطــلــة حالياً**",
          ephemeral: true
        });
      }

      const setupData = await Setup.findOne({ guildId });
      const pricesData = await Prices.findOne({ guildId });
      const channel = interaction.channel;

      const shopData = await Shop.findOne({ guildId, channelId: channel.id });
      if (!shopData) {
        return interaction.reply({ content: "❌ هـذه الـروم لـيست مـتـجـر", ephemeral: true });
      }

      if (!pricesData?.removeWarnPrice || pricesData.removeWarnPrice <= 0) {
        return interaction.reply({
          content: "❌ سـعـر إزالـة التحـذيـر غـيـر مـحـدد! الـرجـاء اخـبـار الادارة",
          ephemeral: true
        });
      }

      if (shopData.warns === 0) {
        return interaction.reply({
          content: "**هــتــشــيــل ايه وهــو 0 تــحــذيــر؟؟\nانــت شــافــت حــاجــة؟**",
          ephemeral: true
        });
      }

      // التحقق من وجود عملية شراء نشطة باستخدام الملف
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

      // إرسال رسالة لطلب عدد التحذيرات
      const askEmbed = new EmbedBuilder()
        .setTitle("عــدد الــتــحــذيــرات")
        .setAuthor({
          name: interaction.guild.name,
          iconURL: interaction.guild.iconURL({ dynamic: true }),
        })
        .setImage(setupData.line)
        .setFields(
          { name: "الــمــتــجــر", value: `<#${channel.id}>`, inline: true },
          { name: "عــدد الــتــحــذيــرات الــحــالــي", value: `${shopData.warns}`, inline: true }
        )
        .setDescription("**الرجــاء إرســال عــدد الــتــحــذيــرات الــتــي تــريــد إزالــتــهــا:**")
        .setFooter({
          text: "Dev By Hox Devs",
          iconURL: interaction.guild.iconURL({ dynamic: true }),
        });

      const askMessage = await interaction.reply({
        embeds: [askEmbed],
        ephemeral: false,
        fetchReply: true
      });

      // إنشاء كوليكتور لاستقبال عدد التحذيرات
      const filter = (m) => m.author.id === interaction.user.id && !isNaN(parseInt(m.content));
      const messageCollector = interaction.channel.createMessageCollector({ 
        filter, 
        time: 60000, // دقيقة واحدة
        max: 1 
      });

      messageCollector.on('collect', async (message) => {
        const warnCount = parseInt(message.content);
        
        // حذف رسالة المستخدم
        await message.delete().catch(() => {});

        if (warnCount <= 0) {
          return interaction.editReply({
            content: "**هــتــشــيــل رقــم اقــل مــن صــفــر؟\nربــنــا يــهــديــك**",
            embeds: [],
            components: []
          });
        }

        if (warnCount > shopData.warns) {
          return interaction.editReply({
            content: `**ازاي هــتــشــيــل ${warnCount} والــمــتــجــر فــيــه ${shopData.warns} بــطــلــو حــشــيــش بــقــا**`,
            embeds: [],
            components: []
          });
        }

        const pricePerWarn = pricesData.removeWarnPrice;
        const totalPrice = pricePerWarn * warnCount;

        const typeEmbed = new EmbedBuilder()
          .setTitle("تــفــاصــيــل الــخــدمــه:")
          .setAuthor({
            name: interaction.guild.name,
            iconURL: interaction.guild.iconURL({ dynamic: true }),
          })
          .setImage(setupData.line)
          .addFields(
            { name: "الــمــتــجــر", value: `<#${interaction.channel.id}>`, inline: true },
            { name: "عــدد الــتــحــذيــرات", value: `${warnCount}`, inline: true },
            { name: "الــحــد الاقــصــي للــتــحــذيــرات", value: `${shopData.maxWarns}`, inline: true },
          )
          .setFooter({
            text: "Dev By Hox Devs",
            iconURL: interaction.guild.iconURL({ dynamic: true }),
          });

        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`5c14on564firm_warn_remove_${Date.now()}`)
            .setLabel("تــأكــيــد الــشــراء")
            .setStyle(ButtonStyle.Success)
            .setEmoji("<a:yes:1405131777948909599>"),
          new ButtonBuilder()
            .setCustomId("cancel_warn_remove")
            .setLabel("إلــغــاء الــعــمــلــيــة")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("<a:no:1405131885146800148>")
        );

        // عمل update للرسالة الأصلية بدل إرسال رسالة جديدة
        await interaction.editReply({
          content: `${interaction.user}`,
          embeds: [typeEmbed],
          components: [confirmRow],
        });
      });

      messageCollector.on('end', async (collected) => {
        if (collected.size === 0) {
          await interaction.editReply({
            content: "**تــم انــتــهــاء الــوقــت**",
            embeds: [],
            components: []
          });
        }
      });
    }

    if (interaction.isButton() && interaction.customId.startsWith("5c14on564firm_warn_remove_")) {
      const originalMessageContent = interaction.message.content;
      
      // التحقق من وجود عملية شراء نشطة في الملف
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

      const saleState = await SaleState.findOne({
        guildId: interaction.guild.id,
        type: "remove_warnings"
      });

      if (saleState?.state === "disable") {
        return interaction.reply({
          content: "**خــدمــة ازالــة الــتــحــذيــرات مــعــطــلــة حالياً**",
          ephemeral: true
        });
      }

      const setupData = await Setup.findOne({ guildId });
                      const logsData = await Logs.findOne({ guildId: interaction.guild.id }); // جلب بيانات اللوجات

      if (!setupData || !setupData.bank) {
        return interaction.reply({
          content: "**الــرجــاء اخــبــار الادارة بــوضــع صــاحــب الــتــحــويــل مــن امــر\n /setup**",
          ephemeral: true,
        });
      }

      const pricesData = await Prices.findOne({ guildId });
      const shopData = await Shop.findOne({ guildId, channelId: interaction.channel.id });
      
      // الحصول على عدد التحذيرات من الرسالة
      const embedFields = interaction.message.embeds[0]?.fields;
      const warnCountField = embedFields?.find(field => field.name === "عــدد الــتــحــذيــرات");
      const warnCount = warnCountField ? parseInt(warnCountField.value) : 1;
      
      const totalPrice = pricesData.removeWarnPrice * warnCount;
      const taxs = Math.floor((totalPrice * 20) / 19 + 1);
      const bank = setupData.bank;

      // حفظ العملية في الملف
      await addTransaction(guildId, interaction.user.id, interaction.channel.id, "remove-warnings", {
        warnCount,
        totalPrice,
        shopId: shopData._id,
        originalMessageId: interaction.message.id
      });

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

      // عمل update للرسالة الحالية بدل إرسال رسالة جديدة
      await interaction.update({
        content: `${interaction.user}`,
        embeds: [paymentEmbed],
        components: []
      });
      
      const creditMessage = await interaction.followUp({
        content: `**مــعــك 5 دقــائــق للــتــحــويــل**\n\`\`\`#credit ${bank} ${taxs}\`\`\``,
        ephemeral: false,
        fetchReply: true
      });

      const filter = (m) =>
        m.author.bot &&
        (m.content === `**:moneybag: | ${interaction.user.username}, has transferred \`$${totalPrice}\` to <@!${bank}> **` ||
          m.content === `**ـ ${interaction.user.username}, قام بتحويل \`$${totalPrice}\` لـ <@!${bank}> ** |:moneybag:**`);

      const messageCollector = interaction.channel.createMessageCollector({ filter, time: 300000 });

      messageCollector.on("collect", async () => {
        try {
          // التحقق من أن الداتا ما زالت موجودة في server.json
          const transactionCheck = await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id);
          if (!transactionCheck) return;

          messageCollector.stop();
          
          // إزالة المستخدم من الملف
          await removeTransaction(guildId, interaction.user.id, interaction.channel.id);

          const shopData = await Shop.findOne({ guildId, channelId: interaction.channel.id });
          if (!shopData) return;

          const newWarns = Math.max(0, shopData.warns - warnCount);
          await Shop.updateOne(
            { guildId, channelId: interaction.channel.id },
            { $set: { warns: newWarns } }
          );
            
          const remainingWarns = shopData.maxWarns - newWarns;

          let emb = new EmbedBuilder()
            .setTitle("تــم إزالــة تــحــذيــر مــن الــمــتــجــر")
            .addFields([
              {
                name: "**الــمــتــجــر :**",
                value: `<#${interaction.channel.id}>`,
                inline: true,
              },
              {
                name: "**ســبـــب الإزالــة :**",
                value: `**دفــع ســعــر الــتــحــذيــرات**`,
                inline: true,
              },
              {
                name: "**عــدد تـحـذيـرات الـمـزالـة :**",
                value: `**${warnCount}**`,
                inline: true,
              },
              {
                name: "**عــدد تــحــذيـرات الــمـتــجــر الــحــالي :**",
                value: `**${newWarns}**`,
                inline: true,
              },
              {
                name: "**الــتــحـذيــرات الــمــتــبــقــيــة :**",
                value: `**(${newWarns}/${shopData.maxWarns})**`,
                inline: true,
              },
              {
                name: "**الــوقــت :**",
                value: `**<t:${Math.floor(Date.now() / 1000)}:R>**`,
                inline: true,
              },
            ])
            .setAuthor({
              name: interaction.guild.name,
              iconURL: interaction.guild.iconURL({ dynamic: true }),
            })
            .setImage(setupData.line)
            .setFooter({ 
              text: "Dev By Hox Devs", 
              iconURL: interaction.guild.iconURL() 
            });

          await interaction.channel.send({ content: `<@${shopData.ownerId}>`, embeds: [emb] });

        if (logsData && logsData.shopLogRoom) {
                const logChannel = await client.channels.fetch(logsData.shopLogRoom);
            if (logChannel) {
              const logEmbed = new EmbedBuilder()
                .setTitle("لــوق إزالــة تــحــذيــرات (تــلــقــائــي)")
                .addFields(
                  { name: "الــمــتــجــر", value: `<#${interaction.channel.id}>`, inline: true },
                  { name: "الــمــســؤؤل", value: `<@${interaction.user.id}>`, inline: true },
                  { name: "عــدد الــتــحــذيــرات الــمــزالــة", value: `${warnCount}`, inline: true },
                  { name: "الــتــحــذيــرات الــمــتــبــقــيــة", value: `${remainingWarns}`, inline: true },
                )
                .setTimestamp();

              await logChannel.send({ embeds: [logEmbed] });
            }
          }
        } catch (error) {
          console.error(error);
          // إزالة المستخدم من الملف في حالة الخطأ
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

    // === إلغاء شراء إزالة التحذيرات ===
    if (interaction.isButton() && interaction.customId === "cancel_warn_remove") { 
      const originalMessageContent = interaction.message.content;
      
      // البحث عن المذكرين في الرسالة
      const mentionedUsers = interaction.message.mentions.users;
      
      // التحقق من أن المستخدم الذي ضغط على الزر هو المذكور في الرسالة
      if (mentionedUsers.size === 0 || !mentionedUsers.has(interaction.user.id)) {
        return interaction.reply({
          content: "**شــو دخــلــك بــ الــشــراء\nيــلا انــقــلــع**",
          ephemeral: true
        });
      }     

      // إزالة المستخدم من الملف
      await removeTransaction(guildId, interaction.user.id, interaction.channel.id);

      // تحديث رسالة التفاعل الأصلية
      await interaction.update({
        content: "**تــم إلــغــاء عــمــلــيــة ازالــة الــتــحــذيــرات**",
        embeds: [],
        components: []
      });
    }

    // === زر الإلغاء الطارئ (astacancel) ===
    if (interaction.customId === "astacancel-remove-warn") {
      // حذف الداتا من الملف
      await removeTransaction(guildId, interaction.user.id, interaction.channel.id);

      // الرد للمستخدم
      await interaction.update({
        content: "**تــم حــل مــشــكــلــتــك بــنــجــاح**",
        components: [] // يشيل الأزرار
      });
    }
  },
};