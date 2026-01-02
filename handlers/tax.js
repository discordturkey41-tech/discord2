const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const cron = require('node-cron');
const Shop = require("../Mangodb/shop.js");
const Setup = require("../Mangodb/setup.js");
const Types = require("../Mangodb/types.js");

// تخزين المتاجر التي تم إرسال إشعار لها
const notifiedShops = new Set();

async function sendTaxNotifications(client) {
    try {
        const allSetups = await Setup.find({ taxTime: { $exists: true, $ne: null } });

        for (const setupData of allSetups) {
            const guild = client.guilds.cache.get(setupData.guildId);
            if (!guild) continue;

            const now = new Date();
            const lastTaxDate = setupData.lastTaxDate ? new Date(setupData.lastTaxDate) : new Date(0);
            const nextTaxDate = new Date(lastTaxDate.getTime() + setupData.taxTime);

            if (now >= nextTaxDate) {
                const shops = await Shop.find({ guildId: setupData.guildId });

                for (const shop of shops) {
                    const shopKey = `${shop.channelId}`;
                    if (notifiedShops.has(shopKey)) continue;

                    const channel = await client.channels.fetch(shop.channelId).catch(() => null);
                    if (!channel) continue;

                    const type = await Types.findOne({ guildId: setupData.guildId, name: shop.type });
                    if (!type) continue;

                    const price = type.tax || 0;

                    await Shop.updateOne(
                        { guildId: setupData.guildId, channelId: shop.channelId },
                        { $set: { taxPaid: "no" } }
                    );

                    const taxEmbed = new EmbedBuilder()
                        .setTitle(`تفاصيل الضريبة`)
                        .setImage(setupData.line || null)
                        .addFields(
                            { name: "السعر", value: `${price}`, inline: true },
                            { name: "المتجر", value: `<#${shop.channelId}>`, inline: true },
                            { name: "حالة الدفع", value: "❌ غير مدفوعة", inline: true }
                        )
                        .setFooter({
                            text: "Dev By Hox Devs",
                            iconURL: channel.guild.iconURL({ dynamic: true })
                        });

                    const taxRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`pay_tax_${shop.channelId}`)
                                .setLabel("دفع الضريبة")
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji("💰")
                        );

                    await channel.send({
                        content: `<@${shop.ownerId}>`,
                        embeds: [taxEmbed],
                        components: [taxRow]
                    }).catch(() => {});

                    notifiedShops.add(shopKey);
                }

                await Setup.updateOne(
                    { guildId: setupData.guildId },
                    { $set: { lastTaxDate: now } }
                );
            }
        }
    } catch (error) {
        console.error(error);
    }
}

async function checkLatePayments(client) {
    try {
        const allSetups = await Setup.find({ taxTime: { $exists: true, $ne: null } });

        for (const setupData of allSetups) {
            const guild = client.guilds.cache.get(setupData.guildId);
            if (!guild) continue;

            const shops = await Shop.find({ guildId: setupData.guildId, taxPaid: "no" });
            const now = new Date();

            for (const shop of shops) {
                const lastPayment = shop.lastTaxPayment ? new Date(shop.lastTaxPayment) : new Date(shop.createdAt || now);
                const nextPaymentDue = new Date(lastPayment.getTime() + setupData.taxTime);
                const daysLate = Math.floor((now - nextPaymentDue) / (1000 * 60 * 60 * 24));

                const notificationKey = `${shop.channelId}_${daysLate}`;
                if (notifiedShops.has(notificationKey)) continue;

                if (daysLate === 1) {
                    const channel = await client.channels.fetch(shop.channelId).catch(() => null);
                    if (!channel) continue;

                    await channel.send({
                        content: `<@${shop.ownerId}> **تأخرت في دفع الضريبة لمدة يوم**`
                    }).catch(() => {});

                    notifiedShops.add(notificationKey);
                } else if (daysLate >= 3) {
                    if (shop.status === "0") continue;

                    const channel = await client.channels.fetch(shop.channelId).catch(() => null);
                    if (!channel) continue;

                    await channel.permissionOverwrites.edit(channel.guild.id, { ViewChannel: false }).catch(() => {});

                    await Shop.updateOne(
                        { guildId: shop.guildId, channelId: shop.channelId },
                        { $set: { status: "0", taxPaid: "no" } }
                    );

                    await channel.send({
                        content: `<@${shop.ownerId}> **تم تعطيل المتجر بسبب تأخر دفع الضريبة لمدة ${daysLate} أيام**`
                    }).catch(() => {});

                    notifiedShops.add(notificationKey);

                    if (setupData.logs) {
                        const logChannel = await client.channels.fetch(setupData.logs).catch(() => null);
                        if (logChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setTitle("تعطيل متجر بسبب تأخر الضريبة")
                                .addFields(
                                    { name: "المتجر", value: `<#${shop.channelId}>`, inline: true },
                                    { name: "صاحب المتجر", value: `<@${shop.ownerId}>`, inline: true },
                                    { name: "أيام التأخير", value: `${daysLate}`, inline: true }
                                )
                                .setTimestamp();

                            await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
                        }
                    }
                }
            }
        }

        cleanupNotifiedShops();
    } catch (error) {
        console.error(error);
    }
}

function cleanupNotifiedShops() {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    for (const key of notifiedShops) {
        // إذا مفتاح notification يحتوي على أيام التأخير، احسب الفرق
        const parts = key.split("_");
        if (parts.length === 2) {
            const daysLate = parseInt(parts[1], 10);
            if (!isNaN(daysLate) && daysLate >= 1) {
                notifiedShops.delete(key);
            }
        }
    }
}

function scheduleTaxChecks(client) {
    sendTaxNotifications(client);
    checkLatePayments(client);

    cron.schedule('*/5 * * * *', () => {
        sendTaxNotifications(client);
    });

    cron.schedule('0 * * * *', () => {
        checkLatePayments(client);
    });
}

module.exports = {
    scheduleTaxChecks,
    sendTaxNotifications,
    checkLatePayments
};
