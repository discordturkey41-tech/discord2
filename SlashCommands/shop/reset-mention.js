const { EmbedBuilder } = require("discord.js");
const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js");
const Logs = require("../../Mangodb/logs.js"); // استيراد Logs

module.exports = {
  name: "reset-mention",
  description: "تــرســيــت مــنــشــنــات الــمــتــاجــر",
  options: [
    {
      name: "type",
      description: "اخــتــار نــوع الــتــرســيــت",
      type: 3, // String
      required: true,
      choices: [
        { name: "كــل الــمــتــاجــر", value: "all" },
        { name: "مــتــجــر مــعــيــن", value: "specific" }
      ]
    },
    {
      name: "shop",
      description: "اخــتــر الــمــتــجــر",
      type: 7, // Channel
      required: false
    }
  ],

  async execute(client, interaction) {
    const setupData = await Setup.findOne({ guildId: interaction.guild.id });
    const logsData = await Logs.findOne({ guildId: interaction.guild.id }); // جلب بيانات اللوجات

    // التحقق من صلاحيات المسؤول
    if (!setupData || !setupData.shopAdmin) {
      return interaction.reply({
        content: `**الــرجــاء تــحــديــد مــســؤول مــتــاجــر مــن امــر \n/setup**`,
        ephemeral: true,
      });
    }

    // تحقق من صلاحيات المسؤول على المتاجر في السيرفر
    if (!interaction.member.roles.cache.has(setupData.shopAdmin)) {
      return interaction.reply({
        content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج رتـبـه <@&${setupData.shopAdmin}>**`,
        ephemeral: true,
      });
    }

    const typeOption = interaction.options.getString("type");
    const shopChannel = interaction.options.getChannel("shop");

    if (typeOption === "specific" && !shopChannel) {
      return interaction.reply({
        content: "**يــجــب تــحــديــد الــمــتــجــر عــنــد اخــتــيــار 'مــتــجــر مــعــيــن'**",
        ephemeral: true
      });
    }

    try {
      let shops = [];
      let message = "";

      if (typeOption === "all") {
        // جلب جميع المتاجر
        shops = await Shop.find({ guildId: interaction.guild.id });
        message = `**تــم تــرســيــت مــنــشــنــات ${shops.length} مــتــجــر بــنــجــاح**`;
      } else {
        // جلب متجر معين
        const shop = await Shop.findOne({ channelId: shopChannel.id });
        if (!shop) {
          return interaction.reply({
            content: "**هـذة الـروم لـيـسـت مـتـجـراً**",
            ephemeral: true
          });
        }
        shops = [shop];
        message = `**تــم تــرســيــت مــنــشــنــات الــمــتــجــر <#${shopChannel.id}> بــنــجــاح**`;
      }

      // جلب بيانات النوع من ملف types.json
      const types = require("../../data/types.json");
      
      const resetDetails = []; // لتخزين تفاصيل الترسيت لللوق

      // تحديث المنشنات لكل متجر وإرسال رسالة التأكيد
      for (const shop of shops) {
        const typeData = types.find(t => t.name === shop.type);
        if (typeData) {
          // حفظ القيم القديمة لللوق
          const oldEveryone = shop.everyone;
          const oldHere = shop.here;
          const oldShopMention = shop.shop;

          shop.everyone = typeData.everyoneMention || 0;
          shop.here = typeData.hereMention || 0;
          shop.shop = typeData.shopMention || 0;
          await shop.save();
          
          // تخزين تفاصيل الترسيت
          resetDetails.push({
            shopId: shop.channelId,
            shopName: shopChannel ? shopChannel.name : (await client.channels.fetch(shop.channelId))?.name || "Unknown",
            oldEveryone,
            oldHere,
            oldShopMention,
            newEveryone: shop.everyone,
            newHere: shop.here,
            newShopMention: shop.shop,
            ownerId: shop.ownerId
          });
          
          // إرسال رسالة نصية عادية في قناة المتجر
          const channel = await client.channels.fetch(shop.channelId);
          if (channel) {
            await channel.send(`**تــم تــرســيــت مــنــشــنــات مــتــجــرك بــنــجــاح**`);
          }
        }
      }

      await interaction.reply({
        content: message,
        ephemeral: false
      });

      // تسجيل في لوق المتاجر
      if (logsData && logsData.shopLogRoom && resetDetails.length > 0) {
        const logChannel = await client.channels.fetch(logsData.shopLogRoom);
        if (logChannel) {
          const shopMentionRoleId = setupData.shopMention;
          const shopMentionRole = interaction.guild.roles.cache.get(shopMentionRoleId);
          
          const logEmbed = new EmbedBuilder()
            .setTitle("لــوق تــرســيــت مــنــشــنــات")
            .addFields(
              { name: "الــمــســؤؤل", value: `<@${interaction.user.id}>`, inline: true },
              { name: "نــوع الــتــرســيــت", value: typeOption === "all" ? "كــل الــمــتــاجــر" : "مــتــجــر واحــد", inline: true },
              { name: "عــدد الــمــتــاجــر", value: `${shops.length}`, inline: true }
            );

          // إضافة تفاصيل المتاجر (أول 5 متاجر فقط)
          if (resetDetails.length <= 5) {
            resetDetails.forEach((detail, index) => {
              logEmbed.addFields(
                { 
                  name: `المتجر ${index + 1}`, 
                  value: `<#${detail.shopId}> - <@${detail.ownerId}>`,
                  inline: false 
                }
              );
            });
          } else {
            const firstFive = resetDetails.slice(0, 5);
            let shopsList = firstFive.map(detail => 
              `• <#${detail.shopId}> - <@${detail.ownerId}>`
            ).join('\n');
            shopsList += `\n... و${resetDetails.length - 5} متجر آخر`;
            
            logEmbed.addFields({
              name: "المتاجر المعنية",
              value: shopsList,
              inline: false
            });
          }

          logEmbed.setTimestamp();
          await logChannel.send({ embeds: [logEmbed] });
        }
      }

    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "**❌ | حدث خطأ أثناء تنفيذ الأمر**",
        ephemeral: true
      });
    }
  }
};  