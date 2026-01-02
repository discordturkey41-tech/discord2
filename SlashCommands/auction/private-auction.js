const { ApplicationCommandOptionType, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const Auction = require('../../Mangodb/auction.js');
const Setup = require('../../Mangodb/setup.js');

module.exports = {
    name: "private-auction",
    description: "إنــشــاء مــزاد خــاص",
    dm_permission: false,
    options: [
        {
            name: "category",
            description: "الــكــتــاغــوري الــذي ســيــتــم إنــشــاء الــروم فــيــهــا",
            type: ApplicationCommandOptionType.Channel,
            channel_types: [ChannelType.GuildCategory],
            required: true
        },
        {
            name: "room-name",
            description: "اســم روم الــمــزاد",
            type: ApplicationCommandOptionType.String,
            required: true
        },
        {
            name: "item",
            description: "الـــســـلـــعـــه",
            type: ApplicationCommandOptionType.String,
            required: true
        },
        {
            name: "owner",
            description: "صـــاحـــب الـــســـلـــعـــه",
            type: ApplicationCommandOptionType.User,
            required: true
        },
        {
            name: "everyone-mention",
            description: "عــدد مــنــشــنــات ايــفــري ون خــلال الــمــزاد",
            type: ApplicationCommandOptionType.Integer,
            required: true,
            min_value: 0
        },
        {
            name: "here-mention",
            description: "عــدد مــنــشــنــات الــهــيــر خــلال الــمــزاد",
            type: ApplicationCommandOptionType.Integer,
            required: true,
            min_value: 0
        },
        {
            name: "auction-mention",
            description: "عــدد مــنــشــنــات الــمــزاد خــلال الــمــزاد",
            type: ApplicationCommandOptionType.Integer,
            required: true,
            min_value: 0
        },
        {
            name: "time",
            description: "مــدة المــزاد (مثال: 5h, 30m, 2d)",
            type: ApplicationCommandOptionType.String,
            required: true
        },
        {
            name: "price",
            description: "الـــســـعـــر الـــبـــدائـــي",
            type: ApplicationCommandOptionType.String,
            required: true
        },
        {
            name: "tax",
            description: "الــســعــر بالــضــريــبــة؟",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                { name: "نعم بضريبه", value: "هــذا الــمــزاد ســيــكــون بــالــضــريــبــه" },
                { name: "لا بدون ضريبة", value: "هــذا الــمــزاد لــن يــكــون بــالــضــريــبــه" }
            ]
        },
        {
            name: "photo",
            description: "صـــوره الـــســـلـــعـــه",
            type: ApplicationCommandOptionType.Attachment,
            required: true
        },
        {
            name: "photo2",
            description: "صـــوره ثـــانـــيـــه لـــلـــســـلـــعـــه",
            type: ApplicationCommandOptionType.Attachment,
            required: false
        },
        {
            name: "photo3",
            description: "صـــوره ثـــالـــثـــه الـــســـلـــعـــه",
            type: ApplicationCommandOptionType.Attachment,
            required: false
        },
        {
            name: "photo4",
            description: "صـــوره رابــعــه الـــســـلـــعـــه",
            type: ApplicationCommandOptionType.Attachment,
            required: false
        }
    ],

    async execute(client, interaction) {
        // جلب إعدادات السيرفر
        const setup = await Setup.findOne({ guildId: interaction.guild.id });
        if (!setup?.auctionAdmin) {
            return interaction.reply(
                `**الــرجــاء تــحــديــد مــســؤول مــزاد مــن امــر \n/setup**`
            );
        }

        if (!interaction.member.roles.cache.has(setup.auctionAdmin)) {
            return interaction.reply(
                `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هـذا الأمـر تـحـتـاج رتـبـه <@&${setup.auctionAdmin}>**`
            );
        }

        const category = interaction.options.getChannel("category");
        const roomName = interaction.options.getString("room-name");
        const item = interaction.options.getString("item");
        const owner = interaction.options.getUser("owner");
        const everyoneMentions = interaction.options.getInteger("everyone-mention");
        const hereMentions = interaction.options.getInteger("here-mention");
        const auctionMentions = interaction.options.getInteger("auction-mention");
        const timeInput = interaction.options.getString("time");
        const price = interaction.options.getString("price");
        const tax = interaction.options.getString("tax");
        const mainPhoto = interaction.options.getAttachment("photo");

        // جمع الصور الإضافية
        const additionalPhotos = [];
        for (let i = 2; i <= 4; i++) {
            const photo = interaction.options.getAttachment(`photo${i}`);
            if (photo) additionalPhotos.push(photo);
        }

        // تحقق من وجود مزاد نشط لنفس السلعة
        const existingAuction = await Auction.findOne({ 
            guildId: interaction.guild.id,
            item: item,
            active: true
        });

        if (existingAuction) {
            return interaction.reply(`**يــوجــد مــزاد نــشــط لــهــذه الــســلــعــة**`);
        }

        // تحويل الوقت إلى ميلي ثانية
        const timeRegex = /^(\d+)([mhd])$/;
        const match = timeInput.match(timeRegex);
        
        if (!match) {
            return interaction.reply("**صيغة الوقت غير صحيحة. استخدم مثلاً: 5h, 30m, 2d**");
        }

        const value = parseInt(match[1]);
        const unit = match[2];
        let durationMs, timeText;

        switch(unit) {
            case 'm': // دقائق
                durationMs = value * 60 * 1000;
                timeText = `${value} دقـيـقـة`;
                break;
            case 'h': // ساعات
                durationMs = value * 60 * 60 * 1000;
                timeText = `${value} سـاعـة`;
                break;
            case 'd': // أيام
                durationMs = value * 24 * 60 * 60 * 1000;
                timeText = `${value} يـوم`;
                break;
            default:
                return interaction.reply("**صيغة الوقت غير صحيحة. استخدم مثلاً: 5h, 30m, 2d**");
        }

        // إنشاء روم المزاد
        const auctionChannel = await interaction.guild.channels.create({
            name: roomName,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionFlagsBits.SendMessages],
                    allow: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: owner.id,
                    allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
                },
                {
                    id: setup.auctionAdmin,
                    allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels]
                }
            ]
        });

        // تحديد نوع المنشن الأولي
        let initialMention = "";
        if (everyoneMentions > 0) {
            initialMention = "@everyone";
        } else if (hereMentions > 0) {
            initialMention = "@here";
        } else if (auctionMentions > 0 && setup.auctionMention) {
            initialMention = `<@&${setup.auctionMention}>`;
        }

        // إنشاء محتوى المزاد
        const auctionContent = `**\`﹣\` <a:hox_star_blue:1326824579389456394> صـاحـب الـسـلـعـة: ${owner}\n\`﹣\` <a:hox_star_light:1326824621722435655> الـسـلـعـة: ${item}\n\`﹣\` <a:hox_star_orange:1326824692648116407> سـعـر الـبـدايـة: ${price}\n\`﹣\` <a:hox_star_pink:1326824571130613771> الـسـعـر بـالـضـريـبـة؟: ${tax}\n\`﹣\` <a:hox_star_yellow:1326824705423835190> الـمـنـشـن : ${initialMention}**`;

        // إنشاء الأزرار
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("stop_auction")
                .setLabel("تــوقــيــف الــمــزاد")
                .setEmoji("<a:003:1326822406316097568>")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("start_auction")
                .setLabel("اعــادة تــشــغــيــل الــمــزاد")
                .setEmoji("<a:005:1326822412607684618>")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setLabel("صــاحــب الــمــزاد")
                .setEmoji("<a:009:1326822419482284123>")
                .setStyle(ButtonStyle.Link)
                .setURL(`https://discord.com/users/${owner.id}`),
            new ButtonBuilder()
                .setCustomId("send_mention")
                .setLabel("إرســال مــنــشــن")
                .setEmoji("📢")
                .setStyle(ButtonStyle.Primary)
        );

        // إرسال المزاد
        const auctionMessage = await auctionChannel.send({
            content: auctionContent,
            files: [mainPhoto, ...additionalPhotos],
            components: [row]
        });

        // إرسال رسالة الوقت
        const timeMessage = await auctionChannel.send({
            content: `**\`﹣\` <a:hox_star_gray:1326824634397626478> وقـت الـمـزاد: ${timeText}**`
        });

        // إرسال صورة الخط
        if (setup.line) {
            await auctionChannel.send({ files: [setup.line] });
        }

        // حفظ بيانات المزاد في الداتا بيز
        const newAuction = new Auction({
            guildId: interaction.guild.id,
            channelId: auctionChannel.id,
            messageId: auctionMessage.id,
            timeMessageId: timeMessage.id,
            item: item,
            ownerId: owner.id,
            startPrice: price,
            currentPrice: price,
            tax: tax,
            endTime: Date.now() + durationMs,
            active: true,
            everyoneMentions: everyoneMentions,
            hereMentions: hereMentions,
            auctionMentions: auctionMentions,
            lastEveryoneMention: 0,
            lastHereMention: 0,
            lastAuctionMention: 0,
            lastMentionTime: 0,
            remainingTime: Math.floor(durationMs / 1000)
        });
        await newAuction.save();

        // إرسال رسالة التأكيد
        await interaction.reply({
            content: `**تــم انــشــاء مــزاد خــاص لــ ${item} فــي <#${auctionChannel.id}>**`
        });

        // بدء مؤقت المزاد
        const endTime = Date.now() + durationMs;
        let lastUpdateTime = Date.now();
        
        const updateInterval = setInterval(async () => {
            try {
                const remainingMs = endTime - Date.now();
                if (remainingMs <= 0) {
                    clearInterval(updateInterval);
                    
                    // تحديث حالة المزاد
                    newAuction.active = false;
                    await newAuction.save();

                    // حذف الأزرار من رسالة المزاد
                    await auctionMessage.edit({
                        components: []
                    });

                    // حذف رسالة الوقت
                    try {
                        await timeMessage.delete();
                    } catch (error) {
                        console.error("Failed to delete time message:", error);
                    }

                    // إرسال رسالة انتهاء المزاد
                    await auctionChannel.send({
                        content: `**تـم انـتـهـاء مـزاد ${newAuction.item}\nالـرجـاء الـتـواصـل مـع: <@${newAuction.ownerId}>**`
                    });

                    // إرسال صورة الخط
                    if (setup.line) {
                        await auctionChannel.send({ files: [setup.line] });
                    }

                    // الانتظار 10 ثواني ثم مسح الروم
                    setTimeout(async () => {
                        try {
                            await auctionChannel.delete();
                        } catch (error) {
                            console.error("Error deleting auction channel:", error);
                        }
                    }, 10000);
                    
                    return;
                }

                // تحديث الوقت كل 30 دقيقة فقط
                const now = Date.now();
                if (now - lastUpdateTime >= 30 * 60 * 1000) {
                    lastUpdateTime = now;
                    
                    // تحديث الوقت المتبقي
                    const seconds = Math.floor(remainingMs / 1000);
                    const minutes = Math.floor(seconds / 60);
                    const hours = Math.floor(minutes / 60);
                    const days = Math.floor(hours / 24);

                    let remainingText;
                    if (days > 0) {
                        remainingText = `${days} يـوم و ${hours % 24} سـاعـة`;
                    } else if (hours > 0) {
                        remainingText = `${hours} سـاعـة و ${minutes % 60} دقـيـقـة`;
                    } else if (minutes > 0) {
                        remainingText = `${minutes} دقـيـقـة و ${seconds % 60} ثـانـيـة`;
                    } else {
                        remainingText = `${seconds} ثـانـيـة`;
                    }

                    await timeMessage.edit({
                        content: `**\`﹣\` <a:hox_star_gray:1326824634397626478> وقـت الـمـزاد: ${remainingText}**`
                    });

                    // تحديث الوقت المتبقي في الداتا بيز
                    newAuction.remainingTime = Math.floor(remainingMs / 1000);
                    await newAuction.save();
                }
            } catch (error) {
                console.error("Error updating time:", error);
                clearInterval(updateInterval);
            }
        }, 5000); // التحقق كل 5 ثواني
    }
};