const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder
} = require("discord.js");
const Rating = require("../../Mangodb/rating.js");
const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js");
const tempEditData = new Map();

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(client, interaction) {
    if (!interaction.isButton() && !interaction.isModalSubmit() && !interaction.isStringSelectMenu()) return;    if (!interaction.guild) return;
    const guildId = interaction.guild.id;

    // === زر تعديل التقييم الرئيسي ===
    if (interaction.isButton() && interaction.customId === "edit_rating_main") {
      const setupData = await Setup.findOne({ guildId });

      const editEmbed = new EmbedBuilder()
        .setTitle(" **تــعــديــل الــتــقــيــيــمــات** ")
        .setDescription("**اخــتــر واحــدة مــن الــخــيــارات الــتــالــيــة لــتــعــديــل تــقــيــيــمــك**")
        .setImage(setupData.line)
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .addFields(
          { name: " **تــعــديــل الــنــجــوم**", value: "اضــغــط لــتــعــديــل عــدد نــجــوم تــقــيــيــمــك", inline: true },
          { name: " **تــعــديــل الــســبــب**", value: "اضــغــط لــتــعــديــل ســبــب تــقــيــيــمــك", inline: true },
          { name: " **تــعــديــل الــأدلــة**", value: "اضــغــط لــتــعــديــل أدلــة تــقــيــيــمــك", inline: true }
        )
        .setFooter({ 
          text: "Dev By Hox Devs", 
          iconURL: interaction.guild.iconURL({ dynamic: true }) 
        });

      const buttonsRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("edit_stars")
          .setLabel("تــعــديــل الــنــجــوم")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("edit_reason")
          .setLabel("تــعــديــل الــســبــب")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("edit_evidence")
          .setLabel("تــعــديــل الــأدلــة")
          .setStyle(ButtonStyle.Success)
      );

      await interaction.reply({
        embeds: [editEmbed],
        components: [buttonsRow],
        ephemeral: true
      });
    }

    // === زر تعديل النجوم ===
    if (interaction.isButton() && interaction.customId === "edit_stars") {
      const userRating = await Rating.findOne({ 
        guildId, 
        userId: interaction.user.id 
      });

      if (!userRating) {
        return interaction.reply({
          content: "**❌ لــيــس لــدــيــك تــقــيــيــم لــتــعــديــلــه**",
          ephemeral: true
        });
      }

      const setupData = await Setup.findOne({ guildId });

      const starsEmbed = new EmbedBuilder()
        .setTitle("**تــعــديــل عــدد الــنــجــوم**")
        .setDescription(`**الــتــقــيــيــم الــحــالــي: ${"⭐".repeat(userRating.stars)}**\n\nاخــتــر عــدد الــنــجــوم الــجــديــد`)
        .setImage(setupData.line)
        .setFooter({ 
          text: "Dev By Hox Devs", 
          iconURL: interaction.guild.iconURL({ dynamic: true }) 
        });

      const starsRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("edit_stars_1").setLabel("1 ⭐").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("edit_stars_2").setLabel("2 ⭐⭐").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("edit_stars_3").setLabel("3 ⭐⭐⭐").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("edit_stars_4").setLabel("4 ⭐⭐⭐⭐").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("edit_stars_5").setLabel("5 ⭐⭐⭐⭐⭐").setStyle(ButtonStyle.Secondary)
      );

      await interaction.reply({
        embeds: [starsEmbed],
        components: [starsRow],
        ephemeral: true
      });
    }

    // === معالجة تعديل النجوم ===
    if (interaction.isButton() && interaction.customId.startsWith("edit_stars_")) {
      const newStars = parseInt(interaction.customId.split("_")[2]);

      const userRating = await Rating.findOne({ 
        guildId, 
        userId: interaction.user.id 
      });

      if (!userRating) {
        return interaction.reply({
          content: "**❌ لــيــس لــدــيــك تــقــيــيــم لــتــعــديــلــه**",
          ephemeral: true
        });
      }

      // حفظ النجوم القديمة مؤقتاً للتراجع إذا لزم
      const oldStars = userRating.stars;

      try {
        await Rating.findOneAndUpdate(
          { guildId, userId: interaction.user.id },
          { stars: newStars, updatedAt: new Date() }
        );

        const successEmbed = new EmbedBuilder()
          .setTitle("**✅ تــم تــعــديــل الــنــجــوم بــنــجــاح**")
          .setDescription(`**الــتــقــيــيــم الــســابــق: ${"⭐".repeat(oldStars)}**\n**الــتــقــيــيــم الــحــالــي: ${"⭐".repeat(newStars)}**`)
          .setColor(0x00FF00)
          .setFooter({ 
            text: "Dev By Hox Devs", 
            iconURL: interaction.guild.iconURL({ dynamic: true }) 
          });

        await interaction.reply({
          embeds: [successEmbed],
          ephemeral: true
        });

      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: "**❌ حــدث خــطــأ أثــنــاء تــعــديــل الــنــجــوم**",
          ephemeral: true
        });
      }
    }

    // === زر تعديل السبب ===
    if (interaction.isButton() && interaction.customId === "edit_reason") {
      const userRating = await Rating.findOne({ 
        guildId, 
        userId: interaction.user.id 
      });

      if (!userRating) {
        return interaction.reply({
          content: "**❌ لــيــس لــدــيــك تــقــيــيــم لــتــعــديــلــه**",
          ephemeral: true
        });
      }

      const modal = new ModalBuilder()
        .setCustomId("edit_reason_modal")
        .setTitle("تــعــديــل ســبــب الــتــقــيــيــم");

      const reasonInput = new TextInputBuilder()
        .setCustomId("new_reason")
        .setLabel("الــســبــب الــجــديــد لــتــقــيــيــمــك")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(500)
        .setValue(userRating.reason || "")
        .setPlaceholder("أدخل السبب الجديد لتقييمك هنا...");

      const firstActionRow = new ActionRowBuilder().addComponents(reasonInput);
      modal.addComponents(firstActionRow);

      await interaction.showModal(modal);
    }

    // === معالجة تعديل السبب ===
    if (interaction.isModalSubmit() && interaction.customId === "edit_reason_modal") {
      const newReason = interaction.fields.getTextInputValue("new_reason");

      const userRating = await Rating.findOne({ 
        guildId, 
        userId: interaction.user.id 
      });

      if (!userRating) {
        return interaction.reply({
          content: "**❌ لــيــس لــدــيــك تــقــيــيــم لــتــعــديــلــه**",
          ephemeral: true
        });
      }

      // حفظ السبب القديم مؤقتاً
      const oldReason = userRating.reason;

      try {
        await Rating.findOneAndUpdate(
          { guildId, userId: interaction.user.id },
          { reason: newReason, updatedAt: new Date() }
        );

        const successEmbed = new EmbedBuilder()
          .setTitle("**✅ تــم تــعــديــل الــســبــب بــنــجــاح**")
          .setDescription(`**الــســبــب الــجــديــد:**\n${newReason}`)
          .setColor(0x00FF00)
          .addFields(
            {
              name: "الــســبــب الــقــديــم",
              value: oldReason.length > 1024 ? oldReason.substring(0, 1021) + "..." : oldReason,
              inline: false
            }
          )
          .setFooter({ 
            text: "Dev By Hox Devs", 
            iconURL: interaction.guild.iconURL({ dynamic: true }) 
          });

        await interaction.reply({
          embeds: [successEmbed],
          ephemeral: true
        });

      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: "**❌ حــدث خــطــأ أثــنــاء تــعــديــل الــســبــب**",
          ephemeral: true
        });
      }
    }

    // === زر تعديل الأدلة ===
    if (interaction.isButton() && interaction.customId === "edit_evidence") {
      const userRating = await Rating.findOne({ 
        guildId, 
        userId: interaction.user.id 
      });

      if (!userRating) {
        return interaction.reply({
          content: "**❌ لــيــس لــدــيــك تــقــيــيــم لــتــعــديــلــه**",
          ephemeral: true
        });
      }

      const setupData = await Setup.findOne({ guildId });

      const evidenceEmbed = new EmbedBuilder()
        .setTitle("**تــعــديــل أدلــة الــتــقــيــيــم**")
        .setDescription("**اخــتــر الــعــمــلــيــة الــتــي تــريــد الــقــيــام بــهــا**")
        .setImage(setupData.line)
        .addFields(
          {
            name: "الــأدلــة الــحــالــيــة",
            value: userRating.evidence && userRating.evidence.length > 0 
              ? `عــدد الــصــور: ${userRating.evidence.length}` 
              : "لا تــوجــد أدلــة",
            inline: true
          }
        )
        .setFooter({ 
          text: "Dev By Hox Devs", 
          iconURL: interaction.guild.iconURL({ dynamic: true }) 
        });

      const evidenceRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("add_evidence")
          .setLabel("إضــافــة أدلــة")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("remove_evidence")
          .setLabel("حــذف الــأدلــة")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("replace_evidence")
          .setLabel("اســتــبــدال الــأدلــة")
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.reply({
        embeds: [evidenceEmbed],
        components: [evidenceRow],
        ephemeral: true
      });
    }

    // === إضافة أدلة جديدة ===
    if (interaction.isButton() && interaction.customId === "add_evidence") {
      const userRating = await Rating.findOne({ 
        guildId, 
        userId: interaction.user.id 
      });

      if (!userRating) {
        return interaction.reply({
          content: "**❌ لــيــس لــدــيــك تــقــيــيــم لــتــعــديــلــه**",
          ephemeral: true
        });
      }

      const currentEvidenceCount = userRating.evidence ? userRating.evidence.length : 0;
      const maxAdditional = 5 - currentEvidenceCount;

      if (maxAdditional <= 0) {
        return interaction.reply({
          content: "**❌ لــقــد وصــلــت إلــى الــحــد الأقــصــى لــلــصــور (5 صــور)**",
          ephemeral: true
        });
      }

      const setupData = await Setup.findOne({ guildId });

      const addEvidenceEmbed = new EmbedBuilder()
        .setTitle("**إضــافــة أدلــة جــديــدة**")
        .setDescription(`**يــمــكــنــك إضــافــة ${maxAdditional} صــورــة إضــافــيــة**\n\nاخــتــر عــدد الــصــور الــتــي تــريــد إضــافــتــهــا`)
        .setImage(setupData.line)
        .setFooter({ 
          text: "Dev By Hox Devs", 
          iconURL: interaction.guild.iconURL({ dynamic: true }) 
        });

      const options = [];
      for (let i = 1; i <= maxAdditional; i++) {
        options.push({
          label: `${i} صــورــة`,
          value: i.toString(),
          emoji: i === 1 ? "1️⃣" : i === 2 ? "2️⃣" : i === 3 ? "3️⃣" : i === 4 ? "4️⃣" : "5️⃣"
        });
      }

      const evidenceRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("add_evidence_count")
          .setPlaceholder("اخــتــر عــدد الــصــور")
          .addOptions(options)
      );

      await interaction.reply({
        embeds: [addEvidenceEmbed],
        components: [evidenceRow],
        ephemeral: true
      });
    }

    // === معالجة إضافة الأدلة ===
    if (interaction.isStringSelectMenu() && interaction.customId === "add_evidence_count") {
      const evidenceCount = parseInt(interaction.values[0]);
      
      // حفظ البيانات مؤقتاً
      const tempId = `${interaction.user.id}_${Date.now()}`;
      tempEditData.set(tempId, { action: "add_evidence", count: evidenceCount });
      
      const modal = new ModalBuilder()
        .setCustomId(`add_evidence_modal_${tempId}`)
        .setTitle(`إضــافــة ${evidenceCount} صــورــة`);

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

    // === معالجة مودال إضافة الأدلة ===
    if (interaction.isModalSubmit() && interaction.customId.startsWith("add_evidence_modal_")) {
      const tempId = interaction.customId.replace('add_evidence_modal_', '');
      const tempData = tempEditData.get(tempId);

      if (!tempData) {
        return interaction.reply({
          content: "**❌ انــتــهــت مــدة الــجــلــســة**",
          ephemeral: true
        });
      }

      const userRating = await Rating.findOne({ 
        guildId, 
        userId: interaction.user.id 
      });

      if (!userRating) {
        return interaction.reply({
          content: "**❌ لــيــس لــدــيــك تــقــيــيــم لــتــعــديــلــه**",
          ephemeral: true
        });
      }

      const evidenceLinks = [];
      for (let i = 1; i <= tempData.count; i++) {
        const link = interaction.fields.getTextInputValue(`evidence_${i}`);
        if (link) evidenceLinks.push(link);
      }

      // دمج الأدلة القديمة مع الجديدة
      const currentEvidence = userRating.evidence || [];
      const updatedEvidence = [...currentEvidence, ...evidenceLinks].slice(0, 5); // الحد الأقصى 5 صور

      try {
        await Rating.findOneAndUpdate(
          { guildId, userId: interaction.user.id },
          { evidence: updatedEvidence, updatedAt: new Date() }
        );

        // تنظيف البيانات المؤقتة
        tempEditData.delete(tempId);

        const successEmbed = new EmbedBuilder()
          .setTitle("**✅ تــم إضــافــة الــأدلــة بــنــجــاح**")
          .setDescription(`**تــم إضــافــة ${evidenceLinks.length} صــورــة جــديــدة**\n**الــعــدد الــكــلــي الآن: ${updatedEvidence.length} صــورــة**`)
          .setColor(0x00FF00)
          .setFooter({ 
            text: "Dev By Hox Devs", 
            iconURL: interaction.guild.iconURL({ dynamic: true }) 
          });

        await interaction.reply({
          embeds: [successEmbed],
          ephemeral: true
        });

      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: "**❌ حــدث خــطــأ أثــنــاء إضــافــة الــأدلــة**",
          ephemeral: true
        });
      }
    }

    // === حذف الأدلة ===
    if (interaction.isButton() && interaction.customId === "remove_evidence") {
      const userRating = await Rating.findOne({ 
        guildId, 
        userId: interaction.user.id 
      });

      if (!userRating) {
        return interaction.reply({
          content: "**❌ لــيــس لــدــيــك تــقــيــيــم لــتــعــديــلــه**",
          ephemeral: true
        });
      }

      if (!userRating.evidence || userRating.evidence.length === 0) {
        return interaction.reply({
          content: "**❌ لا تــوجــد أدلــة لــحــذفــهــا**",
          ephemeral: true
        });
      }

      const setupData = await Setup.findOne({ guildId });

      const removeEvidenceEmbed = new EmbedBuilder()
        .setTitle("**حــذف الــأدلــة**")
        .setDescription("**اخــتــر الــصــور الــتــي تــريــد حــذفــهــا**")
        .setImage(setupData.line)
        .setFooter({ 
          text: "Dev By Hox Devs", 
          iconURL: interaction.guild.iconURL({ dynamic: true }) 
        });

      const options = userRating.evidence.map((evidence, index) => ({
        label: `صــورــة ${index + 1}`,
        value: index.toString(),
        description: evidence.substring(0, 50) + "...",
        emoji: "🗑️"
      }));

      const removeRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("remove_evidence_select")
          .setPlaceholder("اخــتــر الــصــور لــحــذفــهــا")
          .setMinValues(1)
          .setMaxValues(userRating.evidence.length)
          .addOptions(options)
      );

      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("remove_all_evidence")
          .setLabel("حــذف كــل الــأدلــة")
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.reply({
        embeds: [removeEvidenceEmbed],
        components: [removeRow, confirmRow],
        ephemeral: true
      });
    }

    // === معالجة حذف الأدلة المحددة ===
    if (interaction.isStringSelectMenu() && interaction.customId === "remove_evidence_select") {
      const indicesToRemove = interaction.values.map(idx => parseInt(idx)).sort((a, b) => b - a);
      
      const userRating = await Rating.findOne({ 
        guildId, 
        userId: interaction.user.id 
      });

      if (!userRating) {
        return interaction.reply({
          content: "**❌ لــيــس لــدــيــك تــقــيــيــم لــتــعــديــلــه**",
          ephemeral: true
        });
      }

      const updatedEvidence = [...userRating.evidence];
      
      // حذف العناصر من الأعلى لأسفل لتجنب مشاكل الفهرس
      indicesToRemove.forEach(index => {
        updatedEvidence.splice(index, 1);
      });

      try {
        await Rating.findOneAndUpdate(
          { guildId, userId: interaction.user.id },
          { evidence: updatedEvidence, updatedAt: new Date() }
        );

        const successEmbed = new EmbedBuilder()
          .setTitle("**✅ تــم حــذف الــأدلــة بــنــجــاح**")
          .setDescription(`**تــم حــذف ${indicesToRemove.length} صــورــة**\n**الــعــدد الــمــتــبــقــي: ${updatedEvidence.length} صــورــة**`)
          .setColor(0x00FF00)
          .setFooter({ 
            text: "Dev By Hox Devs", 
            iconURL: interaction.guild.iconURL({ dynamic: true }) 
          });

        await interaction.update({
          embeds: [successEmbed],
          components: []
        });

      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: "**❌ حــدث خــطــأ أثــنــاء حــذف الــأدلــة**",
          ephemeral: true
        });
      }
    }

    // === حذف كل الأدلة ===
    if (interaction.isButton() && interaction.customId === "remove_all_evidence") {
      const userRating = await Rating.findOne({ 
        guildId, 
        userId: interaction.user.id 
      });

      if (!userRating) {
        return interaction.reply({
          content: "**❌ لــيــس لــدــيــك تــقــيــيــم لــتــعــديــلــه**",
          ephemeral: true
        });
      }

      try {
        await Rating.findOneAndUpdate(
          { guildId, userId: interaction.user.id },
          { evidence: [], updatedAt: new Date() }
        );

        const successEmbed = new EmbedBuilder()
          .setTitle("**✅ تــم حــذف كــل الــأدلــة بــنــجــاح**")
          .setDescription("**تــم حــذف جــمــيــع الــصــور الــمــرفــوقــة مــع الــتــقــيــيــم**")
          .setColor(0x00FF00)
          .setFooter({ 
            text: "Dev By Hox Devs", 
            iconURL: interaction.guild.iconURL({ dynamic: true }) 
          });

        await interaction.update({
          embeds: [successEmbed],
          components: []
        });

      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: "**❌ حــدث خــطــأ أثــنــاء حــذف الــأدلــة**",
          ephemeral: true
        });
      }
    }

    // === استبدال الأدلة ===
    if (interaction.isButton() && interaction.customId === "replace_evidence") {
      const userRating = await Rating.findOne({ 
        guildId, 
        userId: interaction.user.id 
      });

      if (!userRating) {
        return interaction.reply({
          content: "**❌ لــيــس لــدــيــك تــقــيــيــم لــتــعــديــلــه**",
          ephemeral: true
        });
      }

      const setupData = await Setup.findOne({ guildId });

      const replaceEvidenceEmbed = new EmbedBuilder()
        .setTitle("**اســتــبــدال الــأدلــة**")
        .setDescription("**اخــتــر عــدد الــصــور الــجــديــدة**")
        .setImage(setupData.line)
        .setFooter({ 
          text: "Dev By Hox Devs", 
          iconURL: interaction.guild.iconURL({ dynamic: true }) 
        });

      const replaceRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("replace_evidence_count")
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
        embeds: [replaceEvidenceEmbed],
        components: [replaceRow],
        ephemeral: true
      });
    }

    // === معالجة استبدال الأدلة ===
    if (interaction.isStringSelectMenu() && interaction.customId === "replace_evidence_count") {
      const evidenceCount = parseInt(interaction.values[0]);
      
      // حفظ البيانات مؤقتاً
      const tempId = `${interaction.user.id}_${Date.now()}`;
      tempEditData.set(tempId, { action: "replace_evidence", count: evidenceCount });
      
      const modal = new ModalBuilder()
        .setCustomId(`replace_evidence_modal_${tempId}`)
        .setTitle(`اســتــبــدال الــأدلــة (${evidenceCount} صــورــة)`);

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

    // === معالجة مودال استبدال الأدلة ===
    if (interaction.isModalSubmit() && interaction.customId.startsWith("replace_evidence_modal_")) {
      const tempId = interaction.customId.replace('replace_evidence_modal_', '');
      const tempData = tempEditData.get(tempId);

      if (!tempData) {
        return interaction.reply({
          content: "**❌ انــتــهــت مــدة الــجــلــســة**",
          ephemeral: true
        });
      }

      const userRating = await Rating.findOne({ 
        guildId, 
        userId: interaction.user.id 
      });

      if (!userRating) {
        return interaction.reply({
          content: "**❌ لــيــس لــدــيــك تــقــيــيــم لــتــعــديــلــه**",
          ephemeral: true
        });
      }

      const evidenceLinks = [];
      for (let i = 1; i <= tempData.count; i++) {
        const link = interaction.fields.getTextInputValue(`evidence_${i}`);
        if (link) evidenceLinks.push(link);
      }

      try {
        await Rating.findOneAndUpdate(
          { guildId, userId: interaction.user.id },
          { evidence: evidenceLinks, updatedAt: new Date() }
        );

        // تنظيف البيانات المؤقتة
        tempEditData.delete(tempId);

        const successEmbed = new EmbedBuilder()
          .setTitle("**✅ تــم اســتــبــدال الــأدلــة بــنــجــاح**")
          .setDescription(`**تــم اســتــبــدال جــمــيــع الــصــور بـ ${evidenceLinks.length} صــورــة جــديــدة**`)
          .setColor(0x00FF00)
          .setFooter({ 
            text: "Dev By Hox Devs", 
            iconURL: interaction.guild.iconURL({ dynamic: true }) 
          });

        await interaction.reply({
          embeds: [successEmbed],
          ephemeral: true
        });

      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: "**❌ حــدث خــطــأ أثــنــاء اســتــبــدال الــأدلــة**",
          ephemeral: true
        });
      }
    }

    // تنظيف البيانات المؤقتة القديمة
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of tempEditData.entries()) {
        const timestamp = parseInt(key.split('_')[1]);
        if (now - timestamp > 15 * 60 * 1000) { // 15 دقيقة
          tempEditData.delete(key);
        }
      }
    }, 5 * 60 * 1000); // كل 5 دقائق
  }
};