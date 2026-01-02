const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Setup = require("../../Mangodb/setup.js");
const Shop = require("../../Mangodb/shop.js");
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

    const guildId = interaction.guild.id;

    // === زر change-type ===
    if (interaction.isButton() && interaction.customId === "change-type") {
      // التحقق من وجود عملية (بدون حفظ)
      if (await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id)) {
        const cancelButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('astacancel-change-type')
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
      const owner = shopData1.ownerId;
      const partners = shopData1.partners;

      if (interaction.user.id !== owner && (!partners || !partners.includes(interaction.user.id))) {
        return interaction.reply({
          content: "**انــت مــالــك بــ الــمــتــجــر\n يــلا روح اشــحــت بــعــيــد**",
          ephemeral: true 
        });
      }

      const saleState = await SaleState.findOne({
          guildId: interaction.guild.id,
          type: "change_shop_type"
      });

      if (saleState?.state === "disable") {
          return interaction.reply({
              content: "**خــدمــة تــغــيــيــر نــوع الــمــتــجــر مــعــطــلــة حالياً**",
              ephemeral: true
          });
      }

      const setupData = await Setup.findOne({ guildId });
      
      const availableTypes = await Types.find({ guildId });
      const currentType = await Types.findOne({ guildId, name: shopData1.type });
      
      if (!currentType) {
        return interaction.reply({
          content: "❌ نوع المتجر الحالي غير معروف",
          ephemeral: true
        });
      }

      const shopTypeState = await SaleState.findOne({
          guildId: interaction.guild.id,
          type: "shop_type"
      });

      const filteredTypes = availableTypes.filter(type => {
        if (type.name === currentType.name) return false;
        if (type.price <= currentType.price) return false;
        if (shopTypeState?.disabledTypes?.includes(type.name)) return false;
        return true;
      });

      if (filteredTypes.length === 0) {
        return interaction.reply({
          content: "**انــت اعــلــى نــوع اصــلا هــتــغــيــر لــ ايــه؟؟؟؟؟؟**",
          ephemeral: true
        });
      }

      const sortedTypes = filteredTypes.sort((a, b) => b.price - a.price);
      const rows = [];

      sortedTypes.forEach((type, index) => {
        const row = new ActionRowBuilder();
        
        const button = new ButtonBuilder()
          .setCustomId(`select_type_${type.name}`)
          .setLabel(`${type.name}`)
          .setStyle(ButtonStyle.Secondary)
          .setEmoji(type.emoji || "🛒");

        row.addComponents(button);
        rows.push(row);
      });

      const embed = new EmbedBuilder()
        .setAuthor({
          name: interaction.guild.name,
          iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setImage(setupData?.line || null)
        .setTitle("اخــتــيــار نــوع جــديــد لــلــمــتــجــر")
        .setDescription(`**<a:hox_star_pink:1326824571130613771> الــرجــاء اخــتــيــار الــنــوع مــن الانــواع الــمــوجــود فــي الاســفــل <a:hox_star_purble:1326824672817319969>**`)
        .setFooter({
          text: "Dev By Hox Devs",
          iconURL: interaction.guild.iconURL({ dynamic: true })
        });

      return interaction.reply({
        embeds: [embed],
        components: rows,
        ephemeral: true
      });
    }

    // === عند اختيار نوع جديد ===
    if (interaction.isButton() && interaction.customId.startsWith("select_type_")) {
      const newTypeName = interaction.customId.replace("select_type_", "");
      
      // التحقق من وجود عملية (بدون حفظ)
      if (await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id)) {
        const cancelButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('astacancel-change-type')
            .setLabel('الــغــاء')
            .setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({
          ephemeral: true,
          content: `**عــنــدك عــمــلــيــه شــراء\n-# لو عــنــدك مــشــكــلــة اســتــعــمــل زر الــغــاء ســوف يــتــم حــل جــمــيــع مــشــاكــلــك**`,
          components: [cancelButton],
        });
      }

      const setupData = await Setup.findOne({ guildId });
      const allTypes = await Types.find({ guildId });
      
      const saleState = await SaleState.findOne({
          guildId: interaction.guild.id,
          type: "change_shop_type"
      });

      if (saleState?.state === "disable") {
          return interaction.reply({
              content: "**خــدمــة تــغــيــيــر نــوع الــمــتــجــر مــعــطــلــة حالياً**",
              ephemeral: true
          });
      }

      const shopTypeState = await SaleState.findOne({
          guildId: interaction.guild.id,
          type: "shop_type"
      });

      if (shopTypeState?.disabledTypes?.includes(newTypeName)) {
          return interaction.reply({
              content: `**نــوع الــمــتــجــر \`${newTypeName}\` مــعــطــل حالياً**`,
              ephemeral: true
          });
      }

      const shopData = await Shop.findOne({ guildId, channelId: interaction.channel.id });
      if (!shopData) {
        return interaction.reply({ content: "❌ هـذه الـروم لـيست مـتـجـر", ephemeral: true });
      }

      const currentType = await Types.findOne({ guildId, name: shopData.type });
      const newType = await Types.findOne({ guildId, name: newTypeName });
      
      if (!currentType || !newType) {
        return interaction.reply({ content: "❌ حدث خطأ في تحديد نوع المتجر", ephemeral: true });
      }

      const typeEmbed = new EmbedBuilder()
        .setTitle("تــفــاصــيــل تــغــيــيــر نــوع الــمــتــجــر")
        .setAuthor({
          name: interaction.guild.name,
          iconURL: interaction.guild.iconURL({ dynamic: true }),
        })
        .setImage(setupData.line)
        .addFields(
          { name: "الــنــوع الــحــالــي", value: `${currentType.name} ${currentType.emoji || ""}`, inline: true },
          { name: "الــنــوع الــجــديــد", value: `${newType.name} ${newType.emoji || ""}`, inline: true },
          { name: "الــمــتــجــر", value: `<#${interaction.channel.id}>`, inline: true }
        )
        .setFooter({
          text: "Dev By Hox Devs",
          iconURL: interaction.guild.iconURL({ dynamic: true }),
        });

      // تمرير النوع الجديد عبر ID الزر
      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`3736con74irm_ty4pe_c5hange_${newTypeName}`)
          .setLabel("تــأكــيــد الــشــراء")
          .setStyle(ButtonStyle.Success)
          .setEmoji("<a:yes:1405131777948909599>"),
        new ButtonBuilder()
          .setCustomId("cancel_type_purchase")
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

    // === عند تأكيد تغيير النوع ===
    if (interaction.isButton() && interaction.customId.startsWith("3736con74irm_ty4pe_c5hange_")) {
      const newTypeName = interaction.customId.replace("3736con74irm_ty4pe_c5hange_", "");
      
      // التحقق قبل الحفظ
      if (await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id)) {
        const cancelButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('astacancel-change-type')
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
      
      const shopTypeState = await SaleState.findOne({
          guildId: interaction.guild.id,
          type: "shop_type"
      });

      if (shopTypeState?.disabledTypes?.includes(newTypeName)) {
          return interaction.reply({
              content: `**نــوع الــمــتــجــر \`${newTypeName}\` مــعــطــل حالياً**`,
              ephemeral: true
          });
      }
              const logsData = await Logs.findOne({ guildId: interaction.guild.id }); // جلب بيانات اللوجات

      const setupData = await Setup.findOne({ guildId });
      if (!setupData || !setupData.bank) {
        return interaction.reply({
          content: "**الــرجــاء اخــبــار الادارة بــوضــع صــاحــب الــتــحــويــل مــن امــر\n /setup**",
          ephemeral: true,
        });
      }

      const shopData = await Shop.findOne({ guildId, channelId: interaction.channel.id });
      const currentType = await Types.findOne({ guildId, name: shopData.type });
      const newType = await Types.findOne({ guildId, name: newTypeName });
      const priceDifference = newType.price - currentType.price;

      // === حفظ الداتا في server.json الآن فقط ===
      await addTransaction(guildId, interaction.user.id, interaction.channel.id, "shop-type-change", { newType: newTypeName, price: priceDifference });

      const taxs = Math.floor((priceDifference * 20) / 19 + 1);
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
        (m.content === `**:moneybag: | ${interaction.user.username}, has transferred \`$${priceDifference}\` to <@!${bank}> **` ||
          m.content === `**ـ ${interaction.user.username}, قام بتحويل \`$${priceDifference}\` لـ <@!${bank}> ** |:moneybag:**`);

      const messageCollector = interaction.channel.createMessageCollector({ filter, time: 300000 });

      messageCollector.on("collect", async () => {
        try {
          const transactionData = await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id);
          if (!transactionData) return;

          messageCollector.stop();
          await removeTransaction(guildId, interaction.user.id, interaction.channel.id);

          const shopData = await Shop.findOne({ guildId, channelId: interaction.channel.id });
          if (!shopData) return;

          // ... (Logic to update shop type) ...
          // إزالة جميع الصلاحيات الحالية
          const overwrites = interaction.channel.permissionOverwrites.cache;
          for (const overwrite of overwrites.values()) {
            await overwrite.delete();
          }

          // إضافة الصلاحيات الجديدة
          await interaction.channel.permissionOverwrites.create(shopData.ownerId, {
            ViewChannel: true,
            SendMessages: true,
            MentionEveryone: true,
            EmbedLinks: true,
            AttachFiles: true
          });

          if (setupData.shopAdmin) {
            await interaction.channel.permissionOverwrites.create(setupData.shopAdmin, {
              ViewChannel: true,
              SendMessages: true
            });
          }

          await interaction.channel.permissionOverwrites.create(interaction.guild.roles.everyone, {
            ViewChannel: true,
            SendMessages: false
          });

          // تحديث صلاحيات الشركاء
          for (const partnerId of shopData.partners) {
            await interaction.channel.permissionOverwrites.create(partnerId, {
              ViewChannel: true,
              SendMessages: true
            });
          }

          const newChannelName = `${newType.shape}︲${interaction.channel.name.split('︲')[1] || interaction.channel.name}`;
          await interaction.channel.edit({
            name: newChannelName,
            parent: newType.category
          });

          // تحديث بيانات المتجر
          await Shop.updateOne(
            { guildId: interaction.guild.id, channelId: interaction.channel.id },
            {
              $set: {
                type: newType.name,
                maxWarns: newType.maxWarns,
                emoji: newType.emoji || "",
                role: newType.role,
                everyone: newType.everyoneMention ?? 0,
                here: newType.hereMention ?? 0,
                shop: newType.shopMention ?? 0,
                shape: newType.shape,
                tax: newType.tax ?? 0
              }
            }
          );

          // تحديث رتبة البائع
          const seller = await interaction.guild.members.fetch(shopData.ownerId);
          if (currentType.role) {
            await seller.roles.remove(currentType.role);
          }
          if (newType.role) {
            await seller.roles.add(newType.role);
          }

          const embed = new EmbedBuilder()
            .setTitle("**تــم تــغــيــيــر نــوع الــمــتــجــر**")
            .setAuthor({
              name: interaction.guild.name,
              iconURL: interaction.guild.iconURL({ dynamic: true }),
            })
            .setImage(setupData.line)
            .addFields(
              { name: "الــمــتــجــر", value: `<#${interaction.channel.id}>`, inline: true },
              { name: "صــاحــب الــمــتــجــر", value: `<@${shopData.ownerId}>`, inline: true },
              { name: "الــوقــت", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
              { name: "الــنــوع الــقــديــم", value: currentType.role ? `<@&${currentType.role}>` : currentType.name, inline: true },
              { name: "الــنــوع الــجــديــد", value: newType.role ? `<@&${newType.role}>` : newType.name, inline: true },
            )
            .setFooter({
              text: "Dev By Hox Devs",
              iconURL: interaction.guild.iconURL({ dynamic: true })
            });

          await interaction.followUp({
            content: `**تــم تــغــيــيــر نــوع الــمــتــجــر <#${interaction.channel.id}> إلــى ${newType.name} بــنــجــاح**`,
            ephemeral: true
          });

          await interaction.channel.send({
            content: `<@${shopData.ownerId}>`,
            embeds: [embed]
          });

          try {
            const owner = await client.users.fetch(shopData.ownerId);
            await owner.send({
              content: `**تــم تــغــيــيــر نــوع مــتــجــرك <#${interaction.channel.id}>**`,
              embeds: [embed]
            });
          } catch (err) {
            console.log("فشل في إرسال رسالة خاصة للمالك");
          }
        if (logsData && logsData.shopLogRoom) {
                const logChannel = await client.channels.fetch(logsData.shopLogRoom);
            if (logChannel) {
              const logEmbed = new EmbedBuilder()
                .setTitle("تــغــيــيــر نــوع مــتــجــر")
                .addFields(
                  { name: "الــمــتــجــر", value: `<#${interaction.channel.id}>`, inline: true },
                  { name: "الــنــوع الــقــديــم", value: currentType.role ? `<@&${currentType.role}>` : currentType.name, inline: true },
                  { name: "الــنــوع الــجــديــد", value: newType.role ? `<@&${newType.role}>` : newType.name, inline: true },
                  { name: "الــمــســؤول", value: `<@${interaction.user.id}>`, inline: true },
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

    // === إلغاء عملية تغيير النوع ===
    if (interaction.isButton() && (interaction.customId === "cancel_type_change" || interaction.customId === "cancel_type_purchase")) {
      const mentionedUsers = interaction.message.mentions.users;
      if (mentionedUsers.size === 0 || !mentionedUsers.has(interaction.user.id)) {
        return interaction.reply({
          content: "**شــو دخــلــك بــ الــشــراء\nيــلا انــقــلــع**",
          ephemeral: true
        });
      }     

      await removeTransaction(guildId, interaction.user.id, interaction.channel.id);

      await interaction.update({
        content: "**تــم إلــغــاء عــمــلــيــة تــغــيــيــر نــوع الــمــتــجــر**",
        embeds: [],
        components: []
      });
    }

    // === زر إلغاء جميع المشاكل ===
    if (interaction.customId === "astacancel-change-type") {
      await removeTransaction(guildId, interaction.user.id, interaction.channel.id);
      await interaction.update({
        content: "**تــم حــل مــشــكــلــتــك بــنــجــاح**",
        components: []
      });
    }
  }
};