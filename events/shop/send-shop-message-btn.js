const { WebhookClient, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const Shop = require('../../Mangodb/shop.js');
const Setup = require('../../Mangodb/setup.js');
const client = require('../../index.js')
module.exports = {
    name: "interactionCreate",
    once: false,

    async execute(client, interaction) {
        if (!interaction.isButton()) return;

        // زر إرسال لمتجر معين
        if (interaction.customId.startsWith('send_shop_message:')) {
            const [_, targetChannelId, messageId] = interaction.customId.split(':');
            await handleSingleShopSend(interaction, targetChannelId, messageId);
        }

        // زر إرسال لكل المتاجر
        if (interaction.customId.startsWith('send_all_shops:')) {
            const [_, messageId] = interaction.customId.split(':');
            await handleAllShopsSend(interaction, messageId);
        }

        // معالجة أزرار اختيار المنشن
        if (interaction.customId.startsWith('choose_mention:')) {
            const [_, targetChannelId, messageId, mentionType, isAllShops] = interaction.customId.split(':');
            
            try {
                const originalMsg = await interaction.channel.messages.fetch(messageId);
                const setupData = await Setup.findOne({ guildId: interaction.guild.id });
                const shopMentionRoleId = setupData?.shopMention;

                if (isAllShops === 'true') {
                    // إرسال لكل المتاجر
                    await sendToAllShopsWithMention(interaction, originalMsg, shopMentionRoleId, mentionType);
                } else {
                    // إرسال لمتجر واحد
                    const targetShop = await Shop.findOne({ channelId: targetChannelId });
                    const targetChannel = await interaction.guild.channels.fetch(targetChannelId);
                    await sendMessageWithMention(interaction, originalMsg, targetShop, targetChannel, shopMentionRoleId, mentionType);
                }
                
                // حذف رسالة الأزرار
                await interaction.message.delete();

            } catch (error) {
                console.error('Error in mention selection:', error);
                await interaction.reply({ 
                    content: '**❌ حــدث خــطــأ أثــنــاء إرســال الــرســالــة**',
                    ephemeral: true
                });
            }
        }
    }
};

// دالة التعامل مع إرسال لمتجر واحد
async function handleSingleShopSend(interaction, targetChannelId, messageId) {
    try {
        const originalMsg = await interaction.channel.messages.fetch(messageId);
        if (!originalMsg) {
            return interaction.reply({ 
                content: '**❌ لــم يــتــم الــعــثــور عــلــى الــرســالــة الــأصــلــيــة**',
                ephemeral: true
            });
        }

        const targetShop = await Shop.findOne({ channelId: targetChannelId });
        if (!targetShop) {
            return interaction.reply({ 
                content: '**❌ لــم يــتــم الــعــثــور عــلــى الــمــتــجــر**',
                ephemeral: true
            });
        }

        const targetChannel = await interaction.guild.channels.fetch(targetChannelId);
        if (!targetChannel) {
            return interaction.reply({ 
                content: '**❌ لــم يــتــم الــعــثــور عــلــى قــنــاة الــمــتــجــر**',
                ephemeral: true
            });
        }

        // البحث عن المذكرين في الرسالة
        const mentionedUsers = interaction.message.mentions.users;
        
        // التحقق من أن المستخدم الذي ضغط على الزر هو المذكور في الرسالة
        if (mentionedUsers.size === 0 || !mentionedUsers.has(interaction.user.id)) {
            return interaction.reply({
                content: "**شــو دخــلــك بــ الارسـال\nيــلا انــقــلــع يـ حـرامـي**",
                ephemeral: true
            });
        }

        // جلب إعدادات السيرفر
        const setupData = await Setup.findOne({ guildId: interaction.guild.id });
        const shopMentionRoleId = setupData?.shopMention;
        let shopMentionRole = null;
        
        if (shopMentionRoleId) {
            shopMentionRole = await interaction.guild.roles.fetch(shopMentionRoleId);
        }

        // التحقق من وجود منشنات في الرسالة الأصلية
        const hasEveryoneMention = originalMsg.mentions.everyone;
        const hasHereMention = originalMsg.content.includes('@here');
        const hasShopMention = shopMentionRoleId && originalMsg.mentions.roles.has(shopMentionRoleId);

        // إذا كانت الرسالة تحتوي على منشن، إرسالها مباشرة
        if (hasEveryoneMention || hasHereMention || hasShopMention) {
            await sendMessageWithMention(interaction, originalMsg, targetShop, targetChannel, shopMentionRoleId);
        } else {
            // إذا لا تحتوي على منشن، عرض خيارات المنشن
            await showMentionOptions(interaction, originalMsg, targetShop, targetChannel, shopMentionRole, shopMentionRoleId, false);
        }

    } catch (error) {
        console.error('Error sending shop message:', error);
        await interaction.reply({ 
            content: '**❌ حــدث خــطــأ أثــنــاء إرســال الــرســالــة**',
            ephemeral: true
        });
    }
}

// دالة التعامل مع إرسال لكل المتاجر
async function handleAllShopsSend(interaction, messageId) {
    try {
        const originalMsg = await interaction.channel.messages.fetch(messageId);
        if (!originalMsg) {
            return interaction.reply({ 
                content: '**❌ لــم يــتــم الــعــثــور عــلــى الــرســالــة الــأصــلــيــة**',
                ephemeral: true
            });
        }

        // البحث عن المذكرين في الرسالة
        const mentionedUsers = interaction.message.mentions.users;
        
        // التحقق من أن المستخدم الذي ضغط على الزر هو المذكور في الرسالة
        if (mentionedUsers.size === 0 || !mentionedUsers.has(interaction.user.id)) {
            return interaction.reply({
                content: "**شــو دخــلــك بــ الارسـال\nيــلا انــقــلــع يـ حـرامـي**",
                ephemeral: true
            });
        }

        // جلب جميع متاجر المستخدم المفعلة
        const userShops = await Shop.find({
            $or: [
                { ownerId: interaction.user.id },
                { partners: interaction.user.id }
            ],
            channelId: { $ne: interaction.channel.id },
            statusSend: "active"
        });

        if (userShops.length === 0) {
            return interaction.reply({
                content: "**❌ لــيــس لــديك مــتــاجــر مــفــعــلــة أخــرى**",
                ephemeral: true
            });
        }

        // جلب إعدادات السيرفر
        const setupData = await Setup.findOne({ guildId: interaction.guild.id });
        const shopMentionRoleId = setupData?.shopMention;
        let shopMentionRole = null;
        
        if (shopMentionRoleId) {
            shopMentionRole = await interaction.guild.roles.fetch(shopMentionRoleId);
        }

        // التحقق من وجود منشنات في الرسالة الأصلية
        const hasEveryoneMention = originalMsg.mentions.everyone;
        const hasHereMention = originalMsg.content.includes('@here');
        const hasShopMention = shopMentionRoleId && originalMsg.mentions.roles.has(shopMentionRoleId);

        // إذا كانت الرسالة تحتوي على منشن، إرسالها مباشرة
        if (hasEveryoneMention || hasHereMention || hasShopMention) {
            await sendToAllShopsWithMention(interaction, originalMsg, shopMentionRoleId);
        } else {
            // إذا لا تحتوي على منشن، عرض خيارات المنشن
            await showMentionOptions(interaction, originalMsg, null, null, shopMentionRole, shopMentionRoleId, true);
        }

    } catch (error) {
        console.error('Error sending to all shops:', error);
        await interaction.reply({ 
            content: '**❌ حــدث خــطــأ أثــنــاء إرســال الــرســالــة**',
            ephemeral: true
        });
    }
}

// دالة لعرض خيارات المنشن
async function showMentionOptions(interaction, originalMsg, targetShop, targetChannel, shopMentionRole, shopMentionRoleId, isAllShops) {
    const setupData = await Setup.findOne({ guildId: interaction.guild.id });

    const embed = new EmbedBuilder()
        .setImage(setupData.line)
        .setTitle(isAllShops ? "اخــتــيــار نــوع الــمــنــشــن لــكــل الــمــتــاجــر" : "اخــتــيــار نــوع الــمــنــشــن")
        .setDescription(`**اخــتــر نــوع الــمــنــشــن الــذي تــريــد إضــافــتــه إلــى الــرســالــة${isAllShops ? ' لــكــل مــتــاجــرك' : ''}:**`)
        .setAuthor({
            name: client.user.username,
            iconURL: client.user.displayAvatarURL()
        })
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setFooter({
            text: interaction.guild.name,
            iconURL: interaction.guild.iconURL({ dynamic: true })
        });

    const row = new ActionRowBuilder();

    if (!isAllShops && targetShop) {
        // زر @everyone
        if (targetShop.everyone > 0) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`choose_mention:${targetChannel.id}:${originalMsg.id}:everyone:false`)
                    .setLabel(`@everyone (${targetShop.everyone})`)
                    .setStyle(ButtonStyle.Primary)
            );
        }
        
        // زر @here
        if (targetShop.here > 0) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`choose_mention:${targetChannel.id}:${originalMsg.id}:here:false`)
                    .setLabel(`@here (${targetShop.here})`)
                    .setStyle(ButtonStyle.Success)
            );
        }
        
        // زر منشن المتجر
        if (targetShop.shop > 0 && shopMentionRole) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`choose_mention:${targetChannel.id}:${originalMsg.id}:shop:false`)
                    .setLabel(`${shopMentionRole.name} (${targetShop.shop})`)
                    .setStyle(ButtonStyle.Secondary)
            );
        }
    } else if (isAllShops) {
        // زر @everyone لكل المتاجر
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`choose_mention:all:${originalMsg.id}:everyone:true`)
                .setLabel(`@everyone لــكــل الــمــتــاجــر`)
                .setStyle(ButtonStyle.Primary)
        );
        
        // زر @here لكل المتاجر
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`choose_mention:all:${originalMsg.id}:here:true`)
                .setLabel(`@here لــكــل الــمــتــاجــر`)
                .setStyle(ButtonStyle.Success)
        );
        
        // زر منشن المتجر لكل المتاجر
        if (shopMentionRole) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`choose_mention:all:${originalMsg.id}:shop:true`)
                    .setLabel(`${shopMentionRole.name} لــكــل الــمــتــاجــر`)
                    .setStyle(ButtonStyle.Secondary)
            );
        }
    }
    
    // زر بدون منشن
    const customId = isAllShops ? 
        `choose_mention:all:${originalMsg.id}:none:true` : 
        `choose_mention:${targetChannel.id}:${originalMsg.id}:none:false`;
    
    row.addComponents(
        new ButtonBuilder()
            .setCustomId(customId)
            .setLabel("بــدون مــنــشــن")
            .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
    });
}// دالة لإرسال الرسالة مع المنشن لمتجر واحد
async function sendMessageWithMention(interaction, originalMsg, targetShop, targetChannel, shopMentionRoleId, mentionType = null) {
    try {
        let messageContent = originalMsg.content;
        let mentionText = "";
        let updated = false;

        // تحديد المنشن بناءً على النوع المختار أو المنشن الموجود في الرسالة
        if (mentionType) {
            switch (mentionType) {
                case 'everyone':
                    if (targetShop.everyone > 0) {
                        mentionText = "@everyone";
                        targetShop.everyone -= 1;
                        updated = true;
                    }
                    break;
                case 'here':
                    if (targetShop.here > 0) {
                        mentionText = "@here";
                        targetShop.here -= 1;
                        updated = true;
                    }
                    break;
                case 'shop':
                    if (targetShop.shop > 0 && shopMentionRoleId) {
                        mentionText = `<@&${shopMentionRoleId}>`;
                        targetShop.shop -= 1;
                        updated = true;
                    }
                    break;
            }
        } else {
            // إذا كان هناك منشن موجود في الرسالة الأصلية
            const hasEveryoneMention = originalMsg.mentions.everyone;
            const hasHereMention = originalMsg.content.includes('@here');
            const hasShopMention = shopMentionRoleId && originalMsg.mentions.roles.has(shopMentionRoleId);

            if (hasEveryoneMention && targetShop.everyone > 0) {
                mentionText = "@everyone";
                targetShop.everyone -= 1;
                updated = true;
            } else if (hasHereMention && targetShop.here > 0) {
                mentionText = "@here";
                targetShop.here -= 1;
                updated = true;
            } else if (hasShopMention && targetShop.shop > 0) {
                mentionText = `<@&${shopMentionRoleId}>`;
                targetShop.shop -= 1;
                updated = true;
            }
        }

        // إضافة المنشن في بداية الرسالة
        if (mentionText) {
            messageContent = `${mentionText}\n\n${messageContent}`;
        }

        messageContent += `\n\n**صــاحــب الــرســالــة:** ${interaction.user}`;

        if (updated) {
            await targetShop.save();
        }

        const webhook = await targetChannel.createWebhook({
            name: interaction.user.displayName,
            avatar: interaction.user.displayAvatarURL({ dynamic: true }),
            reason: `send message shop - ${interaction.user.tag}`
        });

        await webhook.send({
            content: messageContent,
            files: originalMsg.attachments.map(attachment => attachment.url)
        });

        await webhook.delete();

        await interaction.reply({ 
            content: `**تــم إرســال الــرســالــة الي ${targetChannel} بــنــجــاح**`,
            ephemeral: true
        });

        try {
            await interaction.message.delete();
        } catch (error) {
            console.error('Error deleting button message:', error);
        }

    } catch (error) {
        console.error('Error in sendMessageWithMention:', error);
        throw error;
    }
}

// دالة لإرسال الرسالة لكل المتاجر
async function sendToAllShopsWithMention(interaction, originalMsg, shopMentionRoleId, mentionType = null) {
    try {
        // جلب جميع متاجر المستخدم المفعلة
        const userShops = await Shop.find({
            $or: [
                { ownerId: interaction.user.id },
                { partners: interaction.user.id }
            ],
            channelId: { $ne: interaction.channel.id },
            statusSend: "active"
        });

        let successCount = 0;
        let errorCount = 0;

        for (const shop of userShops) {
            try {
                const targetChannel = await interaction.guild.channels.fetch(shop.channelId);
                if (!targetChannel) {
                    errorCount++;
                    continue;
                }

                let messageContent = originalMsg.content;
                let mentionText = "";
                let updated = false;

                // تحديد المنشن بناءً على النوع المختار
                if (mentionType && mentionType !== 'none') {
                    switch (mentionType) {
                        case 'everyone':
                            if (shop.everyone > 0) {
                                mentionText = "@everyone";
                                shop.everyone -= 1;
                                updated = true;
                            }
                            break;
                        case 'here':
                            if (shop.here > 0) {
                                mentionText = "@here";
                                shop.here -= 1;
                                updated = true;
                            }
                            break;
                        case 'shop':
                            if (shop.shop > 0 && shopMentionRoleId) {
                                mentionText = `<@&${shopMentionRoleId}>`;
                                shop.shop -= 1;
                                updated = true;
                            }
                            break;
                    }
                }

                // إضافة المنشن في بداية الرسالة
                if (mentionText) {
                    messageContent = `${mentionText}\n${messageContent}`;
                }

                messageContent += `\n**صــاحــب الــرســالــة:** ${interaction.user}`;

                if (updated) {
                    await shop.save();
                }

                const webhook = await targetChannel.createWebhook({
                    name: interaction.user.displayName,
                    avatar: interaction.user.displayAvatarURL({ dynamic: true }),
                    reason: `send message all shops - ${interaction.user.tag}`
                });

                await webhook.send({
                    content: messageContent,
                    files: originalMsg.attachments.map(attachment => attachment.url)
                });

                await webhook.delete();
                successCount++;

            } catch (error) {
                console.error(`Error sending to shop ${shop.channelId}:`, error);
                errorCount++;
            }
        }

        await interaction.reply({ 
            content: `** تــم إرســال الــرســالــة لــ ${successCount} مــتــجــر بــنــجــاح\n${errorCount > 0 ? ` ❌ فــشــل فــي ${errorCount} مــتــجــر` : ''}**`,
            ephemeral: true
        });

        try {
            await interaction.message.delete();
        } catch (error) {
            console.error('Error deleting button message:', error);
        }

    } catch (error) {
        console.error('Error in sendToAllShopsWithMention:', error);
        throw error;
    }
}