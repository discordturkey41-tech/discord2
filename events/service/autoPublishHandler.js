const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const AutoPublish = require("../../Mangodb/autoPublish.js");
const Shop = require("../../Mangodb/shop.js");
const { updateAutoPublish } = require("../../handlers/autoPublishSystem");

const SaleState = require('../../Mangodb/saleState.js');

function parseTime(timeStr) {
  const timeUnits = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000
  };

  const match = timeStr.match(/^(\d+)([smhdw])$/);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2];

  return value * timeUnits[unit];
}

function getMentionTypeName(type) {
  const types = {
    'everyone': '@everyone',
    'here': '@here',
    'shop': 'منـشـن الـمـتـجـر',
    'none': 'بـدون مـنـشـن'
  };
  return types[type] || 'بـدون مـنـشـن';
}

function formatMaxTimes(maxTimes) {
  return maxTimes === null || maxTimes === undefined ? "للأبد ♾️" : `${maxTimes} مرة`;
}

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(client, interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.guild) return;

    const guildId = interaction.guild.id;

    // زر إدارة النشر التلقائي
    if (interaction.customId === "auto-publish-manage") {
      await handleAutoPublishManage(interaction);
    }

    // تفعيل/تعطيل النشر
    if (interaction.customId === "toggle_auto_publish") {
      await handleToggleAutoPublish(client, interaction);
    }

    // زر وقت النشر
    if (interaction.customId === "set_publish_interval") {
      await handleSetPublishInterval(client, interaction);
    }

    // زر رسالة النشر
    if (interaction.customId === "set_publish_message") {
      await handleSetPublishMessage(client, interaction);
    }

    // زر عدد المرات
    if (interaction.customId === "set_max_times") {
      await handleSetMaxTimes(interaction);
    }

    // زر عدد مرات محدد (1-10)
    if (interaction.customId.startsWith("max_times_")) {
      await handleMaxTimesButton(client, interaction);
    }

    // زر الرومات
    if (interaction.customId === "set_channels") {
      await handleSetChannels(client, interaction);
    }

    // زر رومات محدد
    if (interaction.customId.startsWith("shop_channel_")) {
      await handleShopChannelButton(client, interaction);
    }

    // زر تأكيد المنشن
    if (interaction.customId.startsWith("5351/co56nfirm_mention_")) {
      await handleConfirmMention(client, interaction);
    }
  }
};

// ========== دالة إدارة النشر الرئيسية ==========
async function handleAutoPublishManage(interaction) {
  const guildId = interaction.guild.id;
  const channelId = interaction.channel.id;

  const shopData = await Shop.findOne({ guildId, channelId: interaction.channel.id });
  if (!shopData) {
    return interaction.reply({
      content: "❌ هـذه الـروم لـيست مـتـجـر",
      ephemeral: true
    });
  }

  const isOwner = interaction.user.id === shopData.ownerId;
  const isPartner = shopData.partners && shopData.partners.includes(interaction.user.id);
  
  if (!isOwner && !isPartner) {
    return interaction.reply({
      content: "**انــت مــالــك بــ الــمــتــجــر\n يــلا روح اشــحــت بــعــيــد**",
      ephemeral: true
    });
  }

  const saleState = await SaleState.findOne({
    guildId: interaction.guild.id,
    type: "auto_post"
  });

  if (saleState?.state === "disable") {
    return interaction.reply({
      content: "**خــدمــة نــشــر تــلــقــائــي مــعــطــلــة حالياً**",
      ephemeral: true
    });
  }

  const autoPublishData = await AutoPublish.findOne({ guildId, channelId });
  
  // الحصول على جميع الرومات التي تم تفعيل النشر لها في هذا السيرفر
  const allChannelsData = await AutoPublish.find({ guildId, enabled: true });
  
  // جلب فقط الرومات التي فيها رسالة (أي التي سيتم النشر فيها)
  const channelsWithMessage = allChannelsData.filter(data => data.message && data.message.trim() !== "");
  const channelsList = channelsWithMessage.map(data => {
    const channel = interaction.guild.channels.cache.get(data.channelId);
    return channel ? `- <#${data.channelId}>` : `- ${data.channelId}`;
  }).join('\n') || "لا توجد رومات بها رسالة للنشر";
  
  // إعداد نص الفوتر
  const footerText = `Dev By Hox Devs | الرومات للنشر: ${channelsWithMessage.length}`;
  
  // إعداد الوصف بناءً على الرسالة
  const description = autoPublishData?.message 
    ? `**<a:hox_star_pink:1326824571130613771> الرسـالـة المضـبـوطـة: ${autoPublishData.message} <a:hox_star_purble:1326824672817319969>**`
    : "**<a:hox_star_pink:1326824571130613771> اخــتــر الــعــمــلــيــة الــتــي تــريــدهــا <a:hox_star_purble:1326824672817319969>**";
  
  const embed = new EmbedBuilder()
    .setTitle("إدارة الـنـشـر الـتـلـقـائـي")
    .setDescription(description)
    .addFields(
      { 
        name: "الـحـالة", 
        value: autoPublishData?.enabled ? "**مـفـعـل** <a:yes:1405131777948909599>" : "**غـيـر مـفـعـل** <a:no:1405131885146800148>", 
        inline: true 
      },
      { 
        name: "الـوقـت", 
        value: autoPublishData?.interval || "لـيـس مـعـيـن", 
        inline: true 
      },
      { 
        name: "الـمـنـشـن", 
        value: getMentionTypeName(autoPublishData?.mentionType || 'none'), 
        inline: true 
      },
      { 
        name: "عـدد الـمـرات", 
        value: formatMaxTimes(autoPublishData?.maxTimes), 
        inline: true 
      },
      {
        name: "📋 الـرومـات الـتـي سـيـتـم الـنـشـر فـيـهـا",
        value: channelsList.length > 1024 ? `${channelsWithMessage.length} روم` : channelsList,
        inline: false
      }
    )
    .setFooter({
      text: footerText,
      iconURL: interaction.guild.iconURL({ dynamic: true })
    });

  // الصف الأول: زر التفعيل/التعطيل فقط
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("toggle_auto_publish")
      .setLabel(autoPublishData?.enabled ? "تعـطـيـل الـنـشـر" : "تفـعـيـل الـنـشـر")
      .setStyle(autoPublishData?.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
      .setEmoji(autoPublishData?.enabled ? "<a:no:1405131885146800148>" : "<a:yes:1405131777948909599>")
  );

  // الصف الثاني: الوقت، الرسالة، عدد المرات، الرومات
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("set_publish_interval")
      .setLabel("وقـت الـنـشـر")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("⏰"),
    new ButtonBuilder()
      .setCustomId("set_publish_message")
      .setLabel("رسـالـة الـنـشـر")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("📝"),
    new ButtonBuilder()
      .setCustomId("set_max_times")
      .setLabel("عـدد الـمـرات")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🔢"),
    new ButtonBuilder()
      .setCustomId("set_channels")
      .setLabel("الـرومـات")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("📁")
  );

  return interaction.reply({
    embeds: [embed],
    components: [row1, row2],
    ephemeral: true
  });
}

// ========== دالة تفعيل/تعطيل النشر ==========
async function handleToggleAutoPublish(client, interaction) {
  const guildId = interaction.guild.id;
  const channelId = interaction.channel.id;

  const shopData = await Shop.findOne({ guildId, channelId });
  if (!shopData) {
    return interaction.reply({
      content: "❌ هـذه الـروم لـيست مـتـجـر",
      ephemeral: true
    });
  }

  const isOwner = interaction.user.id === shopData.ownerId;
  const isPartner = shopData.partners && shopData.partners.includes(interaction.user.id);
  
  if (!isOwner && !isPartner) {
    return interaction.reply({
      content: "**انــت مــالــك بــ الــمــتــجــر\n يــلا روح اشــحــت بــعــيــد**",
      ephemeral: true
    });
  }

  const saleState = await SaleState.findOne({
    guildId: interaction.guild.id,
    type: "auto_post"
  });

  if (saleState?.state === "disable") {
    return interaction.reply({
      content: "**خــدمــة نــشــر تــلــقــائــي مــعــطــلــة حالياً**",
      ephemeral: true
    });
  }

  let autoPublishData = await AutoPublish.findOne({ guildId, channelId });
  
  if (!autoPublishData) {
    autoPublishData = await AutoPublish.create({
      guildId,
      channelId,
      enabled: true,
      setBy: {
        userId: interaction.user.id,
        username: interaction.user.username,
        avatar: interaction.user.displayAvatarURL({ format: 'png', size: 512 })
      }
    });
  } else {
    autoPublishData.enabled = !autoPublishData.enabled;
    await autoPublishData.save();
  }

  // تحديث النظام مباشرة بدون إعادة تشغيل
  if (autoPublishData.enabled) {
    await updateAutoPublish(client, guildId, channelId);
  } else {
    const { stopAutoPublish } = require("../../handlers/autoPublishSystem");
    stopAutoPublish(guildId, channelId);
  }

  await interaction.update({
    content: `**تـم ${autoPublishData.enabled ? 'تفـعـيـل' : 'تعـطـيـل'} الـنـشـر الـتـلـقـائـي بـنـجـاح**`,
    embeds: [],
    components: []
  });

  // تحديث الرسالة للإعادة لعرض القائمة الرئيسية
  setTimeout(async () => {
    await handleAutoPublishManage(interaction);
  }, 1000);
}

// ========== دالة وقت النشر ==========
async function handleSetPublishInterval(client, interaction) {
  const guildId = interaction.guild.id;
  const channelId = interaction.channel.id;

  const shopData = await Shop.findOne({ guildId, channelId });
  if (!shopData) {
    return interaction.reply({
      content: "❌ هـذه الـروم لـيست مـتـجـر",
      ephemeral: true
    });
  }

  const isOwner = interaction.user.id === shopData.ownerId;
  const isPartner = shopData.partners && shopData.partners.includes(interaction.user.id);
  
  if (!isOwner && !isPartner) {
    return interaction.reply({
      content: "**انــت مــالــك بــ الــمــتــجــر\n يــلا روح اشــحــت بــعــيــد**",
      ephemeral: true
    });
  }

  await interaction.reply({
    content: "**⏰ الرجـاء كـتـابـة الـوقـت الـذي تـريـده لـلـنـشـر الـتـلـقـائـي\nمـثـل: `1h` لـسـاعـة، `30m` لـثـلاثـين دقـيـقـة، `1w` لـأسـبـوع**",
    ephemeral: true
  });

  const filter = m => m.author.id === interaction.user.id;
  const collector = interaction.channel.createMessageCollector({
    filter,
    time: 60000,
    max: 1
  });

  collector.on("collect", async (message) => {
    const timeInput = message.content.trim();
    
    if (!/^\d+[smhdw]$/.test(timeInput)) {
      await interaction.followUp({
        content: "**❌ صـيـغـة الـوقـت غـيـر صـحـيـحـة! الـرجـاء اسـتـخـدام صـيـغـة صـحـيـحـة مـثـل: `1h`, `30m`, `2d`**",
        ephemeral: true
      });
      
      await message.delete().catch(() => {});
      return;
    }

    const timeMs = parseTime(timeInput);
    if (!timeMs || timeMs < 60000) {
      await interaction.followUp({
        content: "**❌ الـوقـت غـيـر صـالـح! الـرجـاء اخـتـيـار وقـت لا يـقـل عـن دقـيـقـة واحـدة**",
        ephemeral: true
      });
      
      await message.delete().catch(() => {});
      return;
    }

    // تحديث بيانات النشر التلقائي - بدون تغيير حالة التفعيل
    let autoPublishData = await AutoPublish.findOne({ guildId, channelId });
    if (!autoPublishData) {
      autoPublishData = await AutoPublish.create({
        guildId,
        channelId,
        interval: timeInput,
        enabled: true, // يظل مفعلاً تلقائياً
        setBy: {
          userId: interaction.user.id,
          username: interaction.user.username,
          avatar: interaction.user.displayAvatarURL({ format: 'png', size: 512 })
        }
      });
    } else {
      autoPublishData.interval = timeInput;
      // لا نغير حالة التفعيل، نتركها كما هي
      await autoPublishData.save();
    }

    // تحديث النظام مباشرة فقط إذا كان مفعلاً
    if (autoPublishData.enabled) {
      await updateAutoPublish(client, guildId, channelId);
    }

    await interaction.followUp({
      content: `**✅ تـم ضـبـط وقـت الـنـشـر الـتـلـقـائـي إلـى: \`${timeInput}\`**`,
      ephemeral: true
    });

    await message.delete().catch(() => {});
    
    // تحديث الرسالة للإعادة لعرض القائمة الرئيسية
    setTimeout(async () => {
      await handleAutoPublishManage(interaction);
    }, 1000);
  });

  collector.on("end", async (collected) => {
    if (collected.size === 0) {
      await interaction.followUp({ 
        content: "**❌ انـتـهـى الـوقـت، لـم يـتـم إدخـال أي وقـت**", 
        ephemeral: true 
      });
    }
  });
}

// ========== دالة رسالة النشر ==========
async function handleSetPublishMessage(client, interaction) {
  const guildId = interaction.guild.id;
  const channelId = interaction.channel.id;

  const shopData = await Shop.findOne({ guildId, channelId });
  if (!shopData) {
    return interaction.reply({
      content: "❌ هـذه الـروم لـيست مـتـجـر",
      ephemeral: true
    });
  }

  const isOwner = interaction.user.id === shopData.ownerId;
  const isPartner = shopData.partners && shopData.partners.includes(interaction.user.id);
  
  if (!isOwner && !isPartner) {
    return interaction.reply({
      content: "**انــت مــالــك بــ الــمــتــجــر\n يــلا روح اشــحــت بــعــيــد**",
      ephemeral: true
    });
  }

  await interaction.reply({
    content: "**📝 الرجـاء كـتـابـة الـرسـالـة الـتي تـريـد نـشـرهـا تـلـقـائـيـاً**",
    ephemeral: true
  });

  const filter = m => m.author.id === interaction.user.id;
  const collector = interaction.channel.createMessageCollector({
    filter,
    time: 120000,
    max: 1
  });

  collector.on("collect", async (message) => {
    const publishMessage = message.content.trim();
    
    if (publishMessage.length > 2000) {
      await interaction.followUp({
        content: "**❌ الـرسـالـة طـويـلـة جـداً! الـرجـاء اخـتـيـار رسـالـة أقصـاهـا 2000 حـرف**",
        ephemeral: true
      });
      
      await message.delete().catch(() => {});
      return;
    }

    let autoPublishData = await AutoPublish.findOne({ guildId, channelId });
    if (!autoPublishData) {
      autoPublishData = await AutoPublish.create({
        guildId,
        channelId,
        message: publishMessage,
        enabled: true, // يظل مفعلاً تلقائياً
        setBy: {
          userId: interaction.user.id,
          username: interaction.user.username,
          avatar: interaction.user.displayAvatarURL({ format: 'png', size: 512 })
        }
      });
    } else {
      autoPublishData.message = publishMessage;
      // لا نغير حالة التفعيل، نتركها كما هي
      await autoPublishData.save();
    }

    // تحديث النظام مباشرة فقط إذا كان مفعلاً
    if (autoPublishData.enabled) {
      await updateAutoPublish(client, guildId, channelId);
    }

    const mentionEmbed = new EmbedBuilder()
      .setTitle("اخـتـيـار نـوع الـمـنـشـن")
      .setDescription("**📢 اخـتـر نـوع الـمـنـشـن الـذي تـريـده مـع الـرسـالـة الـتـلـقـائـيـة**")
      .addFields(
        { name: "الـرسـالـة الـمـضـبـوطـة", value: publishMessage.length > 0 ? publishMessage : "**❌ لـم تـضـبـط أي رسـالـة**" }
      )
      .setFooter({
        text: "Dev By Hox Devs",
        iconURL: interaction.guild.iconURL({ dynamic: true })
      });

    const mentionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("5351/co56nfirm_mention_everyone")
        .setLabel("@everyone")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("5351/co56nfirm_mention_here")
        .setLabel("@here")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("5351/co56nfirm_mention_shop")
        .setLabel("مـنـشـن الـمـتـجـر")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("5351/co56nfirm_mention_none")
        .setLabel("بـدون مـنـشـن")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.followUp({
      embeds: [mentionEmbed],
      components: [mentionRow],
      ephemeral: true
    });

    await message.delete().catch(() => {});
  });

  collector.on("end", async (collected) => {
    if (collected.size === 0) {
      await interaction.followUp({ 
        content: "**❌ انـتـهـى الـوقـت، لـم يـتـم إدخـال أي رسـالـة**", 
        ephemeral: true 
      });
    }
  });
}

// ========== دالة عدد المرات ==========
async function handleSetMaxTimes(interaction) {
  const guildId = interaction.guild.id;
  const channelId = interaction.channel.id;

  const shopData = await Shop.findOne({ guildId, channelId });
  if (!shopData) {
    return interaction.reply({
      content: "❌ هـذه الـروم لـيست مـتـجـر",
      ephemeral: true
    });
  }

  const isOwner = interaction.user.id === shopData.ownerId;
  const isPartner = shopData.partners && shopData.partners.includes(interaction.user.id);
  
  if (!isOwner && !isPartner) {
    return interaction.reply({
      content: "**انــت مــالــك بــ الــمــتــجــر\n يــلا روح اشــحــت بــعــيــد**",
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setTitle("🔢 تحديد عدد مرات النشر")
    .setDescription("**اختر عدد المرات التي تريد أن ينشر فيها النظام الرسالة:\n(بعد الوصول للحد الأقصى سيتوقف النظام تلقائياً)**")
    .setFooter({
      text: "Dev By Hox Devs",
      iconURL: interaction.guild.iconURL({ dynamic: true })
    });

  // إنشاء 11 زر (1-10 + للأبد)
  const rows = [];
  let currentRow = new ActionRowBuilder();
  let buttonCount = 0;

  for (let i = 1; i <= 10; i++) {
    currentRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`max_times_${i}`)
        .setLabel(`${i}`)
        .setStyle(ButtonStyle.Secondary)
    );
    buttonCount++;

    if (buttonCount === 5 || i === 10) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
      buttonCount = 0;
    }
  }

  // زر للأبد
  const lastRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("max_times_forever")
      .setLabel("للأبد ♾️")
      .setStyle(ButtonStyle.Success)
  );
  rows.push(lastRow);

  await interaction.reply({
    embeds: [embed],
    components: rows,
    ephemeral: true
  });
}

// ========== دالة معالجة زر عدد المرات ==========
async function handleMaxTimesButton(client, interaction) {
  const guildId = interaction.guild.id;
  const channelId = interaction.channel.id;
  const maxTimes = interaction.customId.replace("max_times_", "");

  let autoPublishData = await AutoPublish.findOne({ guildId, channelId });
  if (!autoPublishData) {
    autoPublishData = await AutoPublish.create({
      guildId,
      channelId,
      enabled: true,
      setBy: {
        userId: interaction.user.id,
        username: interaction.user.username,
        avatar: interaction.user.displayAvatarURL({ format: 'png', size: 512 })
      }
    });
  }

  // تعيين عدد المرات
  if (maxTimes === "forever") {
    autoPublishData.maxTimes = null; // للأبد
  } else {
    autoPublishData.maxTimes = parseInt(maxTimes);
  }

  // إعادة تعيين عدد المرات المنشورة
  autoPublishData.timesPublished = 0;
  // لا نغير حالة التفعيل، نتركها كما هي
  await autoPublishData.save();

  // تحديث النظام مباشرة فقط إذا كان مفعلاً
  if (autoPublishData.enabled) {
    await updateAutoPublish(client, guildId, channelId);
  }

  await interaction.update({
    content: `**✅ تم ضبط عدد مرات النشر إلى: ${formatMaxTimes(autoPublishData.maxTimes)}**`,
    embeds: [],
    components: []
  });
  
  // تحديث الرسالة للإعادة لعرض القائمة الرئيسية
  setTimeout(async () => {
    await handleAutoPublishManage(interaction);
  }, 1000);
}

// ========== دالة الرومات ==========
async function handleSetChannels(client, interaction) {
  const guildId = interaction.guild.id;

  // جلب جميع المتاجر في السيرفر
  const shops = await Shop.find({ guildId, status: "1" });

  if (shops.length === 0) {
    return interaction.reply({
      content: "**لا يوجد متاجر مفعلة في هذا السيرفر**",
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setTitle("📁 تحديد الرومات للنشر")
    .setDescription("**اختر المتاجر التي تريد إضافة نظام النشر لها:**")
    .setFooter({
      text: `Dev By Hox Devs | ${shops.length} متجر متاح`,
      iconURL: interaction.guild.iconURL({ dynamic: true })
    });

  // إنشاء أزرار للمتاجر
  const rows = [];
  let currentRow = new ActionRowBuilder();
  let buttonCount = 0;

  for (const shop of shops) {
    const channel = interaction.guild.channels.cache.get(shop.channelId);
    if (!channel) continue;

    // اختصار اسم القناة إذا كان طويلاً
    const channelName = channel.name.length > 10 
      ? channel.name.substring(0, 8) + ".." 
      : channel.name;

    currentRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`shop_channel_${shop.channelId}`)
        .setLabel(`#${channelName}`)
        .setStyle(ButtonStyle.Secondary)
    );
    buttonCount++;

    if (buttonCount === 5) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
      buttonCount = 0;
    }
  }

  // إضافة الصف الأخير إذا كان فيه أزرار
  if (buttonCount > 0) {
    rows.push(currentRow);
  }

  // زر إضافة لكل المتاجر
  const allShopsRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("shop_channel_all")
      .setLabel("جميع المتاجر 🛒")
      .setStyle(ButtonStyle.Success)
  );
  rows.push(allShopsRow);

  await interaction.reply({
    embeds: [embed],
    components: rows,
    ephemeral: true
  });
}

// ========== دالة معالجة زر الرومات ==========
async function handleShopChannelButton(client, interaction) {
  const guildId = interaction.guild.id;
  const channelId = interaction.channel.id;
  const selectedChannel = interaction.customId.replace("shop_channel_", "");

  if (selectedChannel === "all") {
    // جلب جميع المتاجر
    const shops = await Shop.find({ guildId, status: "1" });
    let addedCount = 0;
    let updatedCount = 0;
    
    // جلب بيانات النشر الحالية للقناة الحالية
    const currentAutoPublishData = await AutoPublish.findOne({ guildId, channelId });
    
    for (const shop of shops) {
      let autoPublishData = await AutoPublish.findOne({ guildId, channelId: shop.channelId });
      
      if (!autoPublishData) {
        // إنشاء إعدادات النشر التلقائي لكل متجر
        const newAutoPublishData = {
          guildId,
          channelId: shop.channelId,
          enabled: true, // نفعله تلقائياً
          setBy: {
            userId: interaction.user.id,
            username: interaction.user.username,
            avatar: interaction.user.displayAvatarURL({ format: 'png', size: 512 })
          }
        };

        // نسخ الإعدادات من القناة الحالية إذا وجدت
        if (currentAutoPublishData) {
          newAutoPublishData.interval = currentAutoPublishData.interval;
          newAutoPublishData.message = currentAutoPublishData.message;
          newAutoPublishData.mentionType = currentAutoPublishData.mentionType;
          newAutoPublishData.maxTimes = currentAutoPublishData.maxTimes;
          newAutoPublishData.timesPublished = 0; // إعادة تعيين العد
        }

        await AutoPublish.create(newAutoPublishData);
        // تحديث النظام مباشرة لكل متجر
        await updateAutoPublish(client, guildId, shop.channelId);
        addedCount++;
      } else {
        // إذا كان موجود بالفعل، نقوم بتحديث الإعدادات
        if (currentAutoPublishData) {
          autoPublishData.interval = currentAutoPublishData.interval;
          autoPublishData.message = currentAutoPublishData.message;
          autoPublishData.mentionType = currentAutoPublishData.mentionType;
          autoPublishData.maxTimes = currentAutoPublishData.maxTimes;
          autoPublishData.timesPublished = 0;
          // لا نغير حالة التفعيل، نتركها كما هي
          await autoPublishData.save();
          updatedCount++;
        }
      }
    }

    await interaction.update({
      content: `**✅ تم إضافة نظام النشر لـ ${addedCount} متجر جديد\nوتحديث إعدادات ${updatedCount} متجر موجود**`,
      embeds: [],
      components: []
    });
    
    // تحديث الرسالة للإعادة لعرض القائمة الرئيسية
    setTimeout(async () => {
      await handleAutoPublishManage(interaction);
    }, 1000);
  } else {
    // إضافة لنظام النشر لمتجر معين
    let autoPublishData = await AutoPublish.findOne({ guildId, channelId: selectedChannel });
    
    // جلب بيانات النشر الحالية للقناة الحالية
    const currentAutoPublishData = await AutoPublish.findOne({ guildId, channelId });
    
    const isNew = !autoPublishData;
    
    if (!autoPublishData) {
      const newAutoPublishData = {
        guildId,
        channelId: selectedChannel,
        enabled: true, // نفعله تلقائياً
        setBy: {
          userId: interaction.user.id,
          username: interaction.user.username,
          avatar: interaction.user.displayAvatarURL({ format: 'png', size: 512 })
        }
      };

      // نسخ الإعدادات من القناة الحالية إذا وجدت
      if (currentAutoPublishData) {
        newAutoPublishData.interval = currentAutoPublishData.interval;
        newAutoPublishData.message = currentAutoPublishData.message;
        newAutoPublishData.mentionType = currentAutoPublishData.mentionType;
        newAutoPublishData.maxTimes = currentAutoPublishData.maxTimes;
        newAutoPublishData.timesPublished = 0;
      }

      autoPublishData = await AutoPublish.create(newAutoPublishData);
    } else {
      // إذا كان موجود، ننسخ الإعدادات الجديدة فقط
      if (currentAutoPublishData) {
        autoPublishData.interval = currentAutoPublishData.interval;
        autoPublishData.message = currentAutoPublishData.message;
        autoPublishData.mentionType = currentAutoPublishData.mentionType;
        autoPublishData.maxTimes = currentAutoPublishData.maxTimes;
        autoPublishData.timesPublished = 0;
        // لا نغير حالة التفعيل، نتركها كما هي
        await autoPublishData.save();
      }
    }

    // تحديث النظام مباشرة فقط إذا كان مفعلاً
    if (autoPublishData.enabled) {
      await updateAutoPublish(client, guildId, selectedChannel);
    }

    const channel = interaction.guild.channels.cache.get(selectedChannel);
    await interaction.update({
      content: `**✅ تم ${isNew ? 'إضافة' : 'تحديث'} نظام النشر للروم: ${channel ? channel.toString() : selectedChannel}**`,
      embeds: [],
      components: []
    });
    
    // تحديث الرسالة للإعادة لعرض القائمة الرئيسية
    setTimeout(async () => {
      await handleAutoPublishManage(interaction);
    }, 1000);
  }
}

// ========== دالة تأكيد المنشن ==========
async function handleConfirmMention(client, interaction) {
  const guildId = interaction.guild.id;
  const channelId = interaction.channel.id;
  const mentionType = interaction.customId.replace("5351/co56nfirm_mention_", "");

  let autoPublishData = await AutoPublish.findOne({ guildId, channelId });
  if (!autoPublishData) {
    autoPublishData = await AutoPublish.create({
      guildId,
      channelId,
      enabled: true,
      mentionType: mentionType,
      setBy: {
        userId: interaction.user.id,
        username: interaction.user.username,
        avatar: interaction.user.displayAvatarURL({ format: 'png', size: 512 })
      }
    });
  } else {
    autoPublishData.mentionType = mentionType;
    // لا نغير حالة التفعيل، نتركها كما هي
    await autoPublishData.save();
  }

  // تحديث النظام مباشرة فقط إذا كان مفعلاً
  if (autoPublishData.enabled) {
    await updateAutoPublish(client, guildId, channelId);
  }

  await interaction.update({
    content: `**✅ تـم ضـبـط رسـالـة الـنـشـر الـتـلـقـائـي بـنـجـاح\nمـع نـوع الـمـنـشـن: ${getMentionTypeName(mentionType)}**`,
    embeds: [],
    components: []
  });
  
  // تحديث الرسالة للإعادة لعرض القائمة الرئيسية
  setTimeout(async () => {
    await handleAutoPublishManage(interaction);
  }, 1000);
}