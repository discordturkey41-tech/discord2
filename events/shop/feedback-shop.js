const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  AttachmentBuilder
} = require("discord.js");
const Rating = require("../../Mangodb/rating.js");
const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js");
const tempRatingData = new Map();

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(client, interaction) {
    if (!interaction.isButton() && !interaction.isModalSubmit() && !interaction.isStringSelectMenu()) return;    if (!interaction.guild) return;
    const guildId = interaction.guild.id;

    // === زر التقييمات الرئيسي ===
    if (interaction.isButton() && interaction.customId === "ratings_main") {
              const setupData = await Setup.findOne({ guildId });

      const ratingsEmbed = new EmbedBuilder()
        .setTitle(" **تــقــيــيــمــات الــمــتــجــر** ")
        .setDescription("**اخــتــر واحــدة مــن الــخــيــارات الــتــالــيــة لــلــتــعــامــل مــع تــقــيــيــمــات الــمــتــجــر**")
        .setImage(setupData.line)
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .addFields(
          { name: " **تــقــيــيــم الــمــتــجــر**", value: "اضــغــط لــتــقــيــيــم الــمــتــجــر", inline: true },
          { name: " **عــرض الــتــقــيــيــمــات**", value: "اضــغــط لــعــرض تــقــيــيــمــات الــمــتــجــر", inline: true }
        )
        .setFooter({ 
          text: "Dev By Hox Devs", 
          iconURL: interaction.guild.iconURL({ dynamic: true }) 
        });

      const buttonsRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("rate_shop")
          .setLabel("تــقــيــيــم الــمــتــجــر")
          .setStyle(ButtonStyle.Primary),
                  new ButtonBuilder()
          .setCustomId("edit_rating_main")
          .setLabel("تــعــديــل تــقــيــيــم الــمــتــجــر")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("view_ratings")
          .setLabel("عــرض الــتــقــيــيــمــات")
          .setStyle(ButtonStyle.Secondary)

      );

      await interaction.reply({
        embeds: [ratingsEmbed],
        components: [buttonsRow],
        ephemeral: true
      });
    }

if (interaction.isButton() && interaction.customId === "rate_shop") {
    const shopData1 = await Shop.findOne({ guildId, channelId: interaction.channel.id });
    const owner = shopData1.ownerId;
    const partners = shopData1.partners;
    const setupData = await Setup.findOne({ guildId });

    if (interaction.user.id === owner || (partners && partners.includes(interaction.user.id))) {
        return interaction.reply({
            content: "**انــقــلــععع\nتــبــي تــقــيــم نــفــســك\nشــايــفــنــي بــوت عــبــيــط**",
            ephemeral: true
        });
    }

    const existingRating = await Rating.findOne({ 
        guildId, 
        userId: interaction.user.id 
    });

    if (existingRating) {
        return interaction.reply({
            content: "**❌ لــقــد قــمــت بــتــقــيــيــم هــذا الــمــتــجــر مــســبــقــاً**",
            ephemeral: true
        });
    }

    const starsEmbed = new EmbedBuilder()
        .setTitle("**تــقــيــيــم الــمــتــجــر**")
        .setDescription("**اخــتــر عدد الــنــجــوم لــتــقــيــيــم الــمــتــجــر**")
        .setImage(setupData.line)
        .setFooter({ 
            text: "Dev By Hox Devs", 
            iconURL: interaction.guild.iconURL({ dynamic: true }) 
        });

    const starsRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("rate_1").setLabel("1 ⭐").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("rate_2").setLabel("2 ⭐⭐").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("rate_3").setLabel("3 ⭐⭐⭐").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("rate_4").setLabel("4 ⭐⭐⭐⭐").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("rate_5").setLabel("5 ⭐⭐⭐⭐⭐").setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
        embeds: [starsEmbed],
        components: [starsRow],
        ephemeral: true
    });
}

// === اختيار عدد النجوم ===
if (interaction.isButton() && interaction.customId.startsWith("rate_")) {
    const stars = parseInt(interaction.customId.split("_")[1]);
    
    // حفظ البيانات في Map مؤقت
    const tempId = `${interaction.user.id}_${Date.now()}`;
    tempRatingData.set(tempId, { stars });
    
    const modal = new ModalBuilder()
        .setCustomId(`rating_reason_${tempId}`)
        .setTitle(`ســبــب تــقــيــيــمــك (${stars} نــجــوم)`);

    const reasonInput = new TextInputBuilder()
        .setCustomId("rating_reason")
        .setLabel("ســبــب تــقــيــيــمــك لــلــمــتــجــر")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(500)
        .setPlaceholder("أدخل سبب تقييمك للمتجر هنا...");

    const firstActionRow = new ActionRowBuilder().addComponents(reasonInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
}

// === معالجة سبب التقييم ===
if (interaction.isModalSubmit() && interaction.customId.startsWith("rating_reason_")) {
    const tempId = interaction.customId.replace('rating_reason_', '');
    const tempData = tempRatingData.get(tempId);
    
    if (!tempData) {
        return interaction.reply({
            content: "**❌ انــتــهــت مــدة الــجــلــســة، يــرجــى إعــادة الــتــقــيــيــم**",
            ephemeral: true
        });
    }
    
    const stars = tempData.stars;
    const reason = interaction.fields.getTextInputValue("rating_reason");
    
    // تحديث البيانات المؤقتة
    tempRatingData.set(tempId, { stars, reason });
    const setupData = await Setup.findOne({ guildId });

    const evidenceEmbed = new EmbedBuilder()
        .setTitle("**أدلــة الــتــقــيــيــم**")
        .setDescription("**اخــتــر عــدد الــصــور الــتــي تــريــد إضــافــتــها كــدلــيــل لــتــقــيــيــمــك**")
        .setImage(setupData.line)
        .setFooter({ 
            text: "Dev By Hox Devs", 
            iconURL: interaction.guild.iconURL({ dynamic: true }) 
        });

    const evidenceRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`evidence_count_${tempId}`)
            .setPlaceholder("اخــتــر عــدد الــصــور")
            .addOptions(
                { label: "صــورة واحــدة", value: "1", emoji: "1️⃣" },
                { label: "صــورتــان", value: "2", emoji: "2️⃣" },
                { label: "ثــلاث صــور", value: "3", emoji: "3️⃣" },
                { label: "أربــع صــور", value: "4", emoji: "4️⃣" },
                { label: "خــمــس صــور", value: "5", emoji: "5️⃣" }
            )
    );

    await interaction.reply({
        embeds: [evidenceEmbed],
        components: [evidenceRow],
        ephemeral: true
    });
}

// === اختيار عدد الأدلة ===
if (interaction.isStringSelectMenu() && interaction.customId.startsWith("evidence_count_")) {
    const tempId = interaction.customId.replace('evidence_count_', '');
    const tempData = tempRatingData.get(tempId);
    
    if (!tempData) {
        return interaction.reply({
            content: "**❌ انــتــهــت مــدة الــجــلــســة، يــرجــى إعــادة الــتــقــيــيــم**",
            ephemeral: true
        });
    }
    
    const evidenceCount = parseInt(interaction.values[0]);
    
    if (evidenceCount === 0) {
        // حفظ التقييم بدون أدلة
        const { stars, reason } = tempData;
        
        await Rating.create({
            guildId,
            userId: interaction.user.id,
            displayName: interaction.user.username,
            stars,
            reason,
            evidence: [],
            createdAt: new Date()
        });

        // تنظيف البيانات المؤقتة
        tempRatingData.delete(tempId);

        await interaction.update({
            content: "**✅ تــم إضــافــة تــقــيــيــمــك بــنــجــاح**",
            embeds: [],
            components: []
        });
    } else {
        // تحديث البيانات المؤقتة وإظهار المودال
        tempData.evidenceCount = evidenceCount;
        tempRatingData.set(tempId, tempData);
        
        const modal = new ModalBuilder()
            .setCustomId(`rating_evidence_${tempId}`)
            .setTitle(`أدخــل روابــط الــصــور (${evidenceCount} صــور)`);

        const evidenceInputs = [];
        
        for (let i = 1; i <= evidenceCount; i++) {
            const evidenceInput = new TextInputBuilder()
                .setCustomId(`evidence_${i}`)
                .setLabel(`رابــط الــصــورة ${i}`)
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder(`أدخل رابط الصورة ${i} هنا...`);
            
            evidenceInputs.push(new ActionRowBuilder().addComponents(evidenceInput));
        }

        modal.addComponents(...evidenceInputs);
        await interaction.showModal(modal);
    }
}

// === معالجة أدلة التقييم ===
if (interaction.isModalSubmit() && interaction.customId.startsWith("rating_evidence_")) {
    const tempId = interaction.customId.replace('rating_evidence_', '');
    const tempData = tempRatingData.get(tempId);
    
    if (!tempData) {
        return interaction.reply({
            content: "**❌ انــتــهــت مــدة الــجــلــســة، يــرجــى إعــادة الــتــقــيــيــم**",
            ephemeral: true
        });
    }
    
    const evidenceCount = tempData.evidenceCount;
    const evidenceLinks = [];
    
    for (let i = 1; i <= evidenceCount; i++) {
        const link = interaction.fields.getTextInputValue(`evidence_${i}`);
        if (link) evidenceLinks.push(link);
    }
    
    // حفظ التقييم مع الأدلة
    const { stars, reason } = tempData;
    
    await Rating.create({
        guildId,
        userId: interaction.user.id,
        displayName: interaction.user.username,
        stars,
        reason,
        evidence: evidenceLinks,
        createdAt: new Date()
    });

    // تنظيف البيانات المؤقتة
    tempRatingData.delete(tempId);

    await interaction.reply({
        content: "**✅ تــم إضــافــة تــقــيــيــمــك بــنــجــاح**",
        ephemeral: true
    });
}


    // === زر عرض التقييمات ===
    if (interaction.isButton() && interaction.customId === "view_ratings") {
      const ratings = await Rating.find({ guildId }).sort({ createdAt: -1 });
      const setupData = await Setup.findOne({ guildId });
      if (ratings.length === 0) {
        return interaction.reply({
          content: "**❌ لــم يــتــم إضــافــة أي تــقــيــيــمــات لــهــذا الــمــتــجــر بــعــد**",
          ephemeral: true
        });
      }
      
      const ratingsListEmbed = new EmbedBuilder()
        .setTitle("**قــائــمــة تــقــيــيــمــات الــمــتــجــر**")
        .setDescription("**اخــتــر اســم الــمــســتــخــدم لــعــرض تــقــيــيــمــه**")
        .setImage(setupData.line)
        .setFooter({ 
          text: `إجــمــالــي الــتــقــيــيــمــات: ${ratings.length}`, 
          iconURL: interaction.guild.iconURL({ dynamic: true }) 
        });
      
      const selectMenuOptions = ratings.slice(0, 25).map((rating, index) => ({
        label: rating.displayName,
        value: rating.userId,
        description: `⭐ ${rating.stars} نــجــوم - ${new Date(rating.createdAt).toLocaleDateString()}`,
        emoji: index % 2 === 0 ? "👤" : "🧑"
      }));
      
      const selectRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("select_rating")
          .setPlaceholder("اخــتــر تــقــيــيــمــاً لــعــرضــه")
          .addOptions(selectMenuOptions)
      );
      
      await interaction.reply({
        embeds: [ratingsListEmbed],
        components: [selectRow],
        ephemeral: true
      });
    }

    // === اختيار تقييم معين ===
    if (interaction.isStringSelectMenu() && interaction.customId === "select_rating") {
      const userId = interaction.values[0];
      const rating = await Rating.findOne({ guildId, userId });
      const setupData = await Setup.findOne({ guildId });
      if (!rating) {
        return interaction.update({
          content: "**❌ لــم يــتــم الــعــثــور عــلــى الــتــقــيــيــم**",
          embeds: [],
          components: []
        });
      }
      
      const starsText = "⭐".repeat(rating.stars) + "☆".repeat(5 - rating.stars);
      
      const ratingEmbed = new EmbedBuilder()
        .setTitle(` **تــقــيــيــم ${rating.displayName}** `)
        .setDescription(`**${starsText}**\n\n** الــســبــب:**\n${rating.reason}`)
        .setImage(setupData.line)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ 
          text: `تــم الــتــقــيــيــم فــي ${new Date(rating.createdAt).toLocaleDateString()}`,
          iconURL: interaction.guild.iconURL({ dynamic: true }) 
        });
      
      let components = [];
      
      // إذا كان هناك أدلة، نضيف زر لعرضها
      if (rating.evidence && rating.evidence.length > 0) {
        const evidenceRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`show_evidence_${rating.userId}`)
            .setLabel("عــرض الــأدلــة")
            .setStyle(ButtonStyle.Primary)
        );
        components.push(evidenceRow);
      }
      
      await interaction.update({
        embeds: [ratingEmbed],
        components: components
      });
    }

    // === زر عرض الأدلة ===
    if (interaction.isButton() && interaction.customId.startsWith("show_evidence_")) {
      const userId = interaction.customId.replace("show_evidence_", "");
      const rating = await Rating.findOne({ guildId, userId });
      
      if (!rating || !rating.evidence || rating.evidence.length === 0) {
        return interaction.reply({
          content: "**❌ لــم يــتــم الــعــثــور عــلــى أي أدلــة لــهــذا الــتــقــيــيــم**",
          ephemeral: true
        });
      }
      
      // إرسال الصورة الأولى في embed
      const evidenceEmbed = new EmbedBuilder()
        .setTitle("**أدلــة الــتــقــيــيــم**")
        .setDescription(`**تــقــيــيــم ${rating.displayName}**`)
        .setImage(rating.evidence[0])
        .setFooter({ 
          text: `الصورة 1 من ${rating.evidence.length}`,
          iconURL: interaction.guild.iconURL({ dynamic: true }) 
        });
      
      let components = [];
      
      // إذا كان هناك أكثر من صورة، نضيف أزرار التنقل
      if (rating.evidence.length > 1) {
        const navigationRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`evidence_prev_${userId}_0`)
            .setLabel("السابقة")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(`evidence_next_${userId}_0`)
            .setLabel("التالية")
            .setStyle(ButtonStyle.Primary)
        );
        components.push(navigationRow);
      }
      
      await interaction.reply({
        embeds: [evidenceEmbed],
        components: components,
        ephemeral: true
      });
    }

    // === التنقل بين الأدلة ===
    if (interaction.isButton() && (interaction.customId.startsWith("evidence_prev_") || interaction.customId.startsWith("evidence_next_"))) {
      const parts = interaction.customId.split("_");
      const direction = parts[1];
      const userId = parts[2];
      let currentIndex = parseInt(parts[3]);
      
      const rating = await Rating.findOne({ guildId, userId });
      
      if (!rating || !rating.evidence) {
        return interaction.update({
          content: "**❌ لــم يــتــم الــعــثــور عــلــى أي أدلــة**",
          embeds: [],
          components: []
        });
      }
      
      // تحديث الفهرس حسب الاتجاه
      if (direction === "next") {
        currentIndex++;
      } else if (direction === "prev") {
        currentIndex--;
      }
      
      // التأكد من أن الفهرس ضمن الحدود
      currentIndex = Math.max(0, Math.min(currentIndex, rating.evidence.length - 1));
      
      const evidenceEmbed = new EmbedBuilder()
        .setTitle("**أدلــة الــتــقــيــيــم*")
        .setDescription(`**تــقــيــيــم ${rating.displayName}**`)
        .setImage(rating.evidence[currentIndex])
        .setFooter({ 
          text: `الصورة ${currentIndex + 1} من ${rating.evidence.length}`,
          iconURL: interaction.guild.iconURL({ dynamic: true }) 
        });
      
      const navigationRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`evidence_prev_${userId}_${currentIndex}`)
          .setLabel("الــســابــقــة")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentIndex === 0),
        new ButtonBuilder()
          .setCustomId(`evidence_next_${userId}_${currentIndex}`)
          .setLabel("الــتــالــيــة")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentIndex === rating.evidence.length - 1)
      );
      
      await interaction.update({
        embeds: [evidenceEmbed],
        components: [navigationRow]
      });
    }
      setInterval(() => {
    const now = Date.now();
    for (const [key, value] of tempRatingData.entries()) {
        const timestamp = parseInt(key.split('_')[1]);
        if (now - timestamp > 15 * 60 * 1000) { // 15 دقيقة
            tempRatingData.delete(key);
        }
    }
}, 5 * 60 * 1000); // كل 5 دقائق

  }
};