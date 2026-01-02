const { ApplicationCommandOptionType, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const Auction = require('../../Mangodb/auction.js');
const Setup = require('../../Mangodb/setup.js');
const auctions = require('../../Mangodb/auctions-channels.js');

// تخزين الفواصل الزمنية والمستمعين لكل مزاد
const activeAuctions = new Map();

// تعريف EventEmitter لإدارة أحداث المزاد
const { EventEmitter } = require('events');
const auctionEvent = new EventEmitter();

module.exports = {
    name: "auction",
    description: "انــشــاء مــزاد",
    dm_permission: false,
    options: [
        { name: "auction-room", description: "روم الــمــزاد", type: ApplicationCommandOptionType.String, required: true, autocomplete: true },
        { name: "item", description: "الـــســـلـــعـــه", type: ApplicationCommandOptionType.String, required: true },
        { name: "owner", description: "صـــاحـــب الـــســـلـــعـــه", type: ApplicationCommandOptionType.User, required: true },
        { name: "mention", description: "نـــوع الـــمـــنـــشـــن", type: ApplicationCommandOptionType.Integer, required: true, choices: [{ name: "everyone", value: 1 }, { name: "here", value: 2 }, { name: "auction-mention", value: 3 }] },
        { name: "time", description: "مـــده الـــوقـــت (مثال: 30s, 5m, 1h, 5h) - الحد الأقصى 5 ساعات", type: ApplicationCommandOptionType.String, required: true },
        { name: "price", description: "الـــســـعـــر الـــبـــدائـــي", type: ApplicationCommandOptionType.String, required: true },
        { name: "tax", description: "الــســعــر بالــضــريــبــة؟", type: ApplicationCommandOptionType.String, required: true, choices: [{ name: "نعم بضريبه", value: "هــذا الــمــزاد ســيــكــون بــالــضــريــبــه" }, { name: "لا بدون ضريبة", value: "هــذا الــمــزاد لــن يــكــون بــالــضــريــبــه" }] },
        ...Array.from({ length: 10 }, (_, i) => ({
            name: `photo${i + 1}`,
            description: `صـــوره ${i + 1} للسلعه`,
            type: ApplicationCommandOptionType.Attachment,
            required: false // جعل جميع الصور اختيارية
        }))
    ],
    async execute(client, interaction) {
        const setup = await Setup.findOne({ guildId: interaction.guild.id });
        if (!setup?.auctionAdmin) return interaction.reply("**الــرجــاء تــحــديــد مــســؤول مــزاد مــن امــر \n/setup**");
        if (!interaction.member.roles.cache.has(setup.auctionAdmin)) return interaction.reply(`**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هـذا الأمـر تـحـتـاج رتـبـه <@&${setup.auctionAdmin}>**`);
        const auctionChannelId = interaction.options.getString("auction-room");
        const auctionChannel = interaction.guild.channels.cache.get(auctionChannelId);
        if (!auctionChannel) return interaction.reply("**هــذا الــروم غــيــر مــوجــود**");
        const existingAuction = await Auction.findOne({ guildId: interaction.guild.id, channelId: auctionChannelId, active: true });
        if (existingAuction) return interaction.reply(`**يــوجــد مــزاد نــشــط فــي هــذا الــروم <#${auctionChannelId}>**`);
        const item = interaction.options.getString("item");
        const owner = interaction.options.getUser("owner");
        const mentionType = interaction.options.getInteger("mention");
        const timeInput = interaction.options.getString("time");
        const price = interaction.options.getString("price");
        const tax = interaction.options.getString("tax");
        const photos = [];
        for (let i = 1; i <= 10; i++) {
            const photo = interaction.options.getAttachment(`photo${i}`);
            if (photo) photos.push(photo);
        }
        let mo;
        switch (mentionType) {
            case 1: mo = "@everyone"; break;
            case 2: mo = "@here"; break;
            case 3: if (!setup.auctionMention) return interaction.reply("**الــرجــاء اســتــخــدام امــر setup وتــحــديــد مــنــشــن مــزاد**"); mo = `<@&${setup.auctionMention}>`; break;
        }
        const timeValue = parseInt(timeInput.slice(0, -1));
        const timeUnit = timeInput.slice(-1).toLowerCase();
        let timeInMs;
        switch (timeUnit) { 
            case "s": timeInMs = timeValue * 1000; break; 
            case "m": timeInMs = timeValue * 60 * 1000; break; 
            case "h": timeInMs = timeValue * 3600000; break; 
            case "d": timeInMs = timeValue * 86400000; break; 
            default: return interaction.reply("**الرجاء إدخال وقت صحيح مثل: 30s أو 5m أو 1h أو 5h**"); 
        }
        
        // التحقق من الحد الأقصى للوقت (5 ساعات)
        const maxTime = 5 * 60 * 60 * 1000; // 5 ساعات بالميلي ثانية
        if (timeInMs > maxTime) {
            return interaction.reply("**الـحـد الاقـصـي للـوقـت 5 سـاعـات فـقـط**");
        }
        
        const endTime = Date.now() + timeInMs;
        const auctionContent = `**\`﹣\` <a:hox_star_blue:1326824579389456394> صـاحـب الـسـلـعـة: ${owner}\n\`﹣\` <a:hox_star_light:1326824621722435655> الـسـلـعـة: ${item}\n\`﹣\` <a:hox_star_orange:1326824692648116407> سـعـر الـبـدايـة: ${price}\n\`﹣\` <a:hox_star_pink:1326824571130613771> الـسـعـر بـالـضـريـبـة؟: ${tax}\n\`﹣\`<a:hox_star_yellow:1326824705423835190> الـمـنـشـن : ${mo}**`;
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("stop_auction").setLabel("تــوقــيــف الــمــزاد").setEmoji("<a:003:1326822406316097568>").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("start_auction").setLabel("اســتــكــمــال الــمــزاد").setEmoji("<a:005:1326822412607684618>").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setLabel("حـذف الــمــزاد").setEmoji("<a:009:1326822419482284123>").setStyle(ButtonStyle.Danger).setCustomId("remove_auction"),
            new ButtonBuilder().setLabel("صــاحــب الــمــزاد").setEmoji("<a:009:1326822419482284123>").setStyle(ButtonStyle.Link).setURL(`https://discord.com/users/${owner.id}`)
        );
        
        // إرسال الرسالة مع أو بدون صور
        let auctionMessage;
        if (photos.length > 0) {
            auctionMessage = await auctionChannel.send({ content: auctionContent, files: photos, components: [row] });
        } else {
            auctionMessage = await auctionChannel.send({ content: auctionContent, components: [row] });
        }
        
        const timeMessage = await auctionChannel.send({ content: `**الـوقـت الـمـتـبـقـي: ${timeInput}**` });
        const newAuction = new Auction({
            guildId: interaction.guild.id,
            channelId: auctionChannelId,
            messageId: auctionMessage.id,
            timeMessageId: timeMessage.id,
            item,
            ownerId: owner.id,
            startPrice: price,
            currentPrice: price,
            tax,
            endTime,
            active: true,
            paused: false,
            remainingTime: timeInMs
        });
        await newAuction.save();
        await interaction.reply({ content: `**تــم انــشــاء مــزاد لــ ${item} فــي <#${auctionChannelId}>**` });
        
        // وظيفة لتنظيف القناة وحذف جميع الرسائل
        const cleanChannel = async () => {
            try {
                console.log(`Starting to clean channel ${auctionChannelId}`);
                
                let deletedCount = 0;
                let hasMoreMessages = true;
                
                // حذف جميع الرسائل في القناة باستخدام حلقة
                while (hasMoreMessages) {
                    const messages = await auctionChannel.messages.fetch({ limit: 100 });
                    
                    if (messages.size === 0) {
                        hasMoreMessages = false;
                        break;
                    }
                    
                    // حذف جميع الرسائل بدون استثناء
                    const messagesToDelete = messages.filter(msg => msg.deletable);
                    
                    if (messagesToDelete.size > 0) {
                        if (messagesToDelete.size > 1) {
                            await auctionChannel.bulkDelete(messagesToDelete, true).catch(err => {
                                // إذا فشل الحذف الجماعي، نحذف واحدة تلو الأخرى
                                return Promise.all(
                                    messagesToDelete.map(msg => 
                                        msg.delete().catch(e => console.log(`Failed to delete message ${msg.id}: ${e.message}`))
                                    )
                                );
                            });
                        } else {
                            await Promise.all(
                                messagesToDelete.map(msg => 
                                    msg.delete().catch(e => console.log(`Failed to delete message ${msg.id}: ${e.message}`))
                                )
                            );
                        }
                        
                        deletedCount += messagesToDelete.size;
                        console.log(`Deleted ${messagesToDelete.size} messages, total: ${deletedCount}`);
                    }
                    
                    // إذا كان عدد الرسائل أقل من 100، فهذا يعني أننا وصلنا للنهاية
                    if (messages.size < 100) {
                        hasMoreMessages = false;
                    }
                    
                    // انتظار قليل بين كل دفعة لتجنب rate limits
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
                console.log(`Finished cleaning channel ${auctionChannelId}. Total messages deleted: ${deletedCount}`);
                
                // إرسال واجهة جديدة بعد التنظيف
                const embed = new EmbedBuilder()
                    .setImage(setup.line || null)
                    .setAuthor({ name: auctionChannel.guild.name, iconURL: auctionChannel.guild.iconURL() })
                    .setFooter({ text: "Dev By Hox Team", iconURL: auctionChannel.guild.iconURL({ dynamic: true }) })
                    .setDescription("**- لـطـلب مـزاد اضـغـط عـلـي زر شـراء مــزاد\n- لـروئــيــة الاســعــار اضــغـط عـلـي زر روئــيــة الاســعــار**");
                
                const rowEmbed = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("buyy_auction_ticket").setLabel("شـــراء مـــزاد").setEmoji("<a:hox_star_gray:1326824634397626478>").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("auctionprice").setLabel("روئــيــة الاســعــار").setEmoji("<a:hox_star_blue:1326824579389456394>").setStyle(ButtonStyle.Secondary)
                );
                
                await auctionChannel.send({ embeds: [embed], components: [rowEmbed] });
                
                if (setup.line) {
                    await auctionChannel.send({ files: [setup.line] });
                }
                
            } catch (error) {
                console.error("Error cleaning channel:", error);
            }
        };

        // وظيفة لإنهاء المزاد
        const endAuction = async (reason = "**انـتـهـى الـوقـت**", deletedBy = null) => {
            console.log(`Ending auction in channel ${auctionChannelId}. Reason: ${reason}`);
            
            // إيقاف العد التنازلي
            const auctionData = activeAuctions.get(auctionChannelId);
            if (auctionData?.interval) {
                clearInterval(auctionData.interval);
            }
            
            // تحديث حالة المزاد في قاعدة البيانات
            await Auction.updateOne(
                { guildId: interaction.guild.id, channelId: auctionChannelId, messageId: auctionMessage.id },
                { active: false, paused: false }
            );

            // إرسال رسالة الإيقاف
            let stopMessage;
            if (deletedBy) {
                stopMessage = await auctionChannel.send(`**تـم إيـقـاف الـمـزاد بـسـبـب حـذف رسـالـة الـمـزاد أو الـعـداد بـواسـطـة: ${deletedBy}**`);
            } else {
                stopMessage = await auctionChannel.send(`**تـم إيـقـاف الـمـزاد: ${reason}**`);
            }

            // الانتظار 5 ثواني ثم حذف رسالة الإيقاف وتنظيف القناة
            setTimeout(async () => {
                try {
                    // حذف رسالة الإيقاف
                    await stopMessage.delete().catch(() => {});
                    
                    // تنظيف القناة - حذف جميع الرسائل
                    await cleanChannel();
                } catch (error) {
                    console.error("Error in cleanup:", error);
                }
            }, 5000);
            
            // تنظيف البيانات المحلية
            if (auctionData?.stopListener) {
                auctionEvent.off('stop', auctionData.stopListener);
            }
            activeAuctions.delete(auctionChannelId);
        };

        // تعريف وظيفة العد التنازلي
        const startCountdown = () => {
            const countdownInterval = setInterval(async () => {
                try {
                    // التحقق من وجود رسالة المزاد ورسالة الوقت
                    let auctionMsgExists = true;
                    let timeMsgExists = true;
                    
                    try {
                        await auctionChannel.messages.fetch(auctionMessage.id);
                    } catch {
                        auctionMsgExists = false;
                    }
                    
                    try {
                        await auctionChannel.messages.fetch(timeMessage.id);
                    } catch {
                        timeMsgExists = false;
                    }
                    
                    // إذا تم حذف أي من الرسالتين، إنهاء المزاد
                    if (!auctionMsgExists || !timeMsgExists) {
                        console.log("Auction or time message was deleted, ending auction...");
                        
                        // محاولة معرفة من حذف الرسالة
                        let deletedBy = "غـيـر مـعـروف";
                        try {
                            // الحصول على سجل التدقيق
                            const auditLogs = await interaction.guild.fetchAuditLogs({
                                type: 72, // MESSAGE_DELETE
                                limit: 5
                            });
                            
                            const entry = auditLogs.entries.find(entry => 
                                entry.target.id === client.user.id && 
                                (entry.extra.channel.id === auctionChannelId)
                            );
                            
                            if (entry) {
                                deletedBy = `<@${entry.executor.id}>`;
                            }
                        } catch (error) {
                            console.error("Error fetching audit logs:", error);
                        }
                        
                        await endAuction("**تـم حـذف رسـالـة الـمـزاد أو رسـالـة الـوقـت**", deletedBy);
                        return;
                    }
                    
                    const auction = await Auction.findOne({
                        guildId: interaction.guild.id,
                        channelId: auctionChannelId,
                        messageId: auctionMessage.id
                    });
                   
                    if (!auction || !auction.active) {
                        clearInterval(countdownInterval);
                        return;
                    }

                    // التحقق إذا كان المزاد متوقف
                    if (auction.paused) {
                        return;
                    }
                   
                    const remaining = auction.endTime - Date.now();
                   
                    if (remaining <= 0) {
                        await endAuction("**انـتـهـى الـوقـت**");
                    } else {
                        const minutes = Math.floor(remaining / 60000);
                        const seconds = Math.floor((remaining / 1000) % 60);
                       
                        if (minutes === 1 && seconds <= 5) {
                            await auctionChannel.send("**تــبــقــي دقــيــقــة عــلــي انــتــهــاء الــمــزاد**");
                        }
                       
                        try {
                            await timeMessage.edit(`**الــوقــت الــمــتــبــقــي : ${minutes} دقــيــقــة و ${seconds} ثــانــيــة**`);
                        } catch (error) {
                            console.error("Error editing time message:", error);
                            // إذا فشل التعديل، قد تكون الرسالة محذوفة
                            if (error.code === 10008) {
                                let deletedBy = "غـيـر مـعـروف";
                                try {
                                    const auditLogs = await interaction.guild.fetchAuditLogs({
                                        type: 72,
                                        limit: 5
                                    });
                                    
                                    const entry = auditLogs.entries.find(entry => 
                                        entry.target.id === client.user.id && 
                                        (entry.extra.channel.id === auctionChannelId)
                                    );
                                    
                                    if (entry) {
                                        deletedBy = `<@${entry.executor.id}>`;
                                    }
                                } catch (err) {
                                    console.error("Error fetching audit logs:", err);
                                }
                                
                                await endAuction("**تـم حـذف رسـالـة الـوقـت**", deletedBy);
                            } else {
                                clearInterval(countdownInterval);
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error in countdown:", error);
                    clearInterval(countdownInterval);
                }
            }, 5000);
           
            return countdownInterval;
        };
        
        // بدء العد التنازلي
        const countdownInterval = startCountdown();
       
        // تخزين المعلومات عن المزاد النشط
        activeAuctions.set(auctionChannelId, {
            interval: countdownInterval,
            stopListener: async (data) => {
                if (data.auctionChannel.id !== auctionChannelId) return;
                await endAuction("**تـم إيـقـافـه بـواسـطـة الـمـسـؤول**", `<@${data.interaction.user.id}>`);
            }
        });
        
        // إضافة المستمع للحدث
        auctionEvent.on('stop', activeAuctions.get(auctionChannelId).stopListener);
    },
    async autocomplete(interaction) {
        try {
            const auctionss = await auctions.find({ guildId: interaction.guild.id }) || [];
            const focused = interaction.options.getFocused()?.toLowerCase() || "";
            const filtered = auctionss.filter(a => {
                const channel = interaction.guild.channels.cache.get(a.channelId);
                return channel && channel.name.toLowerCase().includes(focused);
            }).slice(0, 25).map(a => ({
                name: `#${interaction.guild.channels.cache.get(a.channelId)?.name || "???"}`,
                value: a.channelId
            }));
            await interaction.respond(filtered);
        } catch (err) {
            await interaction.respond([]);
        }
    }
};
// تصدير auctionEvent لاستخدامه في الأوامر الأخرى
module.exports.auctionEvent = auctionEvent;