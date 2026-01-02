const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, PermissionsBitField } = require("discord.js");
const Prices = require("../../Mangodb/prices.js");
const Shop = require('../../Mangodb/shop.js');
const Types = require('../../Mangodb/types.js');
const Setup = require('../../Mangodb/setup.js');
const Ticket = require('../../Mangodb/tickets.js');
const SaleState = require('../../Mangodb/saleState.js');

// Maps لمنع الشراء المزدوج
const activePurchases = new Map(); // لتتبع العمليات النشطة
const purchaseCollectors = new Map(); // لتخزين الكوليكتورز

module.exports = {
    name: "interactionCreate",
    once: false,

    async execute(client, interaction) {
        if (!interaction.isButton()) return;
        let guildId = interaction.guild.id;

        // فتح تذكرة الطلبات
        if (interaction.customId === "buyy_order_ticket") {
            // التحقق من حالة بيع الطلبات
            const saleState = await SaleState.findOne({
                guildId: interaction.guild.id,
                type: "orders"
            });
            
            if (saleState?.state === "disable") {
                return interaction.reply({
                    content: "**بــيــع الــطــلــبــات مــعــطــل حالياً**",
                    ephemeral: true
                });
            }

            // التحقق من وجود عملية شراء نشطة
            if (activePurchases.has(interaction.user.id)) {
                return interaction.reply({
                    content: "**⚠️ لــديــك عــمــلــيــة شــراء نــشــطــة بالفــعــل، الــرجــاء الانتــظــار حــتــى تــنــتــهــي**",
                    ephemeral: true
                });
            }

            // Check if user already has an open ticket
            const existingTicket = await Ticket.findOne({ 
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                ticketType: "order", 
                closed: false
            });

            if (existingTicket) {
                try {
                    const channel = await interaction.guild.channels.fetch(existingTicket.channelId);
                    const cancelButton = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('astacancel-order-ticket')
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
            let prices = await Prices.findOne({ guildId });        

            if (!setupData.orderTicket) {
                return interaction.reply({
                    content: `**❌ | يـرجـي تـحـديـد كـاتـاغـوري الـتـكـتـات عـبـر أمـر __/setup__**`,
                    ephemeral: true
                });
            }

            const category = await client.channels.fetch(setupData.orderTicket).catch(() => null);
            if (!category) {
                return interaction.reply({
                    content: `**❌ | كـاتـاغـوري الـتـكـتـات مـحـذوفـة **`,
                    ephemeral: true
                });
            }

            if (!prices?.orderEveryPrice && !prices?.orderHerePrice && !prices?.orderMentionPrice) {
                return interaction.reply({
                    content: `**لـم يـتـم تـحـديـد اسـعـار الـمـنـشـنـات**`,
                    ephemeral: true
                });
            }

            if (!setupData.orderRoom) {
                return interaction.reply({
                    content: `**لـم يـتـم تـحـديـد روم الـطـلـبـات **`,
                    ephemeral: true
                });
            }

            const ticket = await interaction.guild.channels.create({
                name: `Buy-order-${interaction.user.username}`,
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
                ticketType: 'order',
                closed: false,
                createdAt: new Date()
            });
            await newTicket.save();

            if (setupData.orderAdmin) {
                await ticket.permissionOverwrites.edit(setupData.orderAdmin, { ViewChannel: true });
            }

            const embed = new EmbedBuilder()
                .setTitle("شـراء طـلـب")
                .setDescription("**<a:004:1326822409227210845>لـ شـراء طـلـب الــرجــاء الـضـغـط عـلـى زر نـوع الـمـنـشـن الـذي تـريــد شـراءه <a:004:1326822409227210845>\n <a:hox_red_spar:1405145176027959366> لـ اغـلاق الـتـذكـرة الـرجـاء الضغط عـلـي زر إغـلاق الـتـذكـرة <a:hox_red_spar:1405145176027959366>**")
                .setImage(setupData?.line || null)
                .setFooter({ text: "Dev By Hox Devs", iconURL: interaction.guild.iconURL({ dynamic: true }) })
                .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                .setTimestamp();

            let row = new ActionRowBuilder();
            
            if (prices?.orderEveryPrice) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`order_every`)
                        .setLabel('@Everyone')
                        .setStyle(ButtonStyle.Secondary)
                );
            }
         
            if (prices?.orderHerePrice) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`order_here`)
                        .setLabel('@Here')
                        .setStyle(ButtonStyle.Secondary)
                );
            }
      
            if (prices && prices.orderMentionPrice) {
                let role = interaction.guild.roles.cache.get(setupData.orderMention);
                if (!role) {
                    return;
                } else {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`order_mention`)
                            .setLabel(`@${role.name}` || 'Order Mention')
                            .setStyle(ButtonStyle.Secondary)
                    );
                }
            }

            const closeButton = new ButtonBuilder()
                .setCustomId("close_ticket2")
                .setLabel("إغـلاق الـتـذكـرة")
                .setStyle(ButtonStyle.Danger)
                .setEmoji("<a:no:1405131885146800148>");

            row.addComponents(closeButton);

            await ticket.send({ content: `${interaction.user}`, embeds: [embed], components: [row] });
            return interaction.reply({ content: `**تـم إنـشـاء الـتـذكـرة بـنـجـاح ${ticket}**`, ephemeral: true });
        }

        // إغلاق التذكرة
        if (interaction.customId === "close_ticket2") {
            // Get user ID from channel topic
            const userId = interaction.channel.topic?.replace('Ticket Owner: ', '');
            
            if (!userId) {
                return interaction.reply({ content: "**هـذه لـيـسـت تـذكـرة**", ephemeral: true });
            }

            // إزالة أي عمليات شراء نشطة للمستخدم
            if (activePurchases.has(userId)) {
                const collectors = purchaseCollectors.get(userId);
                if (collectors) {
                    collectors.messageCollector?.stop();
                    collectors.nameCollector?.stop();
                }
                activePurchases.delete(userId);
                purchaseCollectors.delete(userId);
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

        // اختيار نوع المنشن
        if (interaction.customId.startsWith("order_")) {
            // التحقق من حالة بيع الطلبات مرة أخرى
            const saleState = await SaleState.findOne({
                guildId: interaction.guild.id,
                type: "orders"
            });
            
            if (saleState?.state === "disable") {
                return interaction.reply({
                    content: "**بــيــع الــطــلــبــات مــعــطــل حالياً**",
                    ephemeral: true
                });
            }

            // التحقق من وجود عملية شراء نشطة
            if (activePurchases.has(interaction.user.id)) {
                return interaction.reply({
                    content: "**⚠️ لــديــك عــمــلــيــة شــراء نــشــطــة بالفــعــل، الــرجــاء الانتــظــار حــتــى تــنــتــهــي**",
                    ephemeral: true
                });
            }

            // Get user ID from channel topic
            const userId = interaction.channel.topic?.replace('Ticket Owner: ', '');
            const setupData = await Setup.findOne({ guildId: interaction.guild.id });
            
            if (!userId) {
                return interaction.reply({ content: "**هـذه لـيـسـت تـذكـرة**", ephemeral: true });
            }

            if (userId !== interaction.user.id) {
                return interaction.reply({ content: `**هـذة لـيـسـت تـذكـرتـك **`, ephemeral: true });
            }

            let data = await Prices.findOne({ guildId: interaction.guild.id });
            const typeOrder = interaction.customId.split("_")[1];
            let price; 
            let mention;

            if (typeOrder == "every") {
                price = data?.orderEveryPrice;
                mention = '@everyone';
            } 
            if (typeOrder == "here") {
                price = data?.orderHerePrice;
                mention = '@here';
            } 
            if (typeOrder == "mention") {
                price = data?.orderMentionPrice;
                mention = `<@&${setupData.orderMention}>`;
            }

            // إنشاء إيمبد تفاصيل النوع
            const typeEmbed = new EmbedBuilder()
                .setTitle(`تــفــاصــيــل الــطـلـب: `)
                .setImage(setupData.line)
                .addFields(
                    { name: "الــســعــر", value: `${price}`, inline: true }, 
                    { name: "الـمـنـشـن", value: `${mention}`, inline: true }
                )
                .setFooter({
                    text: "Dev By Hox Devs",
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                });

            // أزرار التأكيد والإلغاء
            const confirmRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`confirm2_${typeOrder}`)
                        .setLabel("تــأكــيــد الــشــراء")
                        .setStyle(ButtonStyle.Success)
                        .setEmoji("<a:yes:1405131777948909599>"),
                    new ButtonBuilder()
                        .setCustomId("cancel_purchase2")
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
        if (interaction.customId.startsWith("confirm2_")) {
            // التحقق من حالة بيع الطلبات مرة أخرى
            const saleState = await SaleState.findOne({
                guildId: interaction.guild.id,
                type: "orders"
            });
            
            if (saleState?.state === "disable") {
                return interaction.reply({
                    content: "**بــيــع الــطــلــبــات مــعــطــل حالياً**",
                    ephemeral: true
                });
            }

            // التحقق من وجود عملية شراء نشطة
            if (activePurchases.has(interaction.user.id)) {
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

            const typeOrder = interaction.customId.split("_")[1];
            const setupData = await Setup.findOne({ guildId: interaction.guild.id });

            if (!setupData || !setupData.bank) {
                return interaction.reply({
                    content: "**الــرجــاء اخــبــار الادارة بــوضــع صــاحــب الــتــحــويــل مــن امــر\n /setup**",
                    ephemeral: true
                });
            }

            let price; 
            let mention;
            let data = await Prices.findOne({ guildId: interaction.guild.id });

            if (typeOrder == "every") {
                price = data.orderEveryPrice;
                mention = '@everyone';
            } 
            if (typeOrder == "here") {
                price = data.orderHerePrice;
                mention = '@here';
            } 
            if (typeOrder == "mention") {
                price = data.orderMentionPrice;
                mention = `<@&${setupData.orderMention}>`;
            }

            // إضافة المستخدم إلى قائمة العمليات النشطة
            activePurchases.set(interaction.user.id, {
                type: 'order',
                orderType: typeOrder,
                price: price,
                startedAt: Date.now()
            });

            const taxs = Math.floor((price * 20) / 19 + 1);
            const bank = setupData.bank;

            const paymentEmbed = new EmbedBuilder()
                .setTitle("عــمــلــيــة الــتــحــويــل")
                .setAuthor({
                    name: interaction.guild.name,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setImage(setupData.line)
                .setDescription(`**<a:011:1326822363785990205> الــرجــاء الــتــحــويــل فــي اســرع وقــت لــ شــراء الـطـلـب <a:011:1326822363785990205>**`)
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
            purchaseCollectors.set(interaction.user.id, { messageCollector });

            messageCollector.on('collect', async () => {
                try {
                    messageCollector.stop();

                    await interaction.followUp({
                        content: `<@${interaction.member.id}>\n**رجــاء قــم بــكــتــابــة الــطــلــب**\n-#  يــمــكــنــك ارســال صــور مــع الــطــلــب\n-# لا يــمــكــنــك تــغــيــيــر اي شــي بــعــد كــتــابــتــه`,
                        ephemeral: false
                    });

                    const nameFilter = m => m.author.id === interaction.user.id;
                    const nameCollector = interaction.channel.createMessageCollector({
                        filter: nameFilter,
                        time: 90000,
                        max: 1
                    });

                    // تحديث الكوليكتور
                    purchaseCollectors.set(interaction.user.id, { 
                        messageCollector, 
                        nameCollector 
                    });

                    nameCollector.on('collect', async m => {
                        const order = m.content;
                        const time = Math.floor(Date.now() / 1000);
                        const channel = await interaction.guild.channels.cache.get(setupData.orderRoom);

                        const row = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId("buyy_order_ticket")
                                .setLabel("شـــراء طـــلـــب")
                                .setEmoji("<a:003:1326822406316097568>")
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId("orderss-pricee")
                                .setLabel("رؤيــة الاســعــار")
                                .setEmoji("<a:0091:1326822365908303933>")
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId("order-owner")
                                .setLabel("تــواصــل مــع صــاحــب الــطــلــب")
                                .setEmoji("<a:004:1326822409227210845>")
                                .setStyle(ButtonStyle.Secondary)
                        );    

                     const attachments = m.attachments.map(att => att.url);

    const msg = await channel.send({
        content: `**\`﹣\` <a:hox_star_light:1326824621722435655> تــواصــل مــع : __<@${interaction.user.id}>__**\n**\`﹣\` <a:hox_star_gray:1326824634397626478> الــطــلــب : ${order}**\n**\`﹣\` <a:hox_star_blue:1326824579389456394> الــمــنــشــن : __${mention}__**`,
        files: attachments, // يضيف الصور مع الرسالة
        components: [row]
    });
                            
                        await interaction.channel.send({
                            content: `**تـــم ارسـال طـلـبـك: ${msg.url}**`
                        });

                        // إزالة المستخدم من العمليات النشطة بعد اكتمال العملية
                        activePurchases.delete(interaction.user.id);
                        purchaseCollectors.delete(interaction.user.id);
                       
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
                                        guildId: interaction.guild.id, 
                                        ticketType: "order" 
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
                                    .setTitle("تــم شــراء طــلــب (تــلــقــائــي)")
                                    .addFields(
                                        { name: "بـواسـطـة:", value: `<@${interaction.user.id}>`, inline: true },
                                        { name: "الـطـلـب:", value: order, inline: true },      
                                        { name: "نــوع الـــطـلــب: ", value: `${typeOrder}`, inline: true }
                                    )
                                    .setTimestamp();
                                await logChannel.send({ embeds: [embedLog] });
                            }
                        }
                    });

                    nameCollector.on('end', collected => {
                        if (collected.size === 0) {
                            interaction.followUp({
                                content: "**انــتــهــى الــوقــت الــمــحــدد لإدخــال الـطـلـب **",
                                ephemeral: false
                            });
                            // إزالة المستخدم من العمليات النشطة عند انتهاء الوقت
                            activePurchases.delete(interaction.user.id);
                            purchaseCollectors.delete(interaction.user.id);
                        }
                    });
                } catch (error) {
                    console.error(error);
                    await interaction.followUp({
                        content: `**حــدث خــطــأ، الرجــاء الــتــواصــل مــع الدعــم لــحــل الــمــشــكــلــة**\n[رابــط الدعــم](https://discord.gg/DDEMEczWAx)\n**الــمــشــكــلــة:** ${error.message}`,
                        ephemeral: false
                    });
                    // إزالة المستخدم من العمليات النشطة في حالة الخطأ
                    activePurchases.delete(interaction.user.id);
                    purchaseCollectors.delete(interaction.user.id);
                }
            });

            messageCollector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.followUp({
                        content: "**تــم انــتــهــاء الــوقــت\nالــرجــاء عــدم الــتــحــويــل**",
                        ephemeral: false
                    });
                    // إزالة المستخدم من العمليات النشطة عند انتهاء الوقت
                    activePurchases.delete(interaction.user.id);
                    purchaseCollectors.delete(interaction.user.id);
                }
            });
        }

        // إلغاء الشراء
        if (interaction.customId === "cancel_purchase2") {
            // إزالة المستخدم من العمليات النشطة
            activePurchases.delete(interaction.user.id);
            
            // إيقاف الكوليكتورز إذا كانت موجودة
            const collectors = purchaseCollectors.get(interaction.user.id);
            if (collectors) {
                collectors.messageCollector?.stop();
                collectors.nameCollector?.stop();
                purchaseCollectors.delete(interaction.user.id);
            }

            await interaction.update({
                content: "**تــم إلــغــاء عــمــلــيــة الــشــراء**",
                embeds: [],
                components: []
            });


        }
    }
};