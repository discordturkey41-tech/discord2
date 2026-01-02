const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");
const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js");
const VacationRequest = require("../../Mangodb/vacationRequests.js");
const SaleState = require('../../Mangodb/saleState.js');
const Logs = require("../../Mangodb/logs.js");

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(client, interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.guild) return;

    const guildId = interaction.guild.id;

    // زر طلب إجازة
    if (interaction.customId === "request_vacation") {
      await handleVacationRequest(client, interaction);
    }

    // زر قبول الإجازة
    if (interaction.customId.startsWith("approve_vacation_")) {
      await handleApproveVacation(client, interaction);
    }

    // زر رفض الإجازة
    if (interaction.customId.startsWith("reject_vacation_")) {
      await handleRejectVacation(client, interaction);
    }
  }
};

async function handleVacationRequest(client, interaction) {
  const guildId = interaction.guild.id;
  const channelId = interaction.channel.id;

  const shopData = await Shop.findOne({ guildId, channelId });
  if (!shopData) {
    return interaction.reply({
      content: "❌ هـذه الـروم لـيست مـتـجـر",
      ephemeral: true
    });
  }

const saleState = await SaleState.findOne({
    guildId: interaction.guild.id,
    type: "vacation_request"
});

if (saleState?.state === "disable") {
    return interaction.reply({
        content: "**خــدمــة طــلــب اجــازة مــعــطــلــة حالياً**",
        ephemeral: true
    });
}
  // التحقق من أن المستخدم هو المالك أو شريك
  if (interaction.user.id !== shopData.ownerId && 
      (!shopData.partners || !shopData.partners.includes(interaction.user.id))) {
    return interaction.reply({
      content: "**❌ فقط المالك أو الشركاء يمكنهم طلب إجازة**",
      ephemeral: true
    });
  }

  // التحقق من عدم وجود إجازة نشطة
  if (shopData.vacation === '0') {
    return interaction.reply({
      content: "**❌ المتجر بالفعل في إجازة**",
      ephemeral: true
    });
  }

  // بدء جمع بيانات الإجازة
  await interaction.reply({
    content: "**📝 الرجـاء كـتـابـة سـبـب الإجـازة**",
    ephemeral: true
  });

  const filter = m => m.author.id === interaction.user.id;
  const collector = interaction.channel.createMessageCollector({
    filter,
    time: 60000,
    max: 1
  });

  collector.on("collect", async (message) => {
    const reason = message.content.trim();
    
    if (reason.length > 500) {
      await interaction.followUp({
        content: "**❌ السـبـب طـويـل جـداً! الـرجـاء اخـتـيـار سـبـب أقـصـاهـا 500 حـرف**",
        ephemeral: true
      });
      await message.delete().catch(() => {});
      return;
    }

    // حفظ السبب مؤقتاً والمضي للخطوة التالية
    await interaction.followUp({
      content: "**⏰ الرجـاء كـتـابـة مـدة الإجـازة\nمـثـل: `1d` لـيـوم، `2h` لـسـاعـتـيـن، `1w` لأسـبـوع**",
      ephemeral: true
    });

    const durationCollector = interaction.channel.createMessageCollector({
      filter,
      time: 60000,
      max: 1
    });

    durationCollector.on("collect", async (durationMessage) => {
      const duration = durationMessage.content.trim();
      
      if (!/^\d+[smhdw]$/.test(duration)) {
        await interaction.followUp({
          content: "**❌ صـيـغـة الـوقـت غـيـر صـحـيـحـة! الـرجـاء اسـتـخـدام صـيـغـة صـحـيـحـة مـثـل: `1h`, `2d`, `1w`**",
          ephemeral: true
        });
        await message.delete().catch(() => {});
        await durationMessage.delete().catch(() => {});
        return;
      }

      // حفظ طلب الإجازة
      const vacationRequest = await VacationRequest.create({
        guildId,
        channelId,
        userId: interaction.user.id,
        username: interaction.user.username,
        reason,
        duration
      });

      // إرسال طلب الإجازة إلى اللوق
        const logsData = await Logs.findOne({ guildId: message.guild.id }); // جلب بيانات اللوجات
      if (logsData && logsData.shopLogRoom) {
        try {
          const logChannel = await client.channels.fetch(logsData.shopLogRoom);
          if (logChannel) {
            const embed = new EmbedBuilder()
              .setTitle("📋 طـلـب إجـازة جـديـد")
              .setDescription(`**تـم اسـتـلـام طـلـب إجـازة لـمـتـجـر**`)
              .addFields(
                { name: "الـمـتـجـر", value: `<#${channelId}>`, inline: true },
                { name: "طـالـب الإجـازة", value: `<@${interaction.user.id}>`, inline: true },
                { name: "سـبـب الإجـازة", value: reason, inline: false },
                { name: "مـدة الإجـازة", value: duration, inline: true },
                { name: "وقـت الطـلـب", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
              )
              .setFooter({
                text: "Dev By Hox Devs",
                iconURL: interaction.guild.iconURL({ dynamic: true })
              });

            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`approve_vacation_${vacationRequest._id}`)
                .setLabel("قـبـول الإجـازة")
                .setStyle(ButtonStyle.Success)
                .setEmoji("✅"),
              new ButtonBuilder()
                .setCustomId(`reject_vacation_${vacationRequest._id}`)
                .setLabel("رفـض الإجـازة")
                .setStyle(ButtonStyle.Danger)
                .setEmoji("❌")
            );

            await logChannel.send({
              content: `<@&${setupData.shopAdmin}>`, // منشن مسؤول المتاجر
              embeds: [embed],
              components: [row]
            });

            await interaction.followUp({
              content: "**✅ تـم إرسـال طـلـب الإجـازة لـلمـسـؤولـيـن**",
              ephemeral: true
            });
          }
        } catch (error) {
          console.error("❌ خطأ في إرسال طلب الإجازة:", error);
          await interaction.followUp({
            content: "**❌ حـدث خـطـأ فـي إرسـال طـلـب الإجـازة**",
            ephemeral: true
          });
        }
      } else {
        await interaction.followUp({
          content: "**❌ لـم يـتـم إعـداد قـنـاة اللـوق بـشـكـل صـحـيـح**",
          ephemeral: true
        });
      }

      await message.delete().catch(() => {});
      await durationMessage.delete().catch(() => {});
    });

    durationCollector.on("end", async (collected) => {
      if (collected.size === 0) {
        await interaction.followUp({
          content: "**❌ انـتـهـى الـوقـت، لـم يـتـم إدخـال أي مـدة**",
          ephemeral: true
        });
      }
    });
  });

  collector.on("end", async (collected) => {
    if (collected.size === 0) {
      await interaction.followUp({
        content: "**❌ انـتـهـى الـوقـت، لـم يـتـم إدخـال أي سـبـب**",
        ephemeral: true
      });
    }
  });
}

async function handleApproveVacation(client, interaction) {
  const requestId = interaction.customId.replace("approve_vacation_", "");
  
  const vacationRequest = await VacationRequest.findById(requestId);
  if (!vacationRequest) {
    return interaction.reply({
      content: "❌ لـم يـتـم الـعـثـور عـلـى طـلـب الإجـازة",
      ephemeral: true
    });
  }

  if (vacationRequest.status !== 'pending') {
    return interaction.reply({
      content: "❌ هـذا طـلـب الإجـازة تـمـت مـعـالـجـتـه مـسـبـقـاً",
      ephemeral: true
    });
  }

  // تحديث طلب الإجازة
  vacationRequest.status = 'approved';
  vacationRequest.reviewedAt = new Date();
  vacationRequest.reviewedBy = interaction.user.id;

  // حساب وقت انتهاء الإجازة
  const durationMs = parseDurationToMs(vacationRequest.duration);
  vacationRequest.vacationEnds = new Date(Date.now() + durationMs);

  await vacationRequest.save();

  // تحديث بيانات المتجر
  await Shop.updateOne(
    { guildId: vacationRequest.guildId, channelId: vacationRequest.channelId },
    { 
      $set: { 
        vacation: '0',
        vacationData: {
          reason: vacationRequest.reason,
          duration: vacationRequest.duration,
          requestedAt: vacationRequest.requestedAt,
          approvedAt: vacationRequest.reviewedAt,
          endsAt: vacationRequest.vacationEnds,
          approvedBy: vacationRequest.reviewedBy
        }
      }
    }
  );

  // إخفاء المتجر
  try {
    const channel = await client.channels.fetch(vacationRequest.channelId);
    await channel.permissionOverwrites.edit(channel.guild.id, { ViewChannel: false });
  } catch (error) {
    console.error("❌ خطأ في إخفاء المتجر:", error);
  }

  // إرسال رسالة للمستخدم
  try {
    const user = await client.users.fetch(vacationRequest.userId);
    await user.send({
      content: `**تـم قـبـول طـلـب الإجـازة لـمـتـجـرك <#${vacationRequest.channelId}>**\n**مـدة الإجـازة:** ${vacationRequest.duration}\n**وقـت الانـتـهاء:** <t:${Math.floor(vacationRequest.vacationEnds.getTime() / 1000)}:R>`
    });
  } catch (error) {
    console.error("❌ خطأ في إرسال رسالة للمستخدم:", error);
  }

  // تحديث الرسالة الأصلية
  const embed = EmbedBuilder.from(interaction.message.embeds[0])
    .setTitle("✅ تـم قـبـول طـلـب الإجـازة")
    .setColor(0x00FF00)
    .addFields(
      { name: "مـنـقـول بـواسـطـة", value: `<@${interaction.user.id}>`, inline: true },
      { name: "وقـت الـقـبـول", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
    );

  await interaction.update({
    embeds: [embed],
    components: []
  });

}

async function handleRejectVacation(client, interaction) {
  const requestId = interaction.customId.replace("reject_vacation_", "");
  
  const vacationRequest = await VacationRequest.findById(requestId);
  if (!vacationRequest) {
    return interaction.reply({
      content: "❌ لـم يـتـم الـعـثـور عـلـى طـلـب الإجـازة",
      ephemeral: true
    });
  }

  if (vacationRequest.status !== 'pending') {
    return interaction.reply({
      content: "❌ هـذا طـلـب الإجـازة تـمـت مـعـالـجـتـه مـسـبـقـاً",
      ephemeral: true
    });
  }

  // إنشاء modal لإدخال سبب الرفض
  const modal = new ModalBuilder()
    .setCustomId(`reject_reason_${requestId}`)
    .setTitle("سـبـب رفـض الإجـازة");

  const reasonInput = new TextInputBuilder()
    .setCustomId("reject_reason")
    .setLabel("الـرجـاء كـتـابـة سـبـب الـرفـض")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(500);

  const actionRow = new ActionRowBuilder().addComponents(reasonInput);
  modal.addComponents(actionRow);

  await interaction.showModal(modal);

  // معالجة الرد من Modal
  const filter = (i) => i.customId === `reject_reason_${requestId}`;
  interaction.awaitModalSubmit({ filter, time: 60000 })
    .then(async (modalInteraction) => {
      const rejectReason = modalInteraction.fields.getTextInputValue("reject_reason");

      // تحديث طلب الإجازة
      vacationRequest.status = 'rejected';
      vacationRequest.reviewedAt = new Date();
      vacationRequest.reviewedBy = modalInteraction.user.id;
      vacationRequest.rejectedReason = rejectReason;
      await vacationRequest.save();

      // إرسال رسالة للمستخدم
      try {
        const user = await client.users.fetch(vacationRequest.userId);
        await user.send({
          content: `**❌ تـم رفـض طـلـب الإجـازة لـمـتـجـرك <#${vacationRequest.channelId}>**\n**سـبـب الـرفـض:** ${rejectReason}`
        });
      } catch (error) {
        console.error("❌ خطأ في إرسال رسالة للمستخدم:", error);
      }

      // تحديث الرسالة الأصلية
      const embed = EmbedBuilder.from(interaction.message.embeds[0])
        .setTitle("❌ تـم رفـض طـلـب الإجـازة")
        .setColor(0xFF0000)
        .addFields(
          { name: "مـرفـوض بـواسـطـة", value: `<@${modalInteraction.user.id}>`, inline: true },
          { name: "سـبـب الـرفـض", value: rejectReason, inline: false },
          { name: "وقـت الـرفـض", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        );

      await modalInteraction.update({
        embeds: [embed],
        components: []
      });
    })
    .catch(console.error);
}

function parseDurationToMs(durationStr) {
  const timeUnits = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000
  };

  const match = durationStr.match(/^(\d+)([smhdw])$/);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2];

  return value * timeUnits[unit];
}
