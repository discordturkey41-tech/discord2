const { ApplicationCommandOptionType, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const Auction = require('../../Mangodb/auction.js');
const Setup = require('../../Mangodb/setup.js');

const auctions = require('../../Mangodb/auctions-channels.js')

// تخزين المؤقتات النشطة
const activeAuctions = new Map();

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(client, interaction) {
    
    // زر إيقاف المزاد
// زر إيقاف المزاد
if (interaction.customId === "stop_auction") {
    const setup = await Setup.findOne({ guildId: interaction.guild.id });
    if (!setup?.auctionAdmin || !interaction.member.roles.cache.has(setup.auctionAdmin)) {
        return interaction.reply({
            content: "**❌ | لـيـس لـديـك صـلاحـيـة لـتـوقـيـف الـمـزاد**",
            ephemeral: true
        });
    }

    // البحث عن المزاد النشط في هذه القناة
    const auction = await Auction.findOne({
        guildId: interaction.guild.id,
        channelId: interaction.channel.id,
        active: true
    });

    if (!auction) {
        return interaction.reply({
            content: "**❌ | لا يـوجـد مـزاد نـشـط فـي هـذه الـقـنـاة**",
            ephemeral: true
        });
    }

    // حساب الوقت المتبقي بالضبط
    const remainingTime = auction.endTime - Date.now();

    // إيقاف العد التنازلي
    const auctionData = activeAuctions.get(interaction.channel.id);
    if (auctionData?.interval) {
        clearInterval(auctionData.interval);
        activeAuctions.delete(interaction.channel.id);
    }

    // تحديث حالة المزاد في قاعدة البيانات مع الوقت المتبقي بالضبط
    await Auction.updateOne(
        { _id: auction._id },
        { 
            $set: { 
                paused: true,
                remainingTime: remainingTime // حفظ الوقت المتبقي بالضبط
            } 
        }
    );

    // الحصول على الوقت المتبقي لعرضه
    const minutes = Math.floor(remainingTime / 60000);
    const seconds = Math.floor((remainingTime / 1000) % 60);

    await interaction.reply({
        content: `**✅ | تـم تـوقـيـف الـمـزاد بـنـجـاح بـواسـطـة ${interaction.user}**`
    });
}

    // زر استكمال المزاد
// زر استكمال المزاد
if (interaction.customId === "start_auction") {
    const setup = await Setup.findOne({ guildId: interaction.guild.id });
    if (!setup?.auctionAdmin || !interaction.member.roles.cache.has(setup.auctionAdmin)) {
        return interaction.reply({
            content: "**❌ | لـيـس لـديـك صـلاحـيـة لـاسـتـكـمـال الـمـزاد**",
            ephemeral: true
        });
    }

    // البحث عن المزاد الموقوف في هذه القناة
    const auction = await Auction.findOne({
        guildId: interaction.guild.id,
        channelId: interaction.channel.id,
        active: true,
        paused: true
    });

    if (!auction) {
        return interaction.reply({
            content: "**❌ | لا يـوجـد مـزاد مـوقـوف فـي هـذه الـقـنـاة**",
            ephemeral: true
        });
    }

    // استخدام الوقت المتبقي المحفوظ بالضبط
    const remainingTime = auction.remainingTime;
    if (!remainingTime || remainingTime <= 0) {
        return interaction.reply({
            content: "**❌ | لـم يـتـبـقـى وقـت لـاسـتـكـمـال الـمـزاد**",
            ephemeral: true
        });
    }

    // حساب وقت الانتهاء الجديد بناءً على الوقت المتبقي
    const newEndTime = Date.now() + remainingTime;

    // تحديث وقت الانتهاء وحالة الإيقاف
    await Auction.updateOne(
        { _id: auction._id },
        { 
            $set: { 
                paused: false,
                endTime: newEndTime,
                remainingTime: remainingTime // نحتفظ بنفس القيمة
            } 
        }
    );

    // إعادة تشغيل العد التنازلي
    const timeMessage = await interaction.channel.messages.fetch(auction.timeMessageId).catch(() => null);
    if (timeMessage) {
        // إيقاف أي مؤقت قديم إن وجد
        const oldInterval = activeAuctions.get(interaction.channel.id);
        if (oldInterval?.interval) {
            clearInterval(oldInterval.interval);
        }

        const countdownInterval = setInterval(async () => {
            const currentAuction = await Auction.findOne({ _id: auction._id });
            if (!currentAuction || !currentAuction.active || currentAuction.paused) {
                clearInterval(countdownInterval);
                activeAuctions.delete(interaction.channel.id);
                return;
            }

            const remaining = currentAuction.endTime - Date.now();
            
            if (remaining <= 0) {
                clearInterval(countdownInterval);
                activeAuctions.delete(interaction.channel.id);
                // إنهاء المزاد
                await endAuctionFunction(currentAuction, interaction.channel, setup);
            } else {
                // تحديث رسالة الوقت مع الثواني بالضبط
                const minutes = Math.floor(remaining / 60000);
                const seconds = Math.floor((remaining / 1000) % 60);
                
                try {
                    await timeMessage.edit(`**الــوقــت الــمــتــبــقــي : ${minutes} دقــيــقــة و ${seconds} ثــانــيــة**`);
                    
                    // تحديث الوقت المتبقي في قاعدة البيانات
                    await Auction.updateOne(
                        { _id: currentAuction._id },
                        { $set: { remainingTime: remaining } }
                    );
                } catch (error) {
                    console.error("Error editing time message:", error);
                    if (error.code === 10008) { // Unknown Message
                        clearInterval(countdownInterval);
                        activeAuctions.delete(interaction.channel.id);
                    }
                }
            }
        }, 1000); // تحديث كل ثانية للحصول على دقة أفضل

        activeAuctions.set(interaction.channel.id, { 
            interval: countdownInterval,
            auctionId: auction._id 
        });
    }

    await interaction.reply({
        content: `**✅ | تـم اسـتـكـمـال الـمـزاد بـنـجـاح بـواسـطـة ${interaction.user}**`
    });
}

    // زر حذف المزاد
    if (interaction.customId === "remove_auction") {
        const setup = await Setup.findOne({ guildId: interaction.guild.id });
        if (!setup?.auctionAdmin || !interaction.member.roles.cache.has(setup.auctionAdmin)) {
            return interaction.reply({
                content: "**❌ | لـيـس لـديـك صـلاحـيـة لـحـذف الـمـزاد**",
                ephemeral: true
            });
        }

        // البحث عن المزاد في هذه القناة
        const auction = await Auction.findOne({
            guildId: interaction.guild.id,
            channelId: interaction.channel.id,
            active: true
        });

        if (!auction) {
            return interaction.reply({
                content: "**❌ | لا يـوجـد مـزاد نـشـط فـي هـذه الـقـنـاة**",
                ephemeral: true
            });
        }

        // إيقاف العد التنازلي
        const auctionData = activeAuctions.get(interaction.channel.id);
        if (auctionData?.interval) {
            clearInterval(auctionData.interval);
            activeAuctions.delete(interaction.channel.id);
        }

        // حذف المزاد من قاعدة البيانات
        await Auction.deleteOne({ _id: auction._id });

        // تنظيف القناة
        try {
            let fetched;
            do {
                fetched = await interaction.channel.messages.fetch({ limit: 100 });
                if (fetched.size > 0) {
                    await interaction.channel.bulkDelete(fetched, true).catch(() => {});
                }
            } while (fetched.size > 0);

            const embed = new EmbedBuilder()
                .setImage(setup.line || null)
                .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                .setFooter({ text: "Dev By Hox Team", iconURL: interaction.guild.iconURL({ dynamic: true }) })
                .setDescription("**- لـطـلب مـزاد اضـغـط عـلـي زر شـراء مــزاد\n- لـروئــيــة الاســعــار اضــغـط عـلـي زر روئــيــة الاســعــار**");

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("buyy_auction_ticket").setLabel("شـــراء مـــزاد").setEmoji("<a:hox_star_gray:1326824634397626478>").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("auctionprice").setLabel("روئــيــة الاســعــار").setEmoji("<a:hox_star_blue:1326824579389456394>").setStyle(ButtonStyle.Secondary)
            );

            await interaction.channel.send({ embeds: [embed], components: [row] });

            if (setup.line) {
                await interaction.channel.send({ files: [setup.line] });
            }
        } catch (error) {
            console.error("Error cleaning channel:", error);
        }

        await interaction.reply({
            content: `**✅ | تـم حـذف الـمـزاد بـنـجـاح بـواسـطـة ${interaction.user}**`
        });
    }

    // دالة مساعدة لإنهاء المزاد
// دالة مساعدة لإنهاء المزاد
async function endAuctionFunction(auction, channel, setup) {
    try {
        // تنظيف المؤقت
        const auctionData = activeAuctions.get(channel.id);
        if (auctionData?.interval) {
            clearInterval(auctionData.interval);
            activeAuctions.delete(channel.id);
        }

        await channel.send("**انــتــهــى وقــت الــمــزاد**");

        await Auction.updateOne(
            { _id: auction._id },
            { $set: { active: false, paused: false, remainingTime: 0 } }
        );

        await channel.send({ content: `**تـم انـتـهـاء المـزاد\nالـرجـاء الـتـواصـل مـع: <@${auction.ownerId}>**` });

        if (setup.line) {
            await channel.send({ files: [setup.line] });
        }

        setTimeout(async () => {
            try {
                let fetched;
                do {
                    fetched = await channel.messages.fetch({ limit: 100 });
                    if (fetched.size > 0) {
                        await channel.bulkDelete(fetched, true).catch(() => {});
                    }
                } while (fetched.size > 0);

                const embed = new EmbedBuilder()
                    .setImage(setup.line || null)
                    .setAuthor({ name: channel.guild.name, iconURL: channel.guild.iconURL() })
                    .setFooter({ text: "Dev By Hox Team", iconURL: channel.guild.iconURL({ dynamic: true }) })
                    .setDescription("**- لـطـلب مـزاد اضـغـط عـلـي زر شـراء مــزاد\n- لـروئــيــة الاســعــار اضــغـط عـلـي زر روئــيــة الاســعــار**");

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("buyy_auction_ticket").setLabel("شـــراء مـــزاد").setEmoji("<a:hox_star_gray:1326824634397626478>").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("auctionprice").setLabel("روئــيــة الاســعــار").setEmoji("<a:hox_star_blue:1326824579389456394>").setStyle(ButtonStyle.Secondary)
                );

                await channel.send({ embeds: [embed], components: [row] });
            } catch (err) {
                console.error("Error in auction cleanup:", err);
            }
        }, 7000);

        await Auction.deleteOne({ _id: auction._id });
    } catch (error) {
        console.error("Error ending auction:", error);
    }
}

  }
};