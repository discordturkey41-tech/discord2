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

    // === زر شراء المنشنات ===
    if (interaction.isButton() && interaction.customId === "1mentions-buy") {
      // التحقق من وجود عملية شراء (دون حفظ داتا لسه)
      if (await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id)) {
        const cancelButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('astacancel-buy-mentions')
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
      if (!shopData) {
        return interaction.reply({
          content: "❌ هـذه الـروم لـيست مـتـجـر",
          ephemeral: true
        });
      }

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
          type: "buy_mentions"
      });

      if (saleState?.state === "disable") {
          return interaction.reply({
              content: "**خــدمــة شــراء مــنــشــنــات مــعــطــلــة حالياً**",
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
        .setTitle("شــراء مــنــشــنــات لــلــمــتــجــر")
        .setDescription("**<a:hox_star_pink:1326824571130613771> اخــتــر نــوع الــمــنــشــن الــذي تــريــد شــراءه <a:hox_star_purble:1326824672817319969>**")
        .setFooter({
          text: "Dev By Hox Devs",
          iconURL: interaction.guild.iconURL({ dynamic: true })
        });

      const shopMentionRoleId = setupData?.shopMention;
      const shopMentionRole = shopMentionRoleId ? interaction.guild.roles.cache.get(shopMentionRoleId) : null;

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("333buyyyy_everyone_mention")
          .setLabel("Everyone")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("333buyyyy_here_mention")
          .setLabel("Here")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("333buyyyy_shop_mention")
          .setLabel(shopMentionRole ? shopMentionRole.name : "منشن المتجر")
          .setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
      });
    }

    // === عند اختيار نوع المنشن ===
    if (interaction.isButton() && interaction.customId.startsWith("333buyyyy_") && interaction.customId.endsWith("_mention")) {
      // التحقق مرة أخرى قبل السماح باختيار النوع
      if (await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id)) {
        const cancelButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('astacancel-buy-mentions')
            .setLabel('الــغــاء')
            .setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({
          ephemeral: true,
          content: `**عــنــدك عــمــلــيــه شــراء\n-# لو عــنــدك مــشــكــلــة اســتــعــمــل زر الــغــاء ســوف يــتــم حــل جــمــيــع مــشــاكــلــك**`,
          components: [cancelButton],
        });
      }

      const mentionType = interaction.customId.replace("333buyyyy_", "").replace("_mention", "");
      const saleState = await SaleState.findOne({
          guildId: interaction.guild.id,
          type: "buy_mentions"
      });

      if (saleState?.state === "disable") {
          return interaction.reply({
              content: "**خــدمــة شــراء مــنــشــنــات مــعــطــلــة حالياً**",
              ephemeral: true
          });
      }

      let validMentionType;
      switch(mentionType) {
        case "Everyone": validMentionType = "everyone"; break;
        case "Here": validMentionType = "here"; break;
        case "Shop": validMentionType = "shop"; break;
        default: validMentionType = mentionType.toLowerCase();
      }

      const setupData = await Setup.findOne({ guildId });
      const pricesData = await Prices.findOne({ guildId });
      
      const shopData = await Shop.findOne({ guildId, channelId: interaction.channel.id });
      if (!shopData) {
        return interaction.reply({ content: "❌ هـذه الـروم لـيست مـتـجـر", ephemeral: true });
      }

      await interaction.reply({
        content: `**الــرجــاء كــتــابــت عــدد الــمــنــشــنــات الــتــي تــريــدهــا لــ @${mentionType}**`,
        ephemeral: true,
      });

      const filter = (m) => m.author.id === interaction.user.id;
      const messageCollector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

      messageCollector.on("collect", async (msg) => {
        const count = parseInt(msg.content);

        if (isNaN(count) || count <= 0) {
          await interaction.followUp({ content: "❌ يــجــب إدخــال رقــم صــحــيــح واكــبــر مــن صــفــر", ephemeral: true });
          return;
        }

        if (count > 1000) {
          await interaction.followUp({ content: "❌ لا يــمــكــن شــراء اكــثــر مــن 1000 مــنــشــن فــي الــمــرة الــواحــدة", ephemeral: true });
          return;
        }

        let pricePerMention = 0;
        switch (validMentionType) {
          case "everyone":
            pricePerMention = pricesData?.everyonePrice || 0;
            break;
          case "here":
            pricePerMention = pricesData?.herePrice || 0;
            break;
          case "shop":
            pricePerMention = pricesData?.shopMentionPrice || 0;
            break;
        }

        if (pricePerMention <= 0) {
          await interaction.followUp({
            content: "❌ ســعــر الــمــنــشــن غــيــر مــحــدد! الــرجــاء اخــبــار الادارة",
            ephemeral: true
          });
          return;
        }

        const totalPrice = pricePerMention * count;

        const typeEmbed = new EmbedBuilder()
          .setTitle("تــفــاصــيــل شــراء الــمــنــشــنــات")
          .setImage(setupData?.line || null)
          .addFields(
            { name: "نــوع الــمــنــشــن", value: `@${mentionType}`, inline: true },
            { name: "الــعــدد", value: `${count}`, inline: true },
            { name: "الــمــتــجــر", value: `<#${interaction.channel.id}>`, inline: true }
          )
          .setFooter({
            text: "Dev By Hox Devs",
            iconURL: interaction.guild.iconURL({ dynamic: true }),
          });

        // زر التأكيد يحتوي الآن على المعلومات اللازمة في الـ CustomId أو سنعتمد على تخزين مؤقت ولكن الطلب ينص على الحفظ في confirm فقط
        // سنقوم بتمرير العدد والسعر في الـ CustomId أو يمكننا حفظها مؤقتاً ولكن بما أن الطلب منع الـ Maps
        // سأقوم بتشفير العدد في الـ CustomId لتجنب الـ Maps تماماً قبل التأكيد.
        // ملاحظة: الـ CustomId محدود بـ 100 حرف.
        // Format: c4onfi6mmm45_mention_{TYPE}_{COUNT}
        
        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`c4onfi6mmm45_mention_${validMentionType}_${count}`)
            .setLabel("تــأكــيــد الــشــراء")
            .setStyle(ButtonStyle.Success)
            .setEmoji("<a:yes:1405131777948909599>"),
          new ButtonBuilder()
            .setCustomId("cancel_mention_purchase")
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
      });

      messageCollector.on("end", async (collected) => {
        if (collected.size === 0) {
          await interaction.followUp({ content: "انــتــهــى الــوقــت لادخــال الــعــدد", ephemeral: true });
        }
      });
    }

    // === عند تأكيد شراء المنشنات ===
    if (interaction.isButton() && interaction.customId.startsWith("c4onfi6mmm45_mention_")) {
      // التحقق من الداتا (لمنع التكرار)
      if (await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id)) {
        const cancelButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('astacancel-buy-mentions')
            .setLabel('الــغــاء')
            .setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({
          ephemeral: true,
          content: `**عــنــدك عــمــلــيــه شــراء\n-# لو عــنــدك مــشــكــلــة اســتــعــمــل زر الــغــاء ســوف يــتــم حــل جــمــيــع مــشــاكــلــك**`,
          components: [cancelButton],
        });
      }

      // استخراج البيانات من الـ ID
      const parts = interaction.customId.split("_");
      // parts[0] = c4onfi6mmm45
      // parts[1] = mention
      // parts[2] = TYPE
      // parts[3] = COUNT
      const mentionType = parts[2];
      const count = parseInt(parts[3]);

      const mentionedUsers = interaction.message.mentions.users;
      if (mentionedUsers.size === 0 || !mentionedUsers.has(interaction.user.id)) {
        return interaction.reply({
          content: "**شــو دخــلــك بــ الــشــراء\nيــلا انــقــلــع**",
          ephemeral: true
        });
      }

      const setupData = await Setup.findOne({ guildId });
      const pricesData = await Prices.findOne({ guildId });
                      const logChannel = await client.channels.fetch(logsData.shopLogRoom);

      if (!setupData || !setupData.bank) {
        return interaction.reply({
          content: "**الــرجــاء اخــبــار الادارة بــوضــع صــاحــب الــتــحــويــل مــن امــر\n /setup**",
          ephemeral: true,
        });
      }

      // حساب السعر
      let pricePerMention = 0;
      switch (mentionType) {
        case "everyone": pricePerMention = pricesData?.everyonePrice || 0; break;
        case "here": pricePerMention = pricesData?.herePrice || 0; break;
        case "shop": pricePerMention = pricesData?.shopMentionPrice || 0; break;
      }
      const price = pricePerMention * count;

      // === إضافة الداتا لملف server.json هنا فقط ===
      await addTransaction(guildId, interaction.user.id, interaction.channel.id, "buy-mentions", { 
        count: count, 
        mentionType: mentionType, 
        price: price 
      });

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
          // التحقق من أن الداتا ما زالت موجودة في server.json
          // إذا لم تكن موجودة، يعني أنه تم إلغاء العملية
          const transactionData = await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id);
          if (!transactionData) return;

          messageCollector.stop();
          
          // حذف الداتا
          await removeTransaction(guildId, interaction.user.id, interaction.channel.id);

          const shopData = await Shop.findOne({ guildId, channelId: interaction.channel.id });
          if (!shopData) return;

          switch (mentionType) {
            case "everyone":
              await Shop.updateOne({ guildId, channelId: interaction.channel.id }, { $inc: { everyone: count } });
              break;
            case "here":
              await Shop.updateOne({ guildId, channelId: interaction.channel.id }, { $inc: { here: count } });
              break;
            case "shop":
              await Shop.updateOne({ guildId, channelId: interaction.channel.id }, { $inc: { shop: count } });
              break;
          }

          const embed = new EmbedBuilder()
            .setTitle("**تــم شــراء الــمــنــشــنــات بــنــجــاح**")
            .setImage(setupData.line)
            .addFields(
              { name: "نــوع الــمــنــشــن", value: `@${mentionType}`, inline: true },
              { name: "الــعــدد", value: `${count}`, inline: true },
              { name: "الــمــتــجــر", value: `<#${interaction.channel.id}>`, inline: true },
            )
            .setFooter({
              text: "Dev By Hox Devs",
              iconURL: interaction.guild.iconURL({ dynamic: true })
            });

          await interaction.followUp({
            content: `**تــم شــراء ${count} مــنــشــن @${mentionType} لــلــمــتــجــر <#${interaction.channel.id}> بــنــجــاح**`,
            ephemeral: true
          });

          await interaction.channel.send({
            content: `<@${shopData.ownerId}>`,
            embeds: [embed]
          });

          try {
            const owner = await client.users.fetch(shopData.ownerId);
            await owner.send({
              content: `**تــم شــراء ${count} مــنــشــن @${mentionType} لــمــتــجــرك <#${interaction.channel.id}>**`,
              embeds: [embed]
            });
          } catch (err) {
            console.log("فشل في إرسال رسالة خاصة للمالك");
          }

        if (logsData && logsData.shopLogRoom) {
                const logChannel = await client.channels.fetch(logsData.shopLogRoom);
            if (logChannel) {
              const logEmbed = new EmbedBuilder()
                .setTitle("شــراء مــنــشــنــات")
                .addFields(
                  { name: "نــوع الــمــنــشــن", value: `@${mentionType}`, inline: true },
                  { name: "الــعــدد", value: `${count}`, inline: true },
                  { name: "الــمــتــجــر", value: `<#${interaction.channel.id}>`, inline: true },
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

    // === إلغاء شراء المنشنات ===
    if (interaction.isButton() && interaction.customId === "cancel_mention_purchase") {
      const mentionedUsers = interaction.message.mentions.users;
      if (mentionedUsers.size === 0 || !mentionedUsers.has(interaction.user.id)) {
        return interaction.reply({
          content: "**شــو دخــلــك بــ الــشــراء\nيــلا انــقــلــع**",
          ephemeral: true
        });
      }     

      // حذف الداتا
      await removeTransaction(guildId, interaction.user.id, interaction.channel.id);

      await interaction.update({
        content: "**تــم إلــغــاء عــمــلــيــة شــراء الــمــنــشــنــات**",
        embeds: [],
        components: []
      });
    }
    
    // === زر الإلغاء الطارئ ===
    if (interaction.isButton() && interaction.customId === "astacancel-buy-mentions") {
      // حذف الداتا
      await removeTransaction(guildId, interaction.user.id, interaction.channel.id);

      await interaction.update({
        content: "**تــم حــل مــشــكــلــتــك بــنــجــاح**",
        components: []
      });
    }
  }
};