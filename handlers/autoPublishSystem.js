const AutoPublish = require("../Mangodb/autoPublish.js");
const Shop = require("../Mangodb/shop.js");
const Setup = require("../Mangodb/setup.js");
const { WebhookClient, EmbedBuilder } = require('discord.js');

const activeIntervals = new Map();

function parseTimeToMs(timeStr) {
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

async function createWebhook(channel, user) {
  try {
    const webhooks = await channel.fetchWebhooks();
    const existingWebhook = webhooks.find(wh => wh.name === user.username);
    
    if (existingWebhook) {
      return existingWebhook;
    }
    
    const webhook = await channel.createWebhook({
      name: user.username,
      avatar: user.avatar || user.displayAvatarURL({ format: 'png', size: 512 }),
      reason: `Auto-publish system for ${channel.name} by ${user.username}`
    });
    
    await AutoPublish.updateOne(
      { guildId: channel.guild.id, channelId: channel.id },
      { 
        $set: { 
          webhookData: {
            id: webhook.id,
            token: webhook.token,
            url: webhook.url
          }
        } 
      }
    );
    
    return webhook;
  } catch (error) {
    console.error('Error creating webhook:'.red, error);
    throw error;
  }
}

async function startAutoPublishSystem(client) {
  console.log('🔍 Fetching auto-publish settings...'.cyan);
  
  try {
    const autoPublishSettings = await AutoPublish.find({ enabled: true });
    console.log(`✅ Found ${autoPublishSettings.length} active auto-publish settings`.green);
    
    let startedCount = 0;
    let failedCount = 0;
    
    for (const setting of autoPublishSettings) {
      try {
        await setupAutoPublish(client, setting);
        startedCount++;
        console.log(`✓ Started auto-publish for guild: ${setting.guildId}, channel: ${setting.channelId}`.cyan);
      } catch (error) {
        failedCount++;
        console.error(`✗ Failed to start auto-publish for guild: ${setting.guildId}, channel: ${setting.channelId}`.red, error);
      }
    }
    
    console.log(`📊 Auto-publish system started: ${startedCount} succeeded, ${failedCount} failed`.yellow);
    
  } catch (error) {
    console.error('❌ Error fetching auto-publish settings:'.red, error);
  }
}

async function setupAutoPublish(client, setting) {
  const { guildId, channelId, interval, message, maxTimes } = setting;
  
  // التحقق من وجود البوت في السيرفر
  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    console.log(`❌ Guild ${guildId} not found, skipping auto-publish setup`.red);
    return;
  }

  // التحقق من وجود الرسالة
  if (!message || message.trim().length === 0) {
    console.log(`⚠️ No message set for ${guildId}/${channelId}, skipping auto-publish setup`.yellow);
    return;
  }

  const intervalMs = parseTimeToMs(interval);
  if (!intervalMs || intervalMs < 60000) {
    console.log(`❌ Invalid interval for ${guildId}/${channelId}: ${interval} (min: 1m)`.red);
    return;
  }

  console.log(`⚙️ Setting up auto-publish for ${guild.name} (${guildId}) in channel ${channelId} with interval ${interval}`.green);

  // إيقاف أي interval موجود مسبقاً
  stopAutoPublish(guildId, channelId);

  const intervalId = setInterval(async () => {
    try {
      // التحقق مرة أخرى من وجود السيرفر
      const currentGuild = client.guilds.cache.get(guildId);
      if (!currentGuild) {
        console.log(`❌ Guild ${guildId} not found, stopping auto-publish`.red);
        stopAutoPublish(guildId, channelId);
        return;
      }

      // التحقق من عدد المرات
      const currentSetting = await AutoPublish.findOne({ guildId, channelId });
      if (!currentSetting || !currentSetting.enabled) {
        stopAutoPublish(guildId, channelId);
        return;
      }

      // التحقق إذا وصل للحد الأقصى
      if (currentSetting.maxTimes !== null && currentSetting.timesPublished >= currentSetting.maxTimes) {
        console.log(`⏹️ Max times reached (${currentSetting.maxTimes}) for ${guildId}/${channelId}, stopping auto-publish`.yellow);
        await AutoPublish.updateOne(
          { guildId, channelId },
          { $set: { enabled: false } }
        );
        stopAutoPublish(guildId, channelId);
        return;
      }

      console.log(`📤 Publishing message for ${guild.name}/${channelId}...`.cyan);
      await publishMessage(client, currentSetting);
      
      // تحديث وقت النشر الأخير وعدد المرات
      await AutoPublish.updateOne(
        { guildId, channelId },
        { 
          $set: { 
            lastPublished: new Date(),
            timesPublished: currentSetting.timesPublished + 1
          } 
        }
      );
      
      console.log(`✅ Auto-published message in ${guild.name}/${channelId} at ${new Date().toLocaleTimeString()} (${currentSetting.timesPublished + 1}/${currentSetting.maxTimes || '∞'})`.green);
    } catch (error) {
      console.error(`❌ Error in auto-publish for ${guildId}/${channelId}:`.red, error);
    }
  }, intervalMs);

  const key = `${guildId}_${channelId}`;
  activeIntervals.set(key, intervalId);
  
  console.log(`✅ Auto-publish interval set for ${guildId}/${channelId}: ${interval} (${intervalMs}ms)`.green);
}

function stopAutoPublish(guildId, channelId) {
  const key = `${guildId}_${channelId}`;
  const existingInterval = activeIntervals.get(key);
  
  if (existingInterval) {
    clearInterval(existingInterval);
    activeIntervals.delete(key);
    console.log(`⏹️ Stopped auto-publish for ${guildId}/${channelId}`.yellow);
  }
}

async function publishMessage(client, setting) {
  const { guildId, channelId, message, mentionType, webhookData, setBy } = setting;
  
  try {
    // التحقق من وجود البوت في السيرفر
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      console.log(`❌ Guild ${guildId} not found, stopping auto-publish`.red);
      stopAutoPublish(guildId, channelId);
      return;
    }

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      console.log(`❌ Channel ${channelId} not found, stopping auto-publish`.red);
      stopAutoPublish(guildId, channelId);
      return;
    }

    // التحقق من المتجر
    const shopData = await Shop.findOne({ guildId, channelId });
    const setupData = await Setup.findOne({ guildId });
    
    if (!shopData || shopData.status === "0") {
      console.log(`⚠️ Shop ${channelId} is disabled or not found, stopping auto-publish`.yellow);
      stopAutoPublish(guildId, channelId);
      return;
    }

    let mentionText = "";
    let needsUpdate = false;
    
    switch (mentionType) {
      case 'everyone':
        mentionText = '@everyone';
        if (shopData.everyone <= 0) {
          await disableShop(client, guildId, channelId, setupData, "تـخـطـي عـدد مـنـشـنـات Everyone");
          return;
        } else {
          shopData.everyone--;
          needsUpdate = true;
        }
        break;
      case 'here':
        mentionText = '@here';
        if (shopData.here <= 0) {
          await disableShop(client, guildId, channelId, setupData, "تـخـطـي عـدد مـنـشـنـات Here");
          return;
        } else {
          shopData.here--;
          needsUpdate = true;
        }
        break;
      case 'shop':
        if (setupData && setupData.shopMention) {
          mentionText = `<@&${setupData.shopMention}>`;
          if (shopData.shop <= 0) {
            await disableShop(client, guildId, channelId, setupData, "تـخـطـي عـدد مـنـشـنـات Shop");
            return;
          } else {
            shopData.shop--;
            needsUpdate = true;
          }
        }
        break;
      default:
        mentionText = "";
    }

    if (needsUpdate) {
      await Shop.updateOne(
        { guildId, channelId },
        { 
          $set: {
            everyone: shopData.everyone,
            here: shopData.here,
            shop: shopData.shop
          }
        }
      );
    }

    // محاولة إرسال الرسالة عبر Webhook
    if (webhookData && webhookData.id && webhookData.token) {
      try {
        const webhookClient = new WebhookClient({ id: webhookData.id, token: webhookData.token });
        
        await webhookClient.send({
          content: `${mentionText}${mentionText ? '\n' : ''}${message}`,
          username: setBy?.username || 'AutoPublish',
          avatarURL: setBy?.avatar || client.user.displayAvatarURL()
        });
        
        console.log(`✅ Sent via webhook for ${guildId}/${channelId}`.green);
        return;
      } catch (webhookError) {
        console.log(`⚠️ Webhook error for ${guildId}/${channelId}, creating new webhook`.yellow);
      }
    }

    // محاولة إنشاء Webhook جديد
    try {
      const userData = setBy ? {
        id: setBy.userId,
        username: setBy.username,
        avatar: setBy.avatar
      } : {
        id: client.user.id,
        username: client.user.username,
        avatar: client.user.displayAvatarURL()
      };

      const webhook = await createWebhook(channel, userData);
      
      await webhook.send({
        content: `${mentionText}${mentionText ? '\n' : ''}${message}`,
        username: userData.username,
        avatarURL: userData.avatar
      });
      
      console.log(`✅ Created and sent via new webhook for ${guildId}/${channelId}`.green);
    } catch (createError) {
      console.log(`⚠️ Webhook creation failed for ${guildId}/${channelId}, sending normal message`.yellow);
      // إرسال رسالة عادية
      await channel.send(`${mentionText}${mentionText ? '\n' : ''}${message}`).catch(() => {});
    }

  } catch (error) {
    console.error(`❌ Error in publishMessage for ${guildId}/${channelId}:`.red, error);
  }
}

async function disableShop(client, guildId, channelId, setupData, reason) {
  try {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    // إخفاء القناة
    await channel.permissionOverwrites.edit(channel.guild.id, { ViewChannel: false }).catch(() => {});
    
    // إنشاء رسالة التعطيل
    const embed = new EmbedBuilder()
      .setTitle("تــم تـعـطـيـل الـمـتـجـر")
      .addFields(
        { name: "الــمــتــجــر", value: `> <#${channel.id}>`, inline: true },
        { name: "الــســبــب", value: `> ${reason}`, inline: true },
        { name: "الــوقــت", value: `> <t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      )
      .setImage(setupData?.line || null)
      .setFooter({
        text: "Dev By Hox Devs",
        iconURL: channel.guild.iconURL({ dynamic: true })
      });

    await channel.send({ embeds: [embed] }).catch(() => {});
    
    // تحديث حالة المتجر
    await Shop.updateOne(
      { guildId, channelId },
      { $set: { status: "0" } }
    );

    // إيقاف النشر التلقائي
    stopAutoPublish(guildId, channelId);

    // إرسال للوغ إذا وجد
    if (setupData?.logs) {
      try {
        const logChannel = await client.channels.fetch(setupData.logs).catch(() => null);
        if (logChannel) {
          const logEmbed = EmbedBuilder.from(embed)
            .setTitle("لــوق تـعـطـيـل مــتــجــر")
            .setImage(null)
            .addFields(
              { name: "الــمــســؤؤل", value: `> <@${client.user.id}>`, inline: true }
            );

          await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
        }
      } catch (error) {
        console.error(`❌ Error sending log for disabled shop ${guildId}/${channelId}:`.red, error);
      }
    }
    
    console.log(`🛑 Shop disabled for ${guildId}/${channelId}: ${reason}`.red);
  } catch (error) {
    console.error(`❌ Error disabling shop ${guildId}/${channelId}:`.red, error);
  }
}

async function updateAutoPublish(client, guildId, channelId) {
  console.log(`🔄 Updating auto-publish for ${guildId}/${channelId}`.yellow);
  
  stopAutoPublish(guildId, channelId);

  const setting = await AutoPublish.findOne({ guildId, channelId });
  
  if (setting && setting.enabled) {
    await setupAutoPublish(client, setting);
  }
}

function stopAllAutoPublish() {
  console.log(`⏹️ Stopping all auto-publish intervals (${activeIntervals.size} total)`.red);
  
  for (const [key, intervalId] of activeIntervals) {
    clearInterval(intervalId);
  }
  activeIntervals.clear();
}

module.exports = {
  startAutoPublishSystem,
  setupAutoPublish,
  stopAutoPublish,
  updateAutoPublish,
  stopAllAutoPublish,
  activeIntervals
};