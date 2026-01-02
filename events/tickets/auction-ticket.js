const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder } = require("discord.js");
const Prices = require("../../Mangodb/prices.js");
const Setup = require('../../Mangodb/setup.js');
const Auction = require('../../Mangodb/auction.js');
const AuctionChannels = require('../../Mangodb/auctions-channels.js');
const Ticket = require('../../Mangodb/tickets.js');
const SaleState = require('../../Mangodb/saleState.js');
const axios = require('axios');
const FormData = require('form-data');

module.exports = {
    name: "interactionCreate",
    once: false,
    async execute(client, interaction) {
        // تعريف دالة مساعدة لتحديث رسالة إدخال البيانات
        const updateDataEntryMessage = async (ticket) => {
            try {
                if (!ticket.dataEntryMessageId) return;
                
                const channel = interaction.channel;
                const message = await channel.messages.fetch(ticket.dataEntryMessageId);
                const embed = message.embeds[0];
                
                // إنشاء حقول جديدة مع البيانات المحدثة
                const fields = [
                    { 
                        name: "الـسـلـعـة", 
                        value: ticket.auctionData?.item || "لـم يـتـم تـعـيـيـنـهـا", 
                        inline: true 
                    },
                    { 
                        name: "الـسـعـر", 
                        value: ticket.auctionData?.price || "لـم يـتـم تـعـيـيـنـه", 
                        inline: true 
                    },
                    { 
                        name: "الـضـريـبـة", 
                        value: ticket.auctionData?.tax || "لـم يـتـم تـعـيـيـنـهـا", 
                        inline: true 
                    },
                    { 
                        name: "الـصـور", 
                        value: `${ticket.auctionData?.photos?.length || 0} صـورة`, 
                        inline: true 
                    }
                ];
                
                const newEmbed = EmbedBuilder.from(embed.data)
                    .setFields(fields);
                
                // تمكين زر التم إذا كانت البيانات كاملة
                const requiredFieldsSet = 
                    ticket.auctionData?.item && ticket.auctionData.item.trim() !== '' &&
                    ticket.auctionData?.price && ticket.auctionData.price.trim() !== '' &&
                    ticket.auctionData?.tax && ticket.auctionData.tax.trim() !== '';
                
                const row = ActionRowBuilder.from(message.components[0]);
                const finishButton = row.components.find(button => button.data.custom_id === "finish_auction_data");
                
                if (finishButton) {
                    finishButton.setDisabled(!requiredFieldsSet);
                }
                
                await message.edit({ 
                    embeds: [newEmbed], 
                    components: [row] 
                });
            } catch (error) {
                console.error("خطأ في تحديث رسالة إدخال البيانات:", error);
            }
        };
        
        if (!interaction.guild) return;
        const guildId = interaction.guild.id;
    
        // فتح تذكرة مزاد
        if (interaction.isButton()) {  
            if (interaction.customId === "buyy_auction_ticket") {
                // التحقق من وجود تذكرة مفتوحة
                const existingTicket = await Ticket.findOne({ 
                    userId: interaction.user.id,
                    guildId: guildId,
                    ticketType: "auction", 
                    closed: false
                });

                if (existingTicket) {
                    try {
                        const channel = await interaction.guild.channels.fetch(existingTicket.channelId);
                        const cancelButton = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('astacancel-auction-ticket')
                                .setLabel('الــغــاء')
                                .setStyle(ButtonStyle.Danger)
                        );

                        return interaction.reply({
                            ephemeral: true,
                            content: `**عــنــدك تــذكــرة مــفــتــوحــة :${channel}\n-# لو عــنــدك مــشــكــلــة اســتــعــمــل زر الــغــاء ســوف يــتــم حــل جــمــيــع مــشــاكــلــك**`,
                            components: [cancelButton],
                        });
                    } catch (error) {
                        await Ticket.deleteOne({ _id: existingTicket._id });
                    }
                }

                // التحقق من إعدادات السيرفر
                const setupData = await Setup.findOne({ guildId });
                if (!setupData?.auctionTicket) {
                    return interaction.reply({
                        content: `**❌ | يـرجـي تـحـديـد كـاتـاغـوري تذاكر المزادات عـبـر أمـر __/setup__**`,
                        ephemeral: true
                    });
                }

                const category = await client.channels.fetch(setupData.auctionTicket).catch(() => null);
                if (!category) {
                    return interaction.reply({
                        content: `**❌ | كـاتـاغـوري تذاكر المزادات مـحـذوفـة **`,
                        ephemeral: true
                    });
                }

                // إنشاء تذكرة جديدة
                const ticket = await interaction.guild.channels.create({
                    name: `auction-${interaction.user.username}`,
                    type: 0,
                    parent: category,
                    topic: `Ticket Owner: ${interaction.user.id}`,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] }
                    ]
                });

                // حفظ بيانات التذكرة
                const newTicket = new Ticket({
                    userId: interaction.user.id,
                    guildId: guildId,
                    channelId: ticket.id,
                    ticketType: 'auction',
                    closed: false,
                    createdAt: new Date()
                });
                await newTicket.save();

                // منح صلاحيات للمسؤولين
                if (setupData.auctionAdmin) {
                    await ticket.permissionOverwrites.edit(setupData.auctionAdmin, { ViewChannel: true });
                }

                // جلب قنوات المزادات المتاحة
                const auctionChannels = await AuctionChannels.find({ guildId });
                console.log("قنوات المزادات من قاعدة البيانات:", auctionChannels);
                
                if (!auctionChannels || auctionChannels.length === 0) {
                    return interaction.reply({
                        content: `**❌ | لا توجد قنوات مزادات متاحة حالياً**`,
                        ephemeral: true
                    });
                }

                const rows = [];
                let currentRow = new ActionRowBuilder();

                // إضافة أزرار قنوات المزادات
                for (const channelData of auctionChannels) {
                    const channelObj = interaction.guild.channels.cache.get(channelData.channelId);
                    if (channelObj) {
                        console.log(`إضافة زر للقناة: ${channelObj.name} (${channelObj.id})`);
                        
                        // إذا كان الصف ممتلئ (5 أزرار)، أنشئ صف جديدًا
                        if (currentRow.components.length >= 5) {
                            rows.push(currentRow);
                            currentRow = new ActionRowBuilder();
                        }

                        currentRow.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`auction_channel_${channelData.channelId}`)
                                .setLabel(`#${channelObj.name}`)
                                .setStyle(ButtonStyle.Secondary)
                        );
                    }
                }

                // أضف الصف الأخير إذا كان يحتوي على أزرار
                if (currentRow.components.length > 0) {
                    rows.push(currentRow);
                }

                // إضافة زر الإغلاق في صف جديد
                const closeRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("close_auction_ticket")
                        .setLabel("إغـلاق الـتـذكـرة")
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji("<a:no:1405131885146800148>")
                );
                rows.push(closeRow);

                const embed = new EmbedBuilder()
                    .setTitle("شـراء مـزاد")
                    .setDescription("**<a:004:1326822409227210845> لـ شـراء مـزاد الــرجــاء اخــتــيــار روم الــمــزاد <a:004:1326822409227210845>\n <a:hox_red_spar:1405145176027959366> لـ اغـلاق الـتـذكـرة الـرجـاء الضغط عـلـي زر إغـلاق الـتـذكـرة <a:hox_red_spar:1405145176027959366>**")
                    .setImage(setupData?.line || null)
                    .setFooter({ text: "Dev By only.asta", iconURL: interaction.guild.iconURL({ dynamic: true }) })
                    .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) });

                // إرسال الرسالة بجميع الصفوف
                await ticket.send({ 
                    content: `${interaction.user}`, 
                    embeds: [embed], 
                    components: rows  // هنا التصحيح المهم - استخدام rows بدلاً من [row, closeRow]
                });

                await interaction.reply({ 
                    content: `**تـم إنـشـاء تـذكـرة الـمـزاد بـنـجـاح ${ticket}**`, 
                    ephemeral: true 
                });
            }
        

        // إغلاق تذكرة المزاد
        if (interaction.customId === "close_auction_ticket") {
            const userId = interaction.channel.topic?.replace('Ticket Owner: ', '');
            if (!userId) return interaction.reply({ content: "**هـذه لـيـسـت تـذكـرة**", ephemeral: true });

            await Ticket.updateOne(
                { channelId: interaction.channel.id },
                { $set: { closed: true, closedAt: new Date() } }
            );

            await interaction.reply({ content: "**ســوف يــتــم إغــلاق الــتــذكــرة بــعــد 10 ثــوانــي**" });
            setTimeout(async () => {
                if (interaction.channel.deletable) {
                    await interaction.channel.delete().catch(() => {});
                }
            }, 10000);
        }

        // اختيار قناة مزاد
        if (interaction.customId.startsWith("auction_channel_")) {
            const channelId = interaction.customId.replace('auction_channel_', '');
            const userId = interaction.channel.topic?.replace('Ticket Owner: ', '');
            if (!userId || userId !== interaction.user.id) {
                return interaction.reply({ content: "**هـذه لـيـسـت تـذكـرتـك**", ephemeral: true });
            }
                const saleState = await SaleState.findOne({
                    guildId: interaction.guild.id,
                    type: "auction"
                });
                
                if (saleState?.state === "disable") {
                    return interaction.reply({
                        content: "**بــيــع الــمــزاد مــعــطــل حالياً**",
                        ephemeral: true
                    });
                }
            // التحقق من وجود مزاد نشط في القناة
          const existingAuction = await Auction.findOne({ 
                guildId: guildId,
                channelId: channelId,
                active: true
            });

            if (existingAuction) {
                return interaction.reply({
                    content: `**يــوجــد مــزاد نــشــط فــي هــذا الــروم <#${channelId}>**`,
                    ephemeral: true
                });
            }

            // حفظ القناة المختارة في بيانات التذكرة
            await Ticket.updateOne(
                { channelId: interaction.channel.id },
                { $set: { auctionChannelId: channelId } }
            );

            // عرض خيارات المنشن مع الأسعار
            const prices = await Prices.findOne({ guildId });
            if (!prices) {
                return interaction.reply({
                    content: "**لـم يـتـم تـحـديـد أسـعـار الـمـنـشـنـات**",
                    ephemeral: true
                });
            }

            // إنشاء أزرار لأنواع المنشن المتاحة
            const mentionRow = new ActionRowBuilder();
            const setupData = await Setup.findOne({ guildId });
            if (prices.auctionEveryPrice) {
                mentionRow.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`auction_mention_every`)
                        .setLabel(`@everyone`)
                        .setStyle(ButtonStyle.Secondary)
                );
            }
            
            if (prices.auctionHerePrice) {
                mentionRow.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`auction_mention_here`)
                        .setLabel(`@here`)
                        .setStyle(ButtonStyle.Secondary)
                );
            }
            
            if (setupData.auctionMention) {
            const role = interaction.guild.roles.cache.get(setupData.auctionMention);


                mentionRow.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`auction_mention_role`)
                        .setLabel(`@${role.name ||'مـنـشـن مـزاد'}`)
                        .setStyle(ButtonStyle.Secondary)
                );
            }

            if (mentionRow.components.length === 0) {
                return interaction.reply({
                    content: "**لـم يـتـم تـحـديـد أسـعـار لأي نـوع مـن الـمـنـشـنـات**",
                    ephemeral: true
                });
            }

            mentionRow.addComponents(
                new ButtonBuilder()
                    .setCustomId("cancel_auction")
                    .setLabel("إلــغــاء")
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji("<a:no:1405131885146800148>")
            );

            const mentionEmbed = new EmbedBuilder()
                .setTitle("اخــتــيــار نــوع الــمــنــشــن")
            .setImage(setupData.line)
                .setDescription("**الــرجــاء اخــتــيــار نــوع الــمــنــشــن لــلــمــزاد مــع الــســعــر الــمــطــلــوب**")
    .setAuthor({
        name: interaction.guild.name,
        iconURL: interaction.guild.iconURL({ dynamic: true })
    })
    .setFooter({
        text: "Dev By only.asta",
        iconURL: interaction.guild.iconURL({ dynamic: true })
    });
            await interaction.reply({
                content: `${interaction.user}`,
                embeds: [mentionEmbed],
                components: [mentionRow],
                ephemeral: false
            });
        }

        // اختيار نوع المنشن
        if (interaction.customId.startsWith("auction_mention_")) {
            const mentionType =       interaction.customId.replace('auction_mention_', '');
            const setupData = await Setup.findOne({ guildId });
            const userId = interaction.channel.topic?.replace('Ticket Owner: ', '');
            if (!userId || userId !== interaction.user.id) {
                return interaction.reply({ content: "**هـذه لـيـسـت تـذكـرتـك**", ephemeral: true });
            }

            const prices = await Prices.findOne({ guildId });
            let price = 0;
            let mentionName = "";

            switch (mentionType) {
                case "every":
                    price = prices.auctionEveryPrice;
                    mentionName = "@everyone";
                    break;
                case "here":
                    price = prices.auctionHerePrice;
                    mentionName = "@here";
                    break;
                case "role":
                    price = prices.auctionMentionPrice;
                    mentionName = `<@&${setupData.auctionMention}>`;
                    break;
                default:
                    return interaction.reply({
                        content: "**نــوع الــمــنــشــن غــيــر مــعــروف**",
                        ephemeral: true
                    });
            }

            // حفظ نوع المنشن والسعر في بيانات التذكرة
            await Ticket.updateOne(
                { channelId: interaction.channel.id },
                { 
                    $set: { 
                        auctionMentionType: mentionType,
                        auctionPrice: price,
                        auctionMentionName: mentionName
                    } 
                }
            );

            // عرض تأكيد الشراء
            const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`confirmm_auction`)
                    .setLabel("تــأكــيــد الــشــراء")
                    .setStyle(ButtonStyle.Success)
                    .setEmoji("<a:yes:1405131777948909599>"),
                new ButtonBuilder()
                    .setCustomId("cancel_auction")
                    .setLabel("إلــغــاء الــعــمــلــيــة")
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji("<a:no:1405131885146800148>")
            );

const priceEmbed = new EmbedBuilder()
    .setTitle("تــأكــيــد شــراء الــمــزاد")
            .setImage(setupData.line)
	    .addFields(
        { name: "نــوع الــمــنــشــن", value: mentionName, inline: true },
        { name: "الــســعــر", value: `${price}`, inline: true }
    )
    .setAuthor({
        name: interaction.guild.name,
        iconURL: interaction.guild.iconURL({ dynamic: true })
    })
    .setFooter({
        text: "Dev By only.asta",
        iconURL: interaction.guild.iconURL({ dynamic: true })
    });

            await interaction.update({
                content: `${interaction.user}`,
                embeds: [priceEmbed],
                components: [confirmRow]
            });
        }

        // تأكيد شراء المزاد
        if (interaction.customId === "confirmm_auction") {
            const userId = interaction.channel.topic?.replace('Ticket Owner: ', '');
            if (!userId || userId !== interaction.user.id) {
                return interaction.reply({ content: "**هـذه لـيـسـت تـذكـرتـك**", ephemeral: true });
            }

            const setupData = await Setup.findOne({ guildId });
            if (!setupData || !setupData.bank) {
                return interaction.reply({
                    content: "**الــرجــاء اخــبــار الادارة بــوضــع صــاحــب الــتــحــويــل مــن امــر\n /setup**",
                    ephemeral: true
                });
            }

            const ticketData = await Ticket.findOne({ channelId: interaction.channel.id });
            if (!ticketData || !ticketData.auctionPrice) {
                return interaction.reply({
                    content: "**لــم يــتــم تــحــديــد ســعــر الــمــزاد**",
                    ephemeral: true
                });
            }

            const price = ticketData.auctionPrice;
            const taxs = Math.floor((price * 20) / 19 + 1);

            // إرسال تعليمات الدفع

const paymentEmbed = new EmbedBuilder()
    .setTitle("عــمــلــيــة الــتــحــويــل")
    .setDescription(`**<a:011:1326822363785990205> الــرجــاء الــتــحــويــل فــي اســرع وقــت لــ شــراء الـمـزاد <a:011:1326822363785990205>**`)
    .setAuthor({
        name: interaction.guild.name,
        iconURL: interaction.guild.iconURL({ dynamic: true })
    })
    .setImage(setupData.line)
    .setFooter({
        text: "Dev By only.asta",
        iconURL: interaction.guild.iconURL({ dynamic: true })
    });

            await interaction.message.edit({ 
                content: `${interaction.user}`,
                embeds: [paymentEmbed], 
                components:[] 
            });
            
            await interaction.reply({
                content: `**مــعــك 5 دقــائــق للــتــحــويــل**\n\`\`\`#credit ${setupData.bank} ${taxs}\`\`\``
            });

            // جمع معلومات المزاد بعد الدفع
            const messageCollectorFilter = (m) =>
                m.author.bot &&
                (m.content === `**:moneybag: | ${interaction.user.username}, has transferred \`$${price}\` to <@!${setupData.bank}> **` ||
                 m.content === `**ـ ${interaction.user.username}, قام بتحويل \`$${price}\` لـ <@!${setupData.bank}> ** |:moneybag:**`);

            const messageCollector = interaction.channel.createMessageCollector({
                filter: messageCollectorFilter,
                time: 300000 // 5 دقائق
            });

            messageCollector.on('collect', async () => {
                messageCollector.stop();
                
                // إنشاء واجهة إدخال بيانات المزاد
                const dataEntryRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("set_auction_item")
                        .setLabel("تـعـيـيـن الـسـلـعـة")
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId("set_auction_price")
                        .setLabel("تـعـيـيـن الـسـعـر")
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId("set_auction_tax")
                        .setLabel("تـعـيـيـن الـضـريـبـة")
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('main_edit_photos')
                        .setLabel("تـعـديـل الـصـور")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId("finish_auction_data")
                        .setLabel("تـم")
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(true) // تعطيل الزر في البداية
                );

                const dataEntryEmbed = new EmbedBuilder()
                    .setTitle("إدخـال بـيـانـات الـمـزاد")
                    .setDescription("**الـرجـاء إدخـال بـيـانـات الـمـزاد بـاسـتـخـدام الأزرار الـتـالـيـة**")
                    .addFields(
                        { name: "الـسـلـعـة", value: "لـم يـتـم تـعـيـيـنـهـا", inline: true },
                        { name: "الـسـعـر", value: "لـم يـتـم تـعـيـيـنـه", inline: true },
                        { name: "الـضـريـبـة", value: "لـم يـتـم تـعـيـيـنـهـا", inline: true },
                        { name: "الـصـور", value: "0 صـورة", inline: true }
                    )
                    .setFooter({ text: "Dev By Only.Zynx", iconURL: interaction.guild.iconURL({ dynamic: true }) });

                const dataEntryMessage = await interaction.followUp({
                    embeds: [dataEntryEmbed],
                    components: [dataEntryRow]
                });

                // حفظ رسالة إدخال البيانات في التذكرة
                await Ticket.updateOne(
                    { channelId: interaction.channel.id },
                    { 
                        $set: { 
                            dataEntryMessageId: dataEntryMessage.id,
                            auctionData: {
                                photos: []
                            }
                        } 
                    }
                );
            });

            messageCollector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.followUp({
                        content: "**تــم انــتــهــاء الــوقــت\nالــرجــاء عــدم الــتــحــويــل**",
                        ephemeral: false
                    });
                }
            });
        }

        // معالجة أزرار إدخال بيانات المزاد
        if (interaction.customId === "set_auction_item") {
            const modal = new ModalBuilder()
                .setCustomId('auction_item_modal')
                .setTitle('اسـم الـسـلـعـة');

            const itemInput = new TextInputBuilder()
                .setCustomId('item_input')
                .setLabel("اسـم الـسـلـعـة (مـطـلـوب)")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(100);

            const row = new ActionRowBuilder().addComponents(itemInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
        }

        if (interaction.customId === "set_auction_price") {
            const modal = new ModalBuilder()
                .setCustomId('auction_price_modal')
                .setTitle('الـسـعـر الـبـدائـي');

            const priceInput = new TextInputBuilder()
                .setCustomId('price_input')
                .setLabel("الـسـعـر الـبـدائـي (مـطـلـوب)")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(20);

            const row = new ActionRowBuilder().addComponents(priceInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
        }

        if (interaction.customId === "set_auction_tax") {
            const taxRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("tax_yes")
                    .setLabel("نــعــم بــضــريــبــة")
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId("tax_no")
                    .setLabel("لا بـدون ضـريـبـة")
                    .setStyle(ButtonStyle.Danger)
            );

            await interaction.reply({
                content: '**الــرجــاء اخــتــيــار نــوع الــضــريــبــة**',
                components: [taxRow],
                ephemeral: true
            });
        }

        // دالة رفع الصور إلى Imgbb API
        async function uploadImage(attachment) {
          try {
            const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data, 'binary');
            
            const form = new FormData();
            form.append('key', 'd6207a09b60e476f2955a7d9990f86a6'); // API key المطلوب
            form.append('image', buffer.toString('base64')); // استخدام base64 بدلاً من ملف
            
            const uploadResponse = await axios.post('https://api.imgbb.com/1/upload', form, {
              headers: {
                ...form.getHeaders()
              }
            });

            if (uploadResponse.data && uploadResponse.data.data && uploadResponse.data.data.url) {
              return uploadResponse.data.data.url;
            } else {
              console.error('Invalid response from Imgbb:', uploadResponse.data);
              return null;
            }
          } catch (error) {
            console.error('Upload error:', error.response?.data || error.message);
            return null;
          }
        }

        // زر تعديل الصور الرئيسي
        if (interaction.customId === "main_edit_photos") {
            const userId = interaction.user.id;
            const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
            
            if (!ticket) {
                return interaction.reply({ content: "**❌ | لا توجد تذكرة نشطة**", ephemeral: true });
            }
            
            // التحقق من أن المستخدم هو صاحب التذكرة
            if (userId !== ticket.userId) {
                return interaction.reply({ content: "**❌ | فقط صاحب التذكرة يمكنه تعديل الصور**", ephemeral: true });
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('add_photos')
                    .setLabel('إضـافـة صـور')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('remove_photos')
                    .setLabel('إزالـة صـور')
                    .setStyle(ButtonStyle.Danger)
            );

            await interaction.reply({ content: "اخـتـر مـا تـريـد فـعـلـه:", components: [row], ephemeral: true });
        }

        // إضافة الصور
        if (interaction.customId === "add_photos") {
            const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
            
            if (!ticket) {
                return interaction.reply({ content: "**❌ | لا توجد تذكرة نشطة**", ephemeral: true });
            }
            
            if (interaction.user.id !== ticket.userId) {
                return interaction.reply({ content: "**❌ | فقط صاحب التذكرة يمكنه إضافة الصور**", ephemeral: true });
            }

            await interaction.reply({ content: "**الــرجــاء إرســال الــصــور فــي رســالــة واحــدة (يـمـكـن إرسـال عـدة صـور)**", ephemeral: true });

            const filter = m => m.author.id === interaction.user.id && m.attachments.size > 0;
            const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });

            collector.on('collect', async m => {
                const attachments = Array.from(m.attachments.values());
                const currentPhotos = ticket.auctionData?.photos || [];
                const spaceLeft = 10 - currentPhotos.length;
                
                if (spaceLeft <= 0) {
                    await interaction.followUp({ content: "**❌ | لـقـد وصـلـت إلـى الـحـد الـأقـصـى مـن الـصـور (10)**", ephemeral: true });
                    return;
                }
                
                const toProcess = attachments.slice(0, spaceLeft);
                
                // إظهار رسالة انتظار
                await interaction.followUp({ content: "**⏳ | جـاري رفـع الـصـور إلـى الـسـيـرفـر...**", ephemeral: true });
                
                // رفع الصور إلى Imgbb API والحصول على الروابط
                const uploadedUrls = [];
                for (const [index, attachment] of toProcess.entries()) {
                    const url = await uploadImage(attachment);
                    if (url) {
                        uploadedUrls.push(url);
                        console.log(`✅ تم رفع الصورة ${index + 1}/${toProcess.length}`);
                    } else {
                        console.log(`❌ فشل رفع الصورة ${index + 1}`);
                    }
                }
                
                if (uploadedUrls.length === 0) {
                    await interaction.followUp({ content: "**❌ | فـشـل رفـع أي صـورة، يـرجـى الـمـحـاولـة مـجـدداً**", ephemeral: true });
                    return;
                }
                
                // تحديث التذكرة بإضافة الصور الجديدة
                await Ticket.updateOne(
                    { channelId: interaction.channel.id },
                    { 
                        $set: { 
                            "auctionData.photos": [...currentPhotos, ...uploadedUrls]
                        } 
                    }
                );
                
                await m.delete().catch(() => {});
                
                // إنشاء إيمبد لعرض الصور المضافة
                const embed = new EmbedBuilder()
                    .setTitle("✅ تــم إضــافــة الــصــور بــنــجــاح")
                    .setDescription(`تــم إضــافــة ${uploadedUrls.length} صــورة بنجاح\nالإجــمــالــي الآن: **${currentPhotos.length + uploadedUrls.length}/10**`)
                    .setColor("#00FF00")
                    .setTimestamp();
                    
                // إضافة الصور المضافة إلى الإيمبد
                if (uploadedUrls.length > 0) {
                    embed.setImage(uploadedUrls[0]);
                    
                    // إذا كان هناك أكثر من صورة، أضفها كحقول
                    if (uploadedUrls.length > 1) {
                        const fields = [];
                        for (let i = 1; i < uploadedUrls.length; i++) {
                            fields.push({ 
                                name: `صــورة ${i + 1}`, 
                                value: `[عــرض الــصــورة](${uploadedUrls[i]})`, 
                                inline: true 
                            });
                        }
                        embed.addFields(fields);
                    }
                }
                
                await interaction.followUp({ 
                    embeds: [embed], 
                    ephemeral: true 
                });
                
                // تحديث رسالة إدخال البيانات
                const updatedTicket = await Ticket.findOne({ channelId: interaction.channel.id });
                await updateDataEntryMessage(updatedTicket);
            });

            collector.on('end', (collected) => {
                if (collected.size === 0) {
                    interaction.followUp({ content: "**❌ | انـتـهـى الـوقـت لـم يـتـم إرسـال أي صـور**", ephemeral: true });
                }
            });
        }

        // إزالة الصور
        if (interaction.customId === "remove_photos") {
            const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
            
            if (!ticket || !ticket.auctionData?.photos || ticket.auctionData.photos.length === 0) {
                return interaction.reply({ content: "**❌ | لا توجد صور لإزالتها**", ephemeral: true });
            }
            
            if (interaction.user.id !== ticket.userId) {
                return interaction.reply({ content: "**❌ | فقط صاحب التذكرة يمكنه إزالة الصور**", ephemeral: true });
            }

            let currentIndex = 0;
            const photos = ticket.auctionData.photos;

            const generateEmbed = (index) => {
                const embed = new EmbedBuilder()
                    .setTitle(`🖼️ عــرض الــصــور (${index + 1}/${photos.length})`)
                    .setImage(photos[index])
                    .setDescription("**استخدم الأزرار للتحكم في الصور:**\n⬅️ ➡️ - التنقل بين الصور\n🗑️ - حذف الصورة الحالية")
                    .setColor("#FFA500")
                    .setFooter({ text: `الصورة ${index + 1} من ${photos.length}` });
                    
                return embed;
            };

            const row = () => new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev_photo')
                    .setEmoji('⬅️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentIndex === 0),
                new ButtonBuilder()
                    .setCustomId('delete_photo')
                    .setEmoji('🗑️')
                    .setStyle(ButtonStyle.Danger)
                    .setLabel('حذف الصورة'),
                new ButtonBuilder()
                    .setCustomId('next_photo')
                    .setEmoji('➡️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentIndex === photos.length - 1)
            );

            const message = await interaction.reply({ 
                embeds: [generateEmbed(currentIndex)], 
                components: [row()], 
                ephemeral: true, 
                fetchReply: true 
            });

            const collector = message.createMessageComponentCollector({ time: 120000 }); // 2 دقيقة

            collector.on('collect', async i => {
                if (i.user.id !== ticket.userId) {
                    return i.reply({ content: "**❌ | فقط صاحب التذكرة يمكنه استخدام هذه الأزرار**", ephemeral: true });
                }

                await i.deferUpdate();

                if (i.customId === 'next_photo') currentIndex++;
                if (i.customId === 'prev_photo') currentIndex--;
                
                if (i.customId === 'delete_photo') {
                    // حذف الصورة الحالية
                    const deletedPhoto = photos.splice(currentIndex, 1)[0];
                    if (currentIndex >= photos.length) currentIndex = Math.max(0, photos.length - 1);
                    
                    // تحديث التذكرة بإزالة الصور
                    await Ticket.updateOne(
                        { channelId: interaction.channel.id },
                        { 
                            $set: { 
                                "auctionData.photos": photos
                            } 
                        }
                    );
                    
                    // إرسال رسالة تأكيد الحذف
                    await i.followUp({ 
                        content: `**✅ | تــم حــذف الــصــورة بــنــجــاح**`, 
                        ephemeral: true 
                    });
                }

                if (photos.length === 0) {
                    await i.editReply({ 
                        content: "**✅ | تـم حـذف جـمـيـع الـصـور**", 
                        embeds: [], 
                        components: [] 
                    });
                    collector.stop();
                    
                    // تحديث رسالة إدخال البيانات
                    const updatedTicket = await Ticket.findOne({ channelId: interaction.channel.id });
                    await updateDataEntryMessage(updatedTicket);
                    return;
                }

                await i.editReply({ 
                    embeds: [generateEmbed(currentIndex)], 
                    components: [row()] 
                });
            });

            collector.on('end', async () => {
                try {
                    await message.edit({ components: [] });
                } catch (error) {
                    console.log('الرسالة قد تكون محذوفة أو غير قابلة للتعديل');
                }
                
                // تحديث رسالة إدخال البيانات
                const updatedTicket = await Ticket.findOne({ channelId: interaction.channel.id });
                await updateDataEntryMessage(updatedTicket);
            });
        }

        // معالجة أزرار الضريبة
        if (interaction.customId === "tax_yes" || interaction.customId === "tax_no") {
            const taxValue = interaction.customId === "tax_yes" ? 
                "هــذا الــمــزاد ســيــكــون بــالــضــريــبــه" : 
                "هــذا الــمــزاد لــن يــكــون بــالــضــريــبــه";
            
            await Ticket.updateOne(
                { channelId: interaction.channel.id },
                { 
                    $set: { 
                        "auctionData.tax": taxValue 
                    } 
                }
            );
            
            const updatedTicket = await Ticket.findOne({ channelId: interaction.channel.id });
            await updateDataEntryMessage(updatedTicket);
            
            await interaction.update({ 
                content: `**تــم اخــتــيــار: ${taxValue}**`, 
                components: [] 
            });
        }

        // معالجة زر "تم" لتأكيد البيانات
        if (interaction.customId === "finish_auction_data") {
            const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
            if (!ticket || !ticket.auctionData) {
                return interaction.reply({ 
                    content: "**لــم يــتــم وجــود بـيـانـات لـلـمـزاد**", 
                    ephemeral: true 
                });
            }
            const setupData = await Setup.findOne({ guildId: interaction.guild.id });

            const { item, price, tax } = ticket.auctionData;
            
            // تحقق أكثر دقة من الحقول المطلوبة
            const isItemValid = item && item.trim() !== '' && item !== "لـم يـتـم تـعـيـيـنـهـا";
            const isPriceValid = price && price.trim() !== '' && price !== "لـم يـتـم تـعـيـيـنـه";
            const isTaxValid = tax && tax.trim() !== '' && tax !== "لـم يـتـم تـعـيـيـنـهـا";
            
            if (!isItemValid || !isPriceValid || !isTaxValid) {
                return interaction.reply({ 
                    content: "**الــرجــاء تــعــيــيـن الــســلــعــة، الــســعــر، والــضــريــبــة أولاً**", 
                    ephemeral: true 
                });
            }

            // إنشاء زر بدء المزاد (للمسؤولين فقط)
            const startRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("starttt_auction")
                    .setLabel("بــدأ الــمــزاد")
                    .setStyle(ButtonStyle.Success)
                    .setEmoji("<a:yes:1405131777948909599>")
            );

            const summaryEmbed = new EmbedBuilder()
                .setTitle("تــفــاصــيــل الــمــزاد")
                .addFields(
                    { name: "الــســلــعــة", value: item, inline: true },
                    { name: "الــســعــر الــبــدائــي", value: price, inline: true },
                    { name: "الــضــريــبــة", value: tax, inline: true },
                    { name: "عــدد الــصــور", value: `${ticket.auctionData.photos?.length || 0}`, inline: true },
                    { name: "نــوع الــمــنــشــن", value: ticket.auctionMentionName, inline: true }
                )
                .setFooter({ 
                    text: "فــقــط الــمــســؤول يــســتــطــيــع بـدء الـمـزاد", 
                    iconURL: interaction.guild.iconURL({ dynamic: true }) 
                });

            if (ticket.auctionData.photos?.length > 0) {
                summaryEmbed.setImage(ticket.auctionData.photos[0]);
            }

            await interaction.reply({
                content:` **تــم حــفــظ بـيـانـات الـمـزاد بـنـجـاح\nفــقــط الــمــســؤول يــســتــطــيــع بـدء الـمـزاد**\n<@&${setupData.auctionAdmin}>`,
                embeds: [summaryEmbed],
                components: [startRow]
            });
        }

        // بدء المزاد (للمسؤولين فقط)
        if (interaction.customId === "starttt_auction") {
            const setupData = await Setup.findOne({ guildId: interaction.guild.id });
            if (!setupData?.auctionAdmin || !interaction.member.roles.cache.has(setupData.auctionAdmin)) {
                return interaction.reply({
                    content: "**❌ | لـيـس لـديـك صـلاحـيـة لـبـدء الـمـزاد**",
                    ephemeral: true
                });
            }

            const ticketData = await Ticket.findOne({ channelId: interaction.channel.id });
            if (!ticketData || !ticketData.auctionData || !ticketData.auctionChannelId) {
                return interaction.reply({
                    content: "**❌ | لا يـوجـد بـيـانـات كـامـلـة لـلـمـزاد**",
                    ephemeral: true
                });
            }

            const { auctionData, auctionChannelId, userId, auctionMentionName } = ticketData;
            const auctionChannel = interaction.guild.channels.cache.get(auctionChannelId);
            if (!auctionChannel) {
                return interaction.reply({
                    content: "**❌ | قــنــاة الــمــزاد غــيــر مــوجــودة**",
                    ephemeral: true
                });
            }

            const existingAuction = await Auction.findOne({
                guildId: interaction.guild.id,
                channelId: auctionChannelId,
                active: true
            });

            if (existingAuction) {
                return interaction.reply({
                    content: `**❌ | يــوجــد مــزاد نــشــط فــي <#${auctionChannelId}>**`,
                    ephemeral: true
                });
            }

            try {
                await interaction.message.edit({ components: [] });
                await interaction.channel.send(`**تـم نـشـر الـمـزاد بـنـجـاح فـي ${auctionChannel}\n<@${userId}>**`)
                
                const auctionContent = `**\`﹣\` <a:hox_star_blue:1326824579389456394> صـاحـب الـسـلـعـة: <@${userId}>\n\`﹣\` <a:hox_star_light:1326824621722435655> الـسـلـعـة: ${auctionData.item}\n\`﹣\` <a:hox_star_orange:1326824692648116407> سـعـر الـبـدايـة: ${auctionData.price}\n\`﹣\` <a:hox_star_pink:1326824571130613771> الـسـعـر بـالـضـريـبـة؟: ${auctionData.tax}\n\`﹣\` <a:hox_star_gray:1326824634397626478> نـوع الـمـنـشـن: ${auctionMentionName}**`;

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("stop_auction")
                        .setLabel("تــوقــيــف الــمــزاد")
                        .setEmoji("<a:003:1326822406316097568>")
                        .setStyle(ButtonStyle.Secondary),

                    new ButtonBuilder()
                        .setCustomId("start_auction")
                        .setLabel("اســتــكــمــال الــمــزاد")
                        .setEmoji("<a:005:1326822412607684618>")
                        .setStyle(ButtonStyle.Success),

                    new ButtonBuilder()
                        .setCustomId("remove_auction")
                        .setLabel("حـذف الــمــزاد")
                        .setEmoji("<a:009:1326822419482284123>")
                        .setStyle(ButtonStyle.Danger),

                    new ButtonBuilder()
                        .setLabel("صــاحــب الــمــزاد")
                        .setEmoji("<a:009:1326822419482284123>")
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://discord.com/users/${userId}`)
                );

                // استخدام الصور المرفوعة إلى API
                const imageFiles = auctionData.photos?.slice(0, 10).map(url => ({ attachment: url })) || [];

                const auctionMessage = await auctionChannel.send({
                    content: auctionContent,
                    files: imageFiles,
                    components: [row]
                });

                await auctionChannel.permissionOverwrites.edit(auctionChannel.guild.roles.everyone, {
                    SendMessages: true
                });

                if (setupData.line) {
                    await auctionChannel.send({ files: [setupData.line] });
                }

                // بدء المزاد تلقائياً بوقت 5 دقائق
                const endTime = Date.now() + 5 * 60 * 1000; // 5 دقائق
                const timeMessage = await auctionChannel.send({ 
                    content: `**الـوقـت الـمـتـبـقـي: 5 دقــائــق**` 
                });

                // إنشاء المزاد في قاعدة البيانات
                const newAuction = new Auction({
                    guildId: auctionChannel.guild.id,
                    channelId: auctionChannel.id,
                    messageId: auctionMessage.id,
                    timeMessageId: timeMessage.id,
                    item: auctionData.item,
                    ownerId: userId,
                    startPrice: auctionData.price,
                    currentPrice: auctionData.price,
                    tax: auctionData.tax,
                    mentionType: ticketData.auctionMentionType,
                    active: true,
                    photos: auctionData.photos || [],
                    ticketChannelId: ticketData.channelId,
                    endTime: endTime
                });
                await newAuction.save();

                // بدء العد التنازلي
                const countdownInterval = setInterval(async () => {
                    const remainingTime = newAuction.endTime - Date.now();
                    if (remainingTime <= 0) {
                        clearInterval(countdownInterval);
                        await endAuction(newAuction, auctionChannel, setupData);
                        return;
                    }

                    const minutes = Math.floor(remainingTime / 60000);
                    const seconds = Math.floor((remainingTime / 1000) % 60);
                    
                    try {
                        await timeMessage.edit(`**الــوقــت الــمــتــبــقــي : ${minutes} دقــيــقــة و ${seconds} ثــانــيــة**`);
                    } catch (error) {
                        console.error("Error editing time message:", error);
                    }

                    newAuction.remainingTime = Math.floor(remainingTime / 1000);
                    await newAuction.save();
                }, 5000);

            } catch (err) {
                console.error("خطأ في بدء المزاد:", err);
                await interaction.reply({
                    content: `**❌ | حــدث خــطــأ: ${err.message}**`,
                    ephemeral: true
                });
            }
        }

        // إلغاء العملية
        if (interaction.customId === "cancel_auction") {
            await interaction.update({
                content: "**تــم إلــغــاء الــعــمــلــيــة**",
                embeds: [],
                components: []
            });
        }
       }

        // معالجة مودال الوقت (تم إزالة الحاجة له)
        if (interaction.isModalSubmit() && interaction.customId === "auction_time_modal") {
            // لم يعد هناك حاجة لتحديد الوقت يدوياً
            await interaction.reply({ 
                content: "**❌ | الــوقــت تــلــقــائــي 5 دقــائــق ولا يــمــكــن تــغــيــيــره**", 
                ephemeral: true 
            });
        }

        if (interaction.isModalSubmit()) {
            const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
            if (!ticket) return;

            if (interaction.customId === "auction_item_modal") {
                const item = interaction.fields.getTextInputValue('item_input');
                
                await Ticket.updateOne(
                    { channelId: interaction.channel.id },
                    { 
                        $set: { 
                            "auctionData.item": item 
                        } 
                    }
                );
                
                // جلب التذكرة المحدثة
                const updatedTicket = await Ticket.findOne({ channelId: interaction.channel.id });
                await updateDataEntryMessage(updatedTicket);
                
                await interaction.reply({ 
                    content: `**تــم تـعـيـيـن الـسـلـعـة: ${item}**`, 
                    ephemeral: true 
                });
            }

            if (interaction.customId === "auction_price_modal") {
                const price = interaction.fields.getTextInputValue('price_input');
                
                await Ticket.updateOne(
                    { channelId: interaction.channel.id },
                    { 
                        $set: { 
                            "auctionData.price": price 
                        } 
                    }
                );
                
                // جلب التذكرة المحدثة
                const updatedTicket = await Ticket.findOne({ channelId: interaction.channel.id });
                await updateDataEntryMessage(updatedTicket);
                
                await interaction.reply({ 
                    content: `**تــم تـعـيـيـن الـسـعـر: ${price}**`, 
                    ephemeral: true 
                });
            }
        }
    }
};

// دالة إنهاء المزاد
async function endAuction(auction, auctionChannel, setupData) {
    try {
        await auctionChannel.send("**انــتــهــى وقــت الــمــزاد**");

        auction.active = false;
        await auction.save();

        await auctionChannel.permissionOverwrites.edit(auctionChannel.guild.roles.everyone, {
            SendMessages: false
        });

        await auctionChannel.send({ content: `**تـم انـتـهـاء المـزاد\nالـرجـاء الـتـواصـل مـع: <@${auction.ownerId}>**` });

        if (setupData.line) {
            await auctionChannel.send({ files: [setupData.line] });
        }

        setTimeout(async () => {
            try {
                let fetched;
                do {
                    fetched = await auctionChannel.messages.fetch({ limit: 100 });
                    if (fetched.size > 0) {
                        await auctionChannel.bulkDelete(fetched, true).catch(() => {});
                    }
                } while (fetched.size > 0);

                const embed = new EmbedBuilder()
                    .setImage(setupData.line || null)
                    .setAuthor({
                        name: auctionChannel.guild.name,
                        iconURL: auctionChannel.guild.iconURL(),
                    })
                    .setFooter({
                        text: "Dev By Hox Team",
                        iconURL: auctionChannel.guild.iconURL({ dynamic: true }),
                    })
                    .setDescription("**- لـطـلب مـزاد اضـغـط عـلـي زر شـراء مــزاد\n- لـروئــيــة الاســعــار اضــغـط عـلـي زر روئــيــة الاســعــار**");

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("buyy_auction_ticket")
                        .setLabel("شـــراء مـــزاد")
                        .setEmoji("<a:hox_star_gray:1326824634397626478>")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setLabel("روئــيــة الاســعــار")
                        .setCustomId("auctionprice")
                        .setEmoji("<a:hox_star_blue:1326824579389456394>")
                        .setStyle(ButtonStyle.Secondary)
                );

                await auctionChannel.send({ embeds: [embed], components: [row] });
            } catch (err) {
                console.error("Error in auction cleanup:", err);
            }
        }, 7000);

        await Auction.deleteOne({ _id: auction._id });
        
        // حذف التذكرة بعد إنهاء المزاد
        const ticket = await Ticket.findOne({ channelId: auction.ticketChannelId });
        if (ticket) {
            await Ticket.deleteOne({ _id: ticket._id });
            try {
                const ticketChannel = auctionChannel.guild.channels.cache.get(auction.ticketChannelId);
                if (ticketChannel) {
                    await ticketChannel.send("**ســيــتــم حــذف الــتــذكــرة بــعــد 5 ثــوانــي**");
                    setTimeout(async () => {
                        try {
                            await ticketChannel.delete();
                        } catch (err) {
                            console.error("فشل حذف التذكرة:", err);
                        }
                    }, 5000);
                }
            } catch (err) {
                console.error("Error deleting ticket channel:", err);
            }
        }
    } catch (error) {
        console.error("Error ending auction:", error);
    }
}