const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js");

module.exports = {
  name: "warns",
  description: "عــرض تــحــذيــرات الــمــتــجــر",
  options: [
    {
      name: "channel",
      description: "الــمــتــجــر الــذي تــريــد عــرض تــحــذيــراتــه",
      type: 7,
      required: false,
    },
  ],

  async execute(client, interaction) {
    const setupData = await Setup.findOne({ guildId: interaction.guild.id });
    if (!setupData || !setupData.shopAdmin) {
      return interaction.reply({
        content: `**الــرجــاء تــحــديــد مــســؤول مــتــاجــر مــن امــر \n/setup**`,
        ephemeral: true,
      });
    }

    const channel = interaction.options.getChannel("channel") || interaction.channel;
    const shopData = await Shop.findOne({ 
      guildId: interaction.guild.id, 
      channelId: channel.id 
    });

    if (!shopData) {
      return interaction.reply({
        content: "**هــذه الــروم لــيــســت مــتــجــر**",
        ephemeral: true,
      });
    }

    const isShopOwner = shopData.ownerId === interaction.user.id;
    const isPartner = shopData.partners && shopData.partners.includes(interaction.user.id);
    const isShopAdmin = interaction.member.roles.cache.has(setupData.shopAdmin);

    if (!isShopOwner && !isPartner && !isShopAdmin) {
      return interaction.reply({
        content: `**ايــش دخــلــك بــتــحــذيــرات الــمــتــاجــر ؟ 😏  \n يــلا دزهـا 🏃‍♂️**`,
        ephemeral: true,
      });
    }

    // حساب التحذيرات المتبقية
    const remainingWarns = shopData.maxWarns - shopData.warns;
    
    // الحصول على التحذيرات مع ضمان أنها مصفوفة
    const warnings = Array.isArray(shopData.warnings) ? shopData.warnings : [];
    
    // ترتيب التحذيرات من 1 إلى الأخير (تصاعدي حسب الرقم)
    const sortedWarnings = warnings.sort((a, b) => a.warningNumber - b.warningNumber);

    // ========== EMBED الرئيسي ==========
    let emb = new EmbedBuilder()
      .setTitle("تــحــذيــرات الــمــتــجــر")
      .setColor('#ff9900')
      .addFields([
        {
          name: "الــمــتــجــر",
          value: `<#${channel.id}>`,
          inline: true,
        },
        {
          name: "عــدد الــتــحــذيــرات",
          value: `**${shopData.warns}/${shopData.maxWarns}**`,
          inline: true,
        },
        {
          name: "الــمــتــبــقــي",
          value: `**${remainingWarns}**`,
          inline: true,
        }
      ])
      .setFooter({ 
        text: "Dev By Hox Devs", 
        iconURL: interaction.guild.iconURL() 
      })
      .setTimestamp();

    // إضافة شريط التقدم
    const progressBarLength = 10;
    const filledBars = Math.min(Math.round((shopData.warns / shopData.maxWarns) * progressBarLength), progressBarLength);
    const emptyBars = progressBarLength - filledBars;
    
    const progressBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
    emb.addFields({
      name: "مــســتــوى الــتــحــذيــرات",
      value: `\`${progressBar}\` **${shopData.warns}/${shopData.maxWarns}**`,
      inline: false
    });

    // إضافة آخر تحذير إذا كان موجوداً
    if (sortedWarnings.length > 0) {
        const lastWarning = sortedWarnings[sortedWarnings.length - 1]; // الأحدث هو الأخير في المصفوفة
        emb.addFields({
            name: "آخــر تــحــذيــر",
            value: `#${lastWarning.warningNumber} - <t:${Math.floor(new Date(lastWarning.warnedAt).getTime() / 1000)}:R>\n**السبب:** ${lastWarning.reason || 'لــم يــتــم تــحــديــد ســبــب'}`,
            inline: false
        });
    }

    if (setupData.line) {
      emb.setImage(setupData.line);
    }

    // ========== إنشاء الأزرار ==========
    const rows = [];
    const buttonsPerRow = 5;
    
    if (sortedWarnings.length > 0) {
        // إنشاء مجموعات من الأزرار (كل 5 أزرار في صف)
        for (let i = 0; i < sortedWarnings.length; i += buttonsPerRow) {
            const rowButtons = [];
            const chunk = sortedWarnings.slice(i, i + buttonsPerRow);
            
            for (const warning of chunk) {
                // اختيار لون الزر: الأحمر للتحذير الأخير، رمادي للباقي
                const isLastWarning = warning.warningNumber === sortedWarnings[sortedWarnings.length - 1].warningNumber;
                const buttonStyle = isLastWarning ? ButtonStyle.Danger : ButtonStyle.Secondary;
                
                rowButtons.push(
                    new ButtonBuilder()
                        .setCustomId(`warns_${warning.warningNumber}_${channel.id}`)
                        .setLabel(`تــحــذيــر ${warning.warningNumber}`)
                        .setStyle(buttonStyle)
                );
            }
            
            rows.push(new ActionRowBuilder().addComponents(rowButtons));
            
            // إيقاف عند 3 صفوف كحد أقصى (15 زر)
            if (rows.length >= 3) {
                break;
            }
        }
        
        // إضافة زر إزالة التحذير للمسؤولين في صف جديد إذا كان هناك مكان
        if (sortedWarnings.length > 0 && (isShopAdmin || isShopOwner) && rows.length < 3) {
            const removeButton = new ButtonBuilder()
                .setCustomId(`remove_warn_${channel.id}`)
                .setLabel('إزالــة تــحــذيــر')
                .setStyle(ButtonStyle.Danger);
            
            rows.push(new ActionRowBuilder().addComponents(removeButton));
        }
    } else {
        emb.setDescription("**لا تــوجــد تــحــذيــرات لــهــذا الــمــتــجــر**");
    }

    // ========== إرسال الرد ==========
    const replyOptions = {
        embeds: [emb]
    };
    
    if (rows.length > 0) {
        replyOptions.components = rows;
    }
    
    await interaction.reply(replyOptions);
  },
};