const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const { Punishment, Report, OrderCooldown } = require('../../Mangodb/order-reports.js');

// 🕐 محول المدة
function parseDuration(input) {
  const match = input.match(/^(\d+)(m|h|d|w|mo|y)$/i);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 'm': return value * 60 * 1000;          // دقيقة
    case 'h': return value * 60 * 60 * 1000;     // ساعة
    case 'd': return value * 24 * 60 * 60 * 1000;// يوم
    case 'w': return value * 7 * 24 * 60 * 60 * 1000;// أسبوع
    case 'mo': return value * 30 * 24 * 60 * 60 * 1000;// شهر تقريبي
    case 'y': return value * 365 * 24 * 60 * 60 * 1000;// سنة تقريبية
    default: return null;
  }
}

module.exports = {
  name: "interactionCreate",
  once: false,

  async execute(client, interaction) {
    if (interaction.customId === "order-owner" && interaction.isButton()) {
      // البحث عن المستخدم المذكور في الرسالة
      const messageContent = interaction.message.content;
      const userMentionMatch = messageContent.match(/<@!?(\d+)>/);
      const targetUserId = userMentionMatch ? userMentionMatch[1] : null;
      
      if (!targetUserId) {
        return interaction.reply({
          content: 'لم يتم العثور على صاحب الطلب في هذه الرسالة',
          ephemeral: true
        });
      }

      const cooldown = await OrderCooldown.findOne({
        userId: interaction.user.id,
        targetId: targetUserId
      });

      if (cooldown && (Date.now() - cooldown.lastContact) < 7200000) {
        const remainingTime = Math.ceil((7200000 - (Date.now() - cooldown.lastContact)) / 60000);
        return interaction.reply({
          content: `⏰ لازم تــنــتــظــر ${remainingTime} دقــيــقــة قــبــل مــا تــتــواصــل مــع نــفــس الــشــخــص مــره ثــانــيــة`,
          ephemeral: true
        });
      }

      const modal = new ModalBuilder()
        .setCustomId(`contact_order_owner:${targetUserId}`)
        .setTitle('الــتــواصــل مــع صــاحــب الــطــلــب');

      const messageInput = new TextInputBuilder()
        .setCustomId('contact_message')
        .setLabel('رســالــتــك')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000)
        .setPlaceholder('اكتب تفاصيل عرضك / سعرك هنا...');

      modal.addComponents(new ActionRowBuilder().addComponents(messageInput));
      await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('contact_order_owner:')) {
      await interaction.deferReply({ ephemeral: true });

      const [_, targetUserId] = interaction.customId.split(':');
      const messageContent = interaction.fields.getTextInputValue('contact_message');
      
      try {
        const targetUser = await client.users.fetch(targetUserId);

        const contactEmbed = new EmbedBuilder()
          .setTitle('رســالــة جــديــدة بــ خــصــوص طــلــبــك')
          .addFields(
            { name: 'الــرســالــة', value: messageContent, inline: false },
            { name: 'الــمــرســل', value: `${interaction.user}`, inline: true },
            { name: 'الــوقــت', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
          )
          .setFooter({ text: 'Dev By Hox Devs' });

        const contactButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('الــرد عــلــى الــمــرســل')
            .setURL(`https://discord.com/users/${interaction.user.id}`)
            .setStyle(ButtonStyle.Link),
          new ButtonBuilder()
            .setCustomId(`report_user:${interaction.user.id}:${encodeURIComponent(messageContent)}`)
            .setLabel('تــبــلــيــغ')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🚨')
        );

        await targetUser.send({
          content: '**عــنــدك رســالــة جــديــدة بــ خــصــوص طــلــبــك**',
          embeds: [contactEmbed],
          components: [contactButtons]
        });

        await OrderCooldown.findOneAndUpdate(
          { userId: interaction.user.id, targetId: targetUserId },
          { lastContact: Date.now() },
          { upsert: true, new: true }
        );

        await interaction.editReply({ content: '**تــم ارســال طــلــبــك بــنــجــاح**' });
      } catch (error) {
        console.error('Error sending message to order owner:', error);
        await interaction.editReply({ content: '**لــم اســتــطــع ارســال الــرســالــة الــى صــاحــب الــطــلــب**' });
      }
    }

    // باقي الكود يبقى كما هو...
    if (interaction.customId.startsWith('report_user:') && interaction.isButton()) {
      const [_, reportedUserId, originalMessageEncoded] = interaction.customId.split(':');
      const originalMessage = decodeURIComponent(originalMessageEncoded);

      const modal = new ModalBuilder()
        .setCustomId(`report_modal:${reportedUserId}:${originalMessageEncoded}`)
        .setTitle('بــلاغ عــن مــســتــخــدم');

      const reasonInput = new TextInputBuilder()
        .setCustomId('report_reason')
        .setLabel('ســبــب الــبــلاغ')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(500);

      modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
      await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('report_modal:')) {
      await interaction.deferReply({ ephemeral: true });
      const [_, reportedUserId, originalMessageEncoded] = interaction.customId.split(':');
      const originalMessage = decodeURIComponent(originalMessageEncoded);
      const reason = interaction.fields.getTextInputValue('report_reason');
      const reportChannelId = '1412454590485500127';

      const reportEmbed = new EmbedBuilder()
        .setTitle('🚨 بــلاغ جــديــد')
        .addFields(
          { name: 'الــمــبــلــغ', value: `${interaction.user}`, inline: true },
          { name: 'الــمــبــلــغ عــنــه', value: `<@${reportedUserId}>`, inline: true },
          { name: 'ســبــب الــبــلاغ', value: reason, inline: false },
          { name: 'الــرســالــة', value: originalMessage || 'غير متوفرة', inline: false },
          { name: 'الــوقــت', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setFooter({ text: 'Dev By Hox Devs' });

      const punishmentButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`punish_reporter:${interaction.user.id}`)
          .setLabel('مــعــاقــبــة الــمــبــلــغ')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('⚖️'),
        new ButtonBuilder()
          .setCustomId(`punish_reported:${reportedUserId}`)
          .setLabel('مــعــاقــبــة الــمــبــلــغ عــنــه')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('⚖️')
      );

      const reportChannel = await client.channels.fetch(reportChannelId);
      if (reportChannel) {
        await reportChannel.send({ embeds: [reportEmbed], components: [punishmentButtons] });
      }

      await new Report({
        reporterId: interaction.user.id,
        reportedId: reportedUserId,
        reason,
        messageContent: originalMessage,
        status: 'pending'
      }).save();

      await interaction.editReply({ content: '**تــم إرســال الــبــلاغ بــنــجــاح**' });
    }

    if (interaction.customId.startsWith('punish_') && interaction.isButton()) {
      const [_, type, userId] = interaction.customId.split(':');

      const modal = new ModalBuilder()
        .setCustomId(`punish_modal:${type}:${userId}`)
        .setTitle('تــحــديــد مــدة الــعــقــوبــة');

      const durationInput = new TextInputBuilder()
        .setCustomId('punishment_duration')
        .setLabel('مــدة الــعــقــوبــة')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(durationInput));
      await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('punish_modal:')) {
      await interaction.deferReply({ ephemeral: true });

      const [_, type, userId] = interaction.customId.split(':');
      const inputDuration = interaction.fields.getTextInputValue('punishment_duration');
      const durationMs = parseDuration(inputDuration);

      if (!durationMs) {
        return interaction.editReply({ content: '**صيغة المدة غير صحيحة (مثال: 30m, 2h, 7d, 1w, 3mo, 1y)**' });
      }

      const endsAt = new Date(Date.now() + durationMs);

      await new Punishment({
        userId,
        type: type.includes('reporter') ? 'reporter' : 'reported',
        duration: inputDuration,
        endsAt,
        punishedBy: interaction.user.id
      }).save();

      await Report.findOneAndUpdate(
        { $or: [{ reporterId: userId }, { reportedId: userId }] },
        { status: 'resolved' }
      );

      try {
        const user = await client.users.fetch(userId);
        const punishEmbed = new EmbedBuilder()
          .setTitle('⚖️ تــم عــقــوبــتــك')
          .addFields(
            { name: 'الــمــدة', value: inputDuration, inline: true },
            { name: 'تــنــتــهــي فــي', value: `<t:${Math.floor(endsAt.getTime() / 1000)}:F>`, inline: true },
            { name: 'الــمــســؤؤل', value: `${interaction.user}`, inline: true }
          )
          .setColor('#ff0000')
          .setFooter({ text: 'Dev By Hox Devs' });

        await user.send({ embeds: [punishEmbed] });
      } catch {}

      await interaction.editReply({ content: `**تــم تــطــبــيــق الــعــقــوبــة عــلــي <@${userId}> بــنــجــاح**` });
    }
  }
};