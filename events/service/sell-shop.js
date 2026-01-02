const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  PermissionsBitField
} = require("discord.js");
const Setup = require("../../Mangodb/setup.js");
const Shop = require("../../Mangodb/shop.js");
const SaleState = require('../../Mangodb/saleState.js');
const Logs = require("../../Mangodb/logs.js");
const {
  getActiveTransaction,
  addTransaction,
  removeTransaction
} = require("../../functions/serverDataManager.js");

// Map فقط للـ Collectors الخاصة بالمدخلات
const inputCollectors = new Map();

// دالة لتحويل التنسيقات المختلفة للأرقام
function parseNumberFormat(input) {
  if (!input || typeof input !== 'string') return null;
  
  const trimmed = input.trim().toLowerCase();
  
  // إزالة أي أحرف غير رقمية في البداية والنهاية
  const cleanInput = trimmed.replace(/[^\d.kKmM]/g, '');
  
  // محاولة التحقق من الصيغ المختلفة
  if (cleanInput.includes('k')) {
    const num = parseFloat(cleanInput.replace('k', ''));
    if (!isNaN(num)) return Math.floor(num * 1000);
  }
  
  if (cleanInput.includes('m')) {
    const num = parseFloat(cleanInput.replace('m', ''));
    if (!isNaN(num)) return Math.floor(num * 1000000);
  }
  
  // محاولة الحصول على أرقام فقط
  const numbersOnly = cleanInput.replace(/[^\d.]/g, '');
  const num = parseFloat(numbersOnly);
  
  return !isNaN(num) ? Math.floor(num) : null;
}

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(client, interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.guild) return;
    const guildId = interaction.guild.id;

    if (interaction.isButton() && interaction.customId === "sell-shop-btn") {
      await interaction.deferUpdate();
      
      const shopData = await Shop.findOne({ guildId, channelId: interaction.channel.id });
      const owner = shopData.ownerId;

      if (interaction.user.id !== owner) return interaction.followUp({ content: "**انــت مــالــك بــ الــمــتــجــر**", ephemeral: true });

      if (await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id)) {
        const cancelButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('astacancel-sell-shop').setLabel('الــغــاء').setStyle(ButtonStyle.Danger)
        );
        return interaction.followUp({ content: `**عــنــدك عــمــلــيــه شــراء**`, components: [cancelButton], ephemeral: true });
      }

      await interaction.followUp({ 
        content: "**مــعــاك دقــيــقــة عــشــان تــمــنــشــن الــمــشــتــري**\n\n**⚠️ مــلــحــوظــة:** يــمــكــنــك ايــضــاً كــتــابــة الآيــدي عــادي بـدون مــنــشــن**",
        ephemeral: true 
      });

      const filter = m => m.author.id === interaction.user.id;
      const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });
      inputCollectors.set(interaction.user.id, collector);

      collector.on('collect', async (m) => {
        let buyerId;
        if (m.mentions.users.size > 0) {
          buyerId = m.mentions.users.first().id;
        } else if (/^\d{17,19}$/.test(m.content)) {
          buyerId = m.content.trim();
        } else {
          // محاولة استخراج الآيدي من النص
          const match = m.content.match(/\d{17,19}/);
          buyerId = match ? match[0] : null;
        }

        if (!buyerId || buyerId === interaction.user.id) {
          return interaction.followUp({ 
            content: "**❌ خــطــأ فــي آيــدي الــمــشــتــري**\nيــرجــى تــأكــيــد الآيــدي أو الــمــنــشــن", 
            ephemeral: true 
          });
        }

        // تحقق إذا كان الآيدي تابع لبوت
        try {
          const buyerUser = await client.users.fetch(buyerId);
          if (buyerUser.bot) {
            return interaction.followUp({ 
              content: "**❌ لا يــمــكــن بــيــع الــمــتــجــر لــبــوت**", 
              ephemeral: true 
            });
          }
        } catch (error) {
          return interaction.followUp({ 
            content: "**❌ لــم يــتــم الــعــثــور عــلــى الــمــشــتــري**", 
            ephemeral: true 
          });
        }

        await interaction.followUp({ 
          content: "**✏️ حــط ســعــر الــمــتــجــر**\n\n**📌 يــمــكــنــك كــتــابــة الــســعــر بـ:**\n• **ارقــام عــاديــة:** `5000`\n• **بــالــالــف:** `5k` او `5K`\n• **بــالــمــلــيــون:** `2m` او `2M`", 
          ephemeral: true 
        });
        
        const priceCollector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });
        inputCollectors.set(interaction.user.id + "_price", priceCollector);

        priceCollector.on('collect', async (priceMsg) => {
          // استخدام الدالة الجديدة لتحويل السعر
          const price = parseNumberFormat(priceMsg.content);
          
          if (!price || price <= 0 || price > 1000000000) {
            return interaction.followUp({ 
              content: "**❌ ســعــر غــيــر صــحــيــح**\nيــرجــى إدخــال ســعــر صــحــيــح\n\n**أمــثــلــة:** `5000`, `5k`, `2.5k`, `1m`", 
              ephemeral: true 
            });
          }

          await processShopSale(client, interaction, buyerId, price);
        });
        
        priceCollector.on('end', (collected) => {
          if (collected.size === 0) {
            interaction.followUp({ 
              content: "**⏰ انــتــهــى الــوقــت لإدخــال الــســعــر**", 
              ephemeral: true 
            });
          }
        });
      });
      
      collector.on('end', (collected) => {
        if (collected.size === 0) {
          interaction.followUp({ 
            content: "**⏰ انــتــهــى الــوقــت لإدخــال الــمــشــتــري**", 
            ephemeral: true 
          });
        }
      });
    }

    if (interaction.isButton() && interaction.customId.startsWith("53c3o673nfi2r1m_")) {
      await interaction.deferUpdate();
      const [_, sellerId, buyerId, priceStr] = interaction.customId.split("_");
      const price = parseInt(priceStr);
      
      if (interaction.user.id !== buyerId) return interaction.followUp({ content: "**شــو دخــلــك**", ephemeral: true });
      
      if (await getActiveTransaction(guildId, interaction.user.id, interaction.channel.id)) {
         const cancelButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('astacancel-sell-shop').setLabel('الــغــاء').setStyle(ButtonStyle.Danger)
        );
        return interaction.followUp({ content: `**عــنــدك عــمــلــيــه شــراء**`, components: [cancelButton], ephemeral: true });
      }

      await processPayment(client, interaction, buyerId, sellerId, price);
    }

    if (interaction.isButton() && interaction.customId === "cancel_sell_shop") {
      const mentionedUsers = interaction.message.mentions.users;
      if (mentionedUsers.size === 0 || !mentionedUsers.has(interaction.user.id)) return interaction.reply({ content: "**شــو دخــلــك**", ephemeral: true });
      
      await removeTransaction(guildId, interaction.user.id, interaction.channel.id);
      await interaction.reply({ content: "**تــم إلــغــاء الــعــمــلــيــة**", ephemeral: true, embeds: [], components: [] });
    }

    if (interaction.customId === "astacancel-sell-shop") {
      await removeTransaction(guildId, interaction.user.id, interaction.channel.id);
      await interaction.update({ 
        content: "**تــم حــل مــشــكــلــتــك بــنــجــاح**", 
        components: [] 
      });
    }

    async function processShopSale(client, interaction, buyerId, price) {
       const setupData = await Setup.findOne({ guildId: interaction.guild.id });
       
       // تنسيق السعر للعرض
       let formattedPrice = price.toLocaleString();
       if (price >= 1000000) {
         formattedPrice = `${(price / 1000000).toFixed(1)}M`;
       } else if (price >= 1000) {
         formattedPrice = `${(price / 1000).toFixed(1)}K`;
       }
       
       const typeEmbed = new EmbedBuilder()
        .setTitle("تــفــاصــيــل بــيــع الــمــتــجــر")
        .setAuthor({
          name: interaction.guild.name,
          iconURL: interaction.guild.iconURL({ dynamic: true }),
        })
        .setImage(setupData.line)
        .addFields(
          { name: "🛒 الــمــشــتــري", value: `<@${buyerId}>`, inline: true },
          { name: "👤 الــبــائــع", value: `<@${interaction.user.id}>`, inline: true },
          { name: "🏪 الــمــتــجــر", value: `<#${interaction.channel.id}>`, inline: true },
          { name: "💰 ســعــر الــبــيــع", value: `${price.toLocaleString()} 🪙\n(${formattedPrice})`, inline: false }
        )
        .setFooter({ 
          text: "Dev By Hox Devs", 
          iconURL: interaction.guild.iconURL({ dynamic: true }) 
        });

      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`53c3o673nfi2r1m_${interaction.user.id}_${buyerId}_${price}`)
          .setLabel("تــأكــيــد الــبــيــع")
          .setStyle(ButtonStyle.Success)
          .setEmoji("<a:yes:1405131777948909599>"),
        new ButtonBuilder()
          .setCustomId("cancel_sell_shop")
          .setLabel("إلــغــاء")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("<a:no:1405131885146800148>")
      );

      return interaction.followUp({ 
        content: `<@${buyerId}>`, 
        embeds: [typeEmbed], 
        components: [confirmRow], 
        ephemeral: false 
      });
    }

    async function processPayment(client, interaction, buyerId, sellerId, price) {
      const guildId = interaction.guild.id;
      const setupData = await Setup.findOne({ guildId });
      const logsData = await Logs.findOne({ guildId: interaction.guild.id });

      addTransaction(buyerId, interaction.channel.id, "sell-shop", { sellerId, price });

      const tax = Math.floor((price * 20) / 19 + 1);
      const bank = sellerId; 

      // === إعطاء صلاحيات مؤقتة للمشتري (رؤية + إرسال) ===
      await interaction.channel.permissionOverwrites.create(buyerId, { 
        ViewChannel: true,
        SendMessages: true 
      });

      // تنسيق السعر للرسالة
      let formattedPrice = price.toLocaleString();
      if (price >= 1000000) {
        formattedPrice = `${(price / 1000000).toFixed(1)}M`;
      } else if (price >= 1000) {
        formattedPrice = `${(price / 1000).toFixed(1)}K`;
      }

      await interaction.followUp({ 
        content: `**<@${buyerId}> مــعــك 5 دقــائــق للــتــحــويــل**\n\n**💰 الــســعــر:** ${price.toLocaleString()} 🪙 (${formattedPrice})\n**📋 الــبــنــك:** <@${bank}>\n**💸 مــبــلــغ الــتــحــويــل:** ${tax.toLocaleString()}\n\n\`\`\`#credit ${bank} ${tax}\`\`\``, 
        ephemeral: false 
      });

      const filter = (m) => m.author.bot && 
        (m.content.includes(interaction.user.username) && 
         m.content.includes(price.toString()) && 
         m.content.includes(bank));
      
      const collector = interaction.channel.createMessageCollector({ filter, time: 300000 });

      collector.on("collect", async () => {
        if (!getActiveTransaction(buyerId, interaction.channel.id)) return;
        collector.stop();
        removeTransaction(buyerId, interaction.channel.id);
        
        // === تحديث الصلاحيات بعد النجاح ===
        await interaction.channel.permissionOverwrites.delete(sellerId).catch(() => {});
        await interaction.channel.permissionOverwrites.create(buyerId, { 
          ViewChannel: true,
          SendMessages: true,
          MentionEveryone: true,
          EmbedLinks: true,
          AttachFiles: true
        });

        // تحديث ملكية المتجر
        await Shop.updateOne(
          { guildId: interaction.guild.id, channelId: interaction.channel.id },
          { $set: { ownerId: buyerId } }
        );

        // تنسيق السعر للإمبدد
        let embedFormattedPrice = price.toLocaleString();
        if (price >= 1000000) {
          embedFormattedPrice = `${(price / 1000000).toFixed(1)} مليون`;
        } else if (price >= 1000) {
          embedFormattedPrice = `${(price / 1000).toFixed(1)} ألف`;
        }

        const embed = new EmbedBuilder()
          .setTitle("✅ تــم بــيــع الــمــتــجــر بــنــجــاح")
          .setAuthor({
            name: interaction.guild.name,
            iconURL: interaction.guild.iconURL({ dynamic: true }),
          })
          .setImage(setupData.line)
          .addFields(
            { name: "🏪 الــمــتــجــر", value: `<#${interaction.channel.id}>`, inline: true },
            { name: "👤 الــبــائــع", value: `<@${interaction.user.id}>`, inline: true },
            { name: "🛒 الــمــشــتــري", value: `<@${buyerId}>`, inline: true },
            { name: "💰 ســعــر الــبــيــع", value: `${price.toLocaleString()} 🪙\n(${embedFormattedPrice})`, inline: false },
            { name: "🕒 الــوقــت", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
          )
          .setFooter({ 
            text: "Dev By Hox Devs", 
            iconURL: interaction.guild.iconURL() 
          });

        await interaction.followUp({
          content: `**✅ تــم بــيــع الــمــتــجــر <#${interaction.channel.id}> بــنــجــاح**`,
          ephemeral: false
        });

        await interaction.channel.send({ content: `<@${buyerId}>`, embeds: [embed] });

        // إرسال رسائل خاصة
        try {
          await interaction.user.send({
            content: `**✅ تــم بــيــع مــتــجــرك <#${interaction.channel.id}> بــنــجــاح**`,
            embeds: [embed]
          });
        } catch (err) {
          console.log("فشل في إرسال رسالة خاصة للبائع");
        }

        try {
          const buyerUser = await client.users.fetch(buyerId);
          await buyerUser.send({
            content: `**✅ تــم شــراء الــمــتــجــر <#${interaction.channel.id}> بــنــجــاح**`,
            embeds: [embed]
          });
        } catch (err) {
          console.log("فشل في إرسال رسالة خاصة للمشتري");
        }

        // إرسال اللوغ
        if (logsData && logsData.shopLogRoom) {
          const logChannel = await client.channels.fetch(logsData.shopLogRoom);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setTitle("📝 لــوق بــيــع مــتــجــر")
              .addFields(
                { name: "🏪 الــمــتــجــر", value: `<#${interaction.channel.id}>`, inline: true },
                { name: "👤 الــبــائــع", value: `<@${interaction.user.id}>`, inline: true },
                { name: "🛒 الــمــشــتــري", value: `<@${buyerId}>`, inline: true },
                { name: "💰 ســعــر الــبــيــع", value: `${price.toLocaleString()} 🪙`, inline: true }
              )
              .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] });
          }
        }
      });

      collector.on('end', async collected => {
        if (collected.size === 0 && getActiveTransaction(buyerId, interaction.channel.id)) {
            removeTransaction(buyerId, interaction.channel.id);
            await interaction.channel.permissionOverwrites.delete(buyerId).catch(() => {});
            interaction.followUp({ content: "**⏰ تــم انــتــهــاء الــوقــت**", ephemeral: false });
        }
      });
    }
  }
};