const { EmbedBuilder } = require("discord.js");
const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js");
const Logs = require("../../Mangodb/logs.js"); // استيراد Logs

module.exports = {
  name: "send-message-shop",
  description: "ارســال رســالــة الــى مــتــجــر او جــمــيــع الــمــتــاجــر",
  options: [
    {
      name: "type",
      description: "اخــتــار نــوع الارســال",
      type: 3, // String
      required: true,
      choices: [
        { name: "كــل الــمــتــاجــر", value: "all" },
        { name: "مــتــجــر مــعــيــن", value: "specific" }
      ]
    },
    {
      name: "message",
      description: "الــرســالــة الــذي تــريــد ارســالــها",
      type: 3, // String
      required: true
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

    if (!interaction.member.roles.cache.has(setupData.shopAdmin)) {
      return interaction.reply({
        content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج رتـبـه <@&${setupData.shopAdmin}>**`,
        ephemeral: true,
      });
    }

    const typeOption = interaction.options.getString("type");
    const shopChannel = interaction.options.getChannel("shop");
    const messageContent = interaction.options.getString("message");

    if (typeOption === "specific" && !shopChannel) {
      return interaction.reply({
        content: "**يــجــب تــحــديــد الــمــتــجــر عــنــد اخــتــيــار 'مــتــجــر مــعــيــن'**",
        ephemeral: true
      });
    }

    let shops = [];
    let replyMessage = "";

    if (typeOption === "all") {
      shops = await Shop.find({ guildId: interaction.guild.id });
      replyMessage = `**تــم ارســال الــرســالــة الــى ${shops.length} مــتــجــر بــنــجــاح**`;
    } else {
      const shop = await Shop.findOne({ channelId: shopChannel.id });
      if (!shop) {
        return interaction.reply({
          content: "**هـذة الـروم لـيـسـت مـتـجـراً**",
          ephemeral: true
        });
      }
      shops = [shop];
      replyMessage = `**تــم ارســال الــرســالــة الــى الــمــتــجــر <#${shopChannel.id}> بــنــجــاح**`;
    }

    // إنشاء الإيمبد
    const embed = new EmbedBuilder()
      .setTitle("رســالــة الــى الــمــتــاجــر")
      .setDescription(`الــرســالــة:\n${messageContent}`)
      .setAuthor({
        name: interaction.guild.name,
        iconURL: interaction.guild.iconURL({ dynamic: true })
      })
      .setFooter({
        text: "Dev By Hox Devs",
        iconURL: interaction.guild.iconURL({ dynamic: true })
      })
      .setTimestamp();

    // إضافة صورة إذا كانت موجودة في setupData
    if (setupData.line) {
      embed.setImage(setupData.line);
    }

    // إرسال الرسالة لكل متجر
    const sentShops = [];
    const failedShops = [];

    const sendPromises = shops.map(async (shop) => {
      try {
        const channel = await client.channels.fetch(shop.channelId);
        if (channel) {
          await channel.send({ embeds: [embed] });
          sentShops.push({
            id: shop.channelId,
            name: channel.name
          });
        } else {
          failedShops.push({
            id: shop.channelId,
            reason: "القناة غير موجودة"
          });
        }
      } catch (error) {
        console.error(`Failed to send message to shop ${shop.channelId}:`, error);
        failedShops.push({
          id: shop.channelId,
          reason: "خطأ في الإرسال"
        });
      }
    });

    await Promise.all(sendPromises);
    
    await interaction.reply({
      content: replyMessage,
      ephemeral: false
    });

    // تسجيل في لوق المتاجر
    if (logsData && logsData.shopLogRoom) {
      const logChannel = await client.channels.fetch(logsData.shopLogRoom);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle("لــوق ارســال رســالــة لــلــمــتــاجــر")
          .addFields(
            { name: "الــمــســؤؤل", value: `<@${interaction.user.id}>`, inline: true },
            { name: "نــوع الارســال", value: typeOption === "all" ? "كــل الــمــتــاجــر" : "مــتــجــر واحــد", inline: true },
            { name: "الــمــتــاجــر الــتــي تــم الارســال لــهــا", value: `${sentShops.length}`, inline: true },
            { name: "الــمــتــاجــر الــتــي لــم يــتــم الارســال لــهــا", value: `${failedShops.length}`, inline: true }
          );

        // إضافة جزء من الرسالة (150 حرف كحد أقصى)
        const messagePreview = messageContent.length > 150 
          ? messageContent.substring(0, 150) + "..." 
          : messageContent;
        
        logEmbed.addFields({
          name: "محتوى الرسالة",
          value: messagePreview,
          inline: false
        });

        // إضافة قائمة بالمتاجر التي تم الإرسال لها (أول 10 فقط)
        if (sentShops.length > 0) {
          const shopsList = sentShops.slice(0, 10).map(shop => 
            `• <#${shop.id}>`
          ).join('\n');
          
          if (sentShops.length > 10) {
            shopsList += `\n... و${sentShops.length - 10} متجر آخر`;
          }
          
          logEmbed.addFields({
            name: "المتاجر المستهدفة",
            value: shopsList,
            inline: false
          });
        }

        logEmbed.setTimestamp();
        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  }
};