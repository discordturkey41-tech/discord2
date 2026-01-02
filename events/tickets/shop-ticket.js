const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, PermissionsBitField } = require("discord.js");
const Shop = require('../../Mangodb/shop.js');
const Setup = require('../../Mangodb/setup.js');
const Types = require('../../Mangodb/types.js');
const Ticket = require('../../Mangodb/tickets.js');
const SaleState = require('../../Mangodb/saleState.js');

// Maps لمنع الشراء المزدوج للمتاجر
const activeShopPurchases = new Map();
const shopPurchaseCollectors = new Map();

module.exports = {
    name: "interactionCreate",
    once: false,

    async execute(client, interaction) {
        if (!interaction.isButton()) return;
        if (!interaction.guild) return;
        const guildId = interaction.guild.id;

        // فتح التذكرة
        if (interaction.customId === "shop_buy") {
            // التحقق من حالة بيع المتاجر
            const saleState = await SaleState.findOne({
                guildId: interaction.guild.id,
                type: "full_shop_sale"
            });
            
            if (saleState?.state === "disable") {
                return interaction.reply({
                    content: "**شــراء الــمــتــاجــر مــعــطــل حالياً**",
                    ephemeral: true
                });
            }

            // التحقق من وجود عملية شراء نشطة
            if (activeShopPurchases.has(interaction.user.id)) {
                return interaction.reply({
                    content: "**⚠️ لــديــك عــمــلــيــة شــراء نــشــطــة بالفــعــل، الــرجــاء الانتــظــار حــتــى تــنــتــهــي**",
                    ephemeral: true
                });
            }

            const existingTicket = await Ticket.findOne({ 
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                ticketType: 'shop',
                closed: false
            });

            if (existingTicket) {
                try {
                    const channel = await interaction.guild.channels.fetch(existingTicket.channelId);
                    const cancelButton = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('astacancel-shop-ticket')
                            .setLabel('الــغــاء')
                            .setStyle(ButtonStyle.Danger)
                    );

                    return interaction.reply({
                        ephemeral: true,
                        content: `**عــنــدك تــذكــرة مــفــتــوحــة :${channel}\n-# لو عــنــدك مــشــكــلــة اســتــعــمــل زر الــغــاء ســوف يــتــم حــل جــمــيــع مــشــاكــلــك**`,
                        components: [cancelButton],
                    });

                } catch (error) {
                    // If channel doesn't exist, delete the record
                    await Ticket.deleteOne({ _id: existingTicket._id });
                }
            }

            const setupData = await Setup.findOne({ guildId: interaction.guild.id });
            const types = await Types.find({ guildId });

            if (!types || types.length === 0) {
                return interaction.reply({
                    content: "**لا يــوجــد انــواع مــتــاجــر، الــرجــاء مــراســلــة الادارة**",
                    ephemeral: true
                });
            }

            if (!setupData.shopTicket) {
                return interaction.reply({
                    content: `**❌ | يـرجـي تـحـديـد كـاتـاغـوري الـتـكـتـات عـبـر أمـر __/setup__**`,
                    ephemeral: true
                });
            }

            const category = await client.channels.fetch(setupData.shopTicket).catch(() => null);
            if (!category) {
                return interaction.reply({
                    content: `**❌ | كـاتـاغـوري الـتـكـتـات مـحـذوفـة **`,
                    ephemeral: true
                });
            }

            // تصفية الأنواع المعطلة
            const shopTypeState = await SaleState.findOne({
                guildId: interaction.guild.id,
                type: "shop_type"
            });
            
            const availableTypes = types.filter(type => 
                !shopTypeState?.disabledTypes?.includes(type.name)
            );

            if (availableTypes.length === 0) {
                return interaction.reply({
                    content: "**جــمــيــع انــواع الــمــتــاجــر مــعــطــلــة حالياً**",
                    ephemeral: true
                });
            }

            const ticket = await interaction.guild.channels.create({
                name: `Buy-Shop-${interaction.user.username}`,
                type: 0,
                parent: category,
                topic: `Ticket Owner: ${interaction.user.id}`,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] }
                ]
            });

            // Create ticket record in MongoDB
            const newTicket = new Ticket({
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                channelId: ticket.id,
                ticketType: 'shop',
                closed: false,
                createdAt: new Date()
            });
            await newTicket.save();

            if (setupData.shopAdmin) {
                await ticket.permissionOverwrites.edit(setupData.shopAdmin, { ViewChannel: true });
            }

            const embed = new EmbedBuilder()
                .setTitle("شـراء مـتـجـر")
                .setDescription("**<a:004:1326822409227210845>لـ شـراء مـتـجـر الــرجــاء الــضــغــط عــلــى زر الـنـوع الـذي تـريــد شـراءه <a:004:1326822409227210845>\n <a:hox_red_spar:1405145176027959366> لـ اغـلاق الـتـذكـرة الـرجـاء الضغط عـلـي زر إغـلاق الـتـذكـرة <a:hox_red_spar:1405145176027959366>**")
                .setImage(setupData?.line || null)
                .setFooter({ text: "Dev By Hox Devs", iconURL: interaction.guild.iconURL({ dynamic: true }) })
                .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                .setTimestamp();

            let row = new ActionRowBuilder();
            let rows = [];
            
            availableTypes.forEach((type, index) => {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`buy51yyy5y_${type.category}`)
                        .setLabel(type.name)
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji("🛒")
                );

                if ((index + 1) % 5 === 0 || index === availableTypes.length - 1) {
                    rows.push(row);
                    row = new ActionRowBuilder();
                }
            });

            const closeButton = new ButtonBuilder()
                .setCustomId("15clos7e_shop_ticket")
                .setLabel("إغـلاق الـتـذكـرة")
                .setStyle(ButtonStyle.Danger)
                .setEmoji("<a:no:1405131885146800148>");

            if (rows.length > 0 && rows[rows.length - 1].components.length < 5) {
                rows[rows.length - 1].addComponents(closeButton);
            } else {
                rows.push(new ActionRowBuilder().addComponents(closeButton));
            }

            await ticket.send({ content: `${interaction.user}`, embeds: [embed], components: rows });
            return interaction.reply({ content: `**تـم إنـشـاء الـتـذكـرة بـنـجـاح ${ticket}**`, ephemeral: true });
        }

        // إغلاق التذكرة
        if (interaction.customId === "15clos7e_shop_ticket") {
            // Get user ID from channel topic
            const userId = interaction.channel.topic?.replace('Ticket Owner: ', '');
            
            if (!userId) {
                return interaction.reply({ content: "**هـذه لـيـسـت تـذكـرة**", ephemeral: true });
            }

            // إزالة أي عمليات شراء نشطة للمستخدم
            if (activeShopPurchases.has(userId)) {
                const collectors = shopPurchaseCollectors.get(userId);
                if (collectors) {
                    collectors.messageCollector?.stop();
                    collectors.nameCollector?.stop();
                }
                activeShopPurchases.delete(userId);
                shopPurchaseCollectors.delete(userId);
            }

            // Update ticket record in MongoDB
            await Ticket.updateOne(
                { channelId: interaction.channel.id },
                { $set: { closed: true, closedAt: new Date() } }
            );

            await interaction.reply({ content: "**ســوف يــتــم إغــلاق الــتــذكــرة بــعــد 10 ثــوانــي**", ephemeral: false });

            setTimeout(async () => {
                if (interaction.channel.deletable) {
                    await interaction.channel.delete().catch(() => {});
                }
            }, 10000);
        }

        // شراء نوع متجر
        if (interaction.customId.startsWith("buy51yyy5y_")) {
            // التحقق من وجود عملية شراء نشطة
            if (activeShopPurchases.has(interaction.user.id)) {
                return interaction.reply({
                    content: "**⚠️ لــديــك عــمــلــيــة شــراء نــشــطــة بالفــعــل، الــرجــاء الانتــظــار حــتــى تــنــتــهــي**",
                    ephemeral: true
                });
            }

            // Get user ID from channel topic
            const userId = interaction.channel.topic?.replace('Ticket Owner: ', '');
            
            if (!userId) {
                return interaction.reply({ content: "**هـذه لـيـسـت تـذكـرة**", ephemeral: true });
            }

            if (userId !== interaction.user.id) {
                return interaction.reply({ content: `**هـذة لـيـسـت تـذكـرتـك **`, ephemeral: true });
            }

            const typeCategory = interaction.customId.split("_")[1];
            const type = await Types.findOne({ guildId, category: typeCategory });
            const setupData = await Setup.findOne({ guildId: interaction.guild.id });

            // التحقق من حالة نوع المتجر
            const shopTypeState = await SaleState.findOne({
                guildId: interaction.guild.id,
                type: "shop_type"
            });
            
            if (shopTypeState?.disabledTypes?.includes(type.name)) {
                return interaction.reply({
                    content: `**نــوع الــمــتــجــر \`${type.name}\` مــعــطــل حالياً ولا يــمــكــنــك شــراؤه**`,
                    ephemeral: true
                });
            }

            // إنشاء إيمبد تفاصيل النوع
            const typeEmbed = new EmbedBuilder()
                .setTitle(`تــفــاصــيــل الــنــوع: ${type.name}`)
                .setImage(setupData.line)
                .addFields(
                    { name: "الــســعــر", value: `${type.price}`, inline: true },
                    { name: "الــحــد الأقــصــى للــتــحــذيــرات", value: `${type.maxWarns}`, inline: true },
                    { name: "الــشــكــل", value: `${type.shape}`, inline: true }
                )
                .setFooter({
                    text: "Dev By Hox Devs",
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                });

            // أزرار التأكيد والإلغاء
            const confirmRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`confirm_${type.category}`)
                        .setLabel("تــأكــيــد الــشــراء")
                        .setStyle(ButtonStyle.Success)
                        .setEmoji("<a:yes:1405131777948909599>"),
                    new ButtonBuilder()
                        .setCustomId("cancel_purchase")
                        .setLabel("إلــغــاء الــعــمــلــيــة")
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji("<a:no:1405131885146800148>")
                );

            await interaction.reply({
                content: `${interaction.user}`,
                embeds: [typeEmbed],
                components: [confirmRow],
                ephemeral: false
            });
        }

        // تأكيد الشراء
        if (interaction.customId.startsWith("confirm_")) {
            // التحقق من وجود عملية شراء نشطة
            if (activeShopPurchases.has(interaction.user.id)) {
                return interaction.reply({
                    content: "**⚠️ لــديــك عــمــلــيــة شــراء نــشــطــة بالفــعــل، الــرجــاء الانتــظــار حــتــى تــنــتــهــي**",
                    ephemeral: true
                });
            }

            // Get user ID from channel topic
            const userId = interaction.channel.topic?.replace('Ticket Owner: ', '');
            
            if (!userId || userId !== interaction.user.id) {
                return interaction.reply({ content: "**هـذه لـيـسـت تـذكـرتـك**", ephemeral: true });
            }

            const typeCategory = interaction.customId.split("_")[1];
            const type = await Types.findOne({ guildId, category: typeCategory });
            const setupData = await Setup.findOne({ guildId: interaction.guild.id });

            // التحقق مرة أخرى من حالة نوع المتجر (للتأكد من عدم التغيير أثناء العملية)
            const shopTypeState = await SaleState.findOne({
                guildId: interaction.guild.id,
                type: "shop_type"
            });
            
            if (shopTypeState?.disabledTypes?.includes(type.name)) {
                return interaction.reply({
                    content: `**نــوع الــمــتــجــر \`${type.name}\` مــعــطــل حالياً ولا يــمــكــنــك شــراؤه**`,
                    ephemeral: true
                });
            }

            if (!setupData || !setupData.bank) {
                return interaction.reply({
                    content: "**الــرجــاء اخــبــار الادارة بــوضــع صــاحــب الــتــحــويــل مــن امــر\n /setup**",
                    ephemeral: true
                });
            }

            // إضافة المستخدم إلى قائمة العمليات النشطة
            activeShopPurchases.set(interaction.user.id, {
                type: 'shop',
                shopType: type.name,
                price: type.price,
                startedAt: Date.now()
            });

            const price = type.price;
            const taxs = Math.floor((price * 20) / 19 + 1);
            const bank = setupData.bank;
            const paymentEmbed = new EmbedBuilder()
                .setTitle("عــمــلــيــة الــتــحــويــل")
                .setAuthor({
                    name: interaction.guild.name,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setImage(setupData.line)
                .setDescription(`**<a:011:1326822363785990205> الــرجــاء الــتــحــويــل فــي اســرع وقــت لــ شــراء الــمــتــجــر <a:011:1326822363785990205>**`)
                .setFooter({
                    text: "Dev By Hox Devs",
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                });

            await interaction.reply({
                embeds: [paymentEmbed],
                ephemeral: false
            });

            await interaction.followUp({
                content: `**مــعــك 5 دقــائــق للــتــحــويــل**\n\`\`\`#credit ${bank} ${taxs}\`\`\``,
                ephemeral: false
            });

            const messageCollectorFilter = (m) =>
                m.author.bot &&
                (m.content === `**:moneybag: | ${interaction.user.username}, has transferred \`$${price}\` to <@!${bank}> **` ||
                    m.content === `**ـ ${interaction.user.username}, قام بتحويل \`$${price}\` لـ <@!${bank}> ** |:moneybag:**`);

            const messageCollector = interaction.channel.createMessageCollector({
                filter: messageCollectorFilter,
                time: 300000 // 5 دقائق
            });

            // حفظ الكوليكتور
            shopPurchaseCollectors.set(interaction.user.id, { messageCollector });

            messageCollector.on('collect', async () => {
                try {
                    messageCollector.stop();

                    await interaction.followUp({
                        content: `<@${interaction.member.id}>\n**رجــاء قــم بــكــتــابــة اســم الــمــتــجــر**\n-# لا يــمــكــنــك تــغــيــيــر الاســم بــعــد كــتــابــتــه`,
                        ephemeral: false
                    });

                    const nameFilter = m => m.author.id === interaction.user.id;
                    const nameCollector = interaction.channel.createMessageCollector({
                        filter: nameFilter,
                        time: 90000,
                        max: 1
                    });

                    // تحديث الكوليكتور
                    shopPurchaseCollectors.set(interaction.user.id, { 
                        messageCollector, 
                        nameCollector 
                    });

                    nameCollector.on('collect', async m => {
                        const shopName = m.content;
                        const time = Math.floor(Date.now() / 1000);

                        const channel = await interaction.guild.channels.create({
                            name: `${type.shape}・${shopName.replace(/\s+/g, "︲")}`,
                            type: 0,
                            parent: type.category,
                            permissionOverwrites: [
                                {
                                    id: interaction.user.id,
                                    allow: [
                                        PermissionsBitField.Flags.SendMessages,
                                        PermissionsBitField.Flags.MentionEveryone,
                                        PermissionsBitField.Flags.EmbedLinks,
                                        PermissionsBitField.Flags.AttachFiles,
                                        PermissionsBitField.Flags.ViewChannel,
                                    ],
                                },
                                {
                                    id: setupData.shopAdmin,
                                    allow: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel],
                                },
                                {
                                    id: interaction.guild.roles.everyone.id,
                                    deny: [PermissionsBitField.Flags.SendMessages],
                                    allow: [PermissionsBitField.Flags.ViewChannel],
                                },
                            ],
                        });

                        const shopData = new Shop({
                            guildId: interaction.guild.id,
                            channelId: channel.id,
                            ownerId: interaction.user.id,
                            type: type.name,
                            maxWarns: type.maxWarns,
                            time: `<t:${time}:R>`,
                            emoji: type.emoji || "",
                            status: "1",
                            role: type.role,
                            everyone: type.everyoneMention ?? 0,
                            here: type.hereMention ?? 0,
                            shop: type.shopMention ?? 0,
                            warns: 0,
                            partners: [],
                            shape: type.shape,
                            lastTaxPayment: null,
                            taxPaid: "yes", 
                        });

                        await shopData.save();
                        const role = interaction.guild.roles.cache.get(type.role);
                        const roleName = role ? role.name : "غير محدد";

                        const shopEmbed = new EmbedBuilder()
                            .setTitle(channel.name)
                            .setDescription(
                                `**-  ${type.emoji || ""}  \`﹣\` صــاحــب الــمــتــجــر : <@${interaction.user.id}>\n` +
                                `- ${type.emoji || ""}  \`﹣\` نــوع الــمـتـجـر : ${role}\n` +
                                `- ${type.emoji || ""}  \`﹣\` تـاريـخ الانـشـاء :  <t:${time}:R>\n` +
                                `- ${type.emoji || ""}  \`﹣\` الــحــد الاقــصــي لــتــحــذيــرات :  ${type.maxWarns}\n\n` +
                                `<a:hox_star_light:1326824621722435655> \`-\` __ @everyone :  \`${type.everyoneMention || 0}\`__\n` +
                                `<a:hox_star_gray:1326824634397626478> \`-\` __ @here :  \`${type.hereMention || 0}\`	__\n` +
                                `<a:hox_star_orange:1326824692648116407> \`-\` __ <@&${setupData.shopMention}> :  \`${type.shopMention || 0}\`__ **`
                            )
                            .setImage(setupData?.line || null)
                            .setFooter({
                                text: "Dev By Hox Devs",
                                iconURL: interaction.guild.iconURL({ dynamic: true })
                            });

                        const embedUser = new EmbedBuilder()
                            .setTitle(channel.name)
                            .setDescription(
                                `**-  ${type.emoji || ""}  \`﹣\` صــاحــب الــمــتــجــر : <@${interaction.user.id}>\n` +
                                `- ${type.emoji || ""}  \`﹣\` نــوع الــمـتـجـر : ${roleName}\n` +
                                `- ${type.emoji || ""}  \`﹣\` تـاريـخ الانـشـاء :  <t:${time}:R>\n` +
                                `- ${type.emoji || ""}  \`﹣\` الــحــد الاقــصــي لــتــحــذيــرات :  ${type.maxWarns}\n\n` +
                                `<a:hox_star_light:1326824621722435655> \`-\` __ @everyone :  \`${type.everyoneMention || 0}\`__\n` +
                                `<a:hox_star_gray:1326824634397626478> \`-\` __ @here :  \`${type.hereMention || 0}\`	__\n` +
                                `<a:hox_star_orange:1326824692648116407> \`-\` __ <@&${setupData.shopMention}> :  \`${type.shopMention || 0}\`__ **`
                            )
                            .setImage(setupData?.line || null)
                            .setFooter({
                                text: "Dev By Hox Devs",
                                iconURL: interaction.guild.iconURL({ dynamic: true })
                            });

                        await channel.send({
                            content: `<@${interaction.user.id}>`,
                            embeds: [shopEmbed]
                        });

                        await interaction.user.send({
                            content: `**تـــم انــشــاء مــتــجــرك: <#${channel.id}>**`,
                            embeds: [embedUser],
                        });

                        await interaction.followUp({
                            content: `**تــم إنــشــاء مــتــجــرك بــنــجــاح: <#${channel.id}>**`,
                            embeds: [shopEmbed],
                            ephemeral: false
                        });

                        // إزالة المستخدم من العمليات النشطة بعد اكتمال العملية
                        activeShopPurchases.delete(interaction.user.id);
                        shopPurchaseCollectors.delete(interaction.user.id);

                        setTimeout(async () => {
                            await interaction.channel.send({
                                content: "**ســوف يــتــم إغــلاق الــتــذكــرة بــعــد 10 ثــوانــي**"
                            });

                            // بعد 10 ثواني من الرسالة الأخيرة → حذف التذكرة والداتا
                            setTimeout(async () => {
                                try {
                                    // حذف بيانات التذكرة من MongoDB
                                    await Ticket.deleteOne({ 
                                        channelId: interaction.channel.id,
                                        guildId: interaction.guild.id
                                    });
                                    
                                    // حذف القناة إذا كانت قابلة للحذف
                                    if (interaction.channel.deletable) {
                                        await interaction.channel.delete().catch(() => {});
                                    }
                                } catch (error) {
                                    console.error('Error deleting ticket data:', error);
                                }
                            }, 10000);
                        }, 5000);

                        if (setupData.logs) {
                            const logChannel = await client.channels.fetch(setupData.logs);
                            if (logChannel) {
                                const embedLog = new EmbedBuilder()
                                    .setTitle("تــم شــراء مــتــجــر (تــلــقــائــي)")
                                    .addFields(
                                        { name: "بـواسـطـة:", value: `<@${interaction.user.id}>`, inline: true },
                                        { name: "مــتــجــر:", value: `<#${channel.id}>`, inline: true },
                                        { name: "نــوع الــمـتـجـر:", value: `${role}`, inline: true }
                                    )
                                    .setTimestamp();

                                await logChannel.send({ embeds: [embedLog] });
                            }
                        }

                        if (type.role) {
                            const member = await interaction.guild.members.fetch(interaction.user.id);
                            await member.roles.add(type.role);
                        }
                    });

                    nameCollector.on('end', collected => {
                        if (collected.size === 0) {
                            interaction.followUp({
                                content: "**انــتــهــى الــوقــت الــمــحــدد لإدخــال اســم الــمــتــجــر**",
                                ephemeral: false
                            });
                            // إزالة المستخدم من العمليات النشطة عند انتهاء الوقت
                            activeShopPurchases.delete(interaction.user.id);
                            shopPurchaseCollectors.delete(interaction.user.id);
                        }
                    });

                } catch (error) {
                    console.error(error);
                    await interaction.followUp({
                        content: `**حــدث خــطــأ، الرجــاء الــتــواصــل مــع الدعــم لــحــل الــمــشــكــلــة**\n[رابــط الدعــم](https://discord.gg/DDEMEczWAx)\n**الــمــشــكــلــة:** ${error.message}`,
                        ephemeral: false
                    });
                    // إزالة المستخدم من العمليات النشطة في حالة الخطأ
                    activeShopPurchases.delete(interaction.user.id);
                    shopPurchaseCollectors.delete(interaction.user.id);
                }
            });

            messageCollector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.followUp({
                        content: "**تــم انــتــهــاء الــوقــت\nالــرجــاء عــدم الــتــحــويــل**",
                        ephemeral: false
                    });
                    // إزالة المستخدم من العمليات النشطة عند انتهاء الوقت
                    activeShopPurchases.delete(interaction.user.id);
                    shopPurchaseCollectors.delete(interaction.user.id);
                }
            });
        }

        // إلغاء الشراء
        if (interaction.customId === "cancel_purchase") {
            // إزالة المستخدم من العمليات النشطة
            activeShopPurchases.delete(interaction.user.id);
            
            // إيقاف الكوليكتورز إذا كانت موجودة
            const collectors = shopPurchaseCollectors.get(interaction.user.id);
            if (collectors) {
                collectors.messageCollector?.stop();
                collectors.nameCollector?.stop();
                shopPurchaseCollectors.delete(interaction.user.id);
            }

            await interaction.update({
                content: "**تــم إلــغــاء عــمــلــيــة الــشــراء**",
                embeds: [],
                components: []
            });

            // مسح الرسالة بعد 5 ثواني
            setTimeout(() => {
                interaction.message.delete().catch(() => {});
            }, 5000);
        }
    }
};