const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Shop = require('../../Mangodb/shop.js');

module.exports = {
    name: "interactionCreate",
    once: false,
    async execute(client, interaction) {
        if (!interaction.isButton() && !interaction.isModalSubmit()) return;
        if (!interaction.guild) return;
        const guildId = interaction.guild.id;

        // زر الخدمة
        if (interaction.isButton() && interaction.customId === "servic_shop") {
            await handleServiceShop(interaction);
        }

        // معالجة زر تفعيل/تعطيل الإرسال التلقائي
        if (interaction.isButton() && interaction.customId === "toggle_auto_send") {
            await handleToggleAutoSend(interaction);
        }
    },
};

async function handleServiceShop(interaction) {
    // جلب بيانات المتجر
    const shop = await Shop.findOne({ channelId: interaction.channel.id });
    const owner = shop.ownerId;
    const partners = shop.partners;

    if (interaction.user.id !== owner && (!partners || !partners.includes(interaction.user.id))) {
        return interaction.reply({
            content: '**يـفـقـيـر مـعـنـدكـش مـتـجـر روح اشـتـري**',
            ephemeral: true
        });
    }

    const { embed, row, row2, row3 } = createShopEmbed(interaction, shop);
    
    await interaction.reply({
        embeds: [embed],
        components: [row, row2, row3],
        ephemeral: true
    });
}

async function handleToggleAutoSend(interaction) {
    const shop = await Shop.findOne({ channelId: interaction.channel.id });
    const owner = shop.ownerId;
    const partners = shop.partners;

    if (interaction.user.id !== owner && (!partners || !partners.includes(interaction.user.id))) {
        return interaction.reply({
            content: '**يـفـقـيـر مـعـنـدكـش مـتـجـر روح اشـتـري**',
            ephemeral: true
        });
    }
    
    if (!shop) {
        return interaction.reply({
            content: "❌ لم يتم العثور على المتجر",
            ephemeral: true
        });
    }

    const newStatus = shop.statusSend === "active" ? "disabled" : "active";
    shop.statusSend = newStatus;
    await shop.save();

    // تحديث الـ embed
    const { embed, row, row2, row3 } = createShopEmbed(interaction, shop);
    
    await interaction.update({
        embeds: [embed],
        components: [row, row2, row3]
    });
}

function createShopEmbed(interaction, shop) {
    const embed = new EmbedBuilder()
        .setTitle("خــدمــات الــمــتــجــر")
        .setDescription("**<a:009:1326822419482284123> اضــغــط عــلــي الــخــدمــة الــتــي تــريــد شــرائــهــا <a:010:1326822357071040523>**")
        .setAuthor({
            name: interaction.guild.name,
            iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setFooter({
            text: "Dev By Hox Devs",
            iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 1024 }));

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("name_buy")
            .setLabel("تــغــيــيــر اســم الــمــتــجــر")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("<a:hox_star_gray:1326824634397626478>"),
        new ButtonBuilder()
            .setCustomId("remove_warnings")
            .setLabel("إزالــة الــتــحــذيــرات")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("<a:hox_star_light:1326824621722435655> "),
        new ButtonBuilder()
            .setCustomId("owner_buy")
            .setLabel("تــغــيــر صــاحــب الــمــتــجــر")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("<a:hox_star_blue:1326824579389456394>"),
        new ButtonBuilder()
            .setCustomId("change-type")
            .setLabel("تــغــيــر نــوع الــمــتــجــر")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("<a:hox_dark_star:1414636210424381460>"),
        new ButtonBuilder()
            .setCustomId("change-shape")
            .setLabel("تــغــيــيــر شــكــل الــمــتــجــر")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("<a:hox_star_yellow:1326824705423835190>"),
    );

    // صف جديد للأزرار الإضافية
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("request_vacation")
            .setLabel("طــلــب اجــازة لــمــتــجــر")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("<a:hox_star_pink:1326824571130613771>"),

        new ButtonBuilder()
            .setCustomId("1mentions-buy")
            .setLabel("شــراء مــنــشــنــات لــمــتــجــر")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("<a:hox_star_orange:1326824692648116407>"),
        new ButtonBuilder()
            .setCustomId("partners-manage")
            .setLabel("إدارة الــشــركــاء")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("<a:how_white_star:1414640440493474047>"),

        new ButtonBuilder()
            .setCustomId("auto-publish-manage")
            .setLabel("الــنــشــر الــتــلــقــائــي")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("<a:hox_star_purble:1326824672817319969>")
    );

    // تحديث نص الزر بناءً على حالة statusSend
    const isAutoSendActive = shop && shop.statusSend === "active";
    
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("delete-shop-btn")
            .setLabel("حــذف الــمــتــجــر")
            .setEmoji("<a:no:1405131885146800148>")
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId("sell-shop-btn")
            .setLabel("بــيــع الــمــتــجــر")
            .setEmoji("<a:no:1405131885146800148>")
            .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
            .setCustomId("activate_shop")
            .setLabel("تــفــعــيــل الــمــتــجــر")
            .setStyle(ButtonStyle.Success)
            .setEmoji("<a:yes:1405131777948909599>"),

        new ButtonBuilder()
            .setCustomId("toggle_auto_send")
            .setLabel(isAutoSendActive ? "تـعـطـيـل الارسـال الـتـلـقـائـي لـ جـمـيـع مـتـاجـرك" : "تــفــعــيــل الارسـال الـتـلـقـائـي لـ جـمـيـع مـتـاجـرك")
            .setStyle(isAutoSendActive ? ButtonStyle.Danger : ButtonStyle.Success)
            .setEmoji(isAutoSendActive ? "<a:no:1405131885146800148>" : "<a:yes:1405131777948909599>")
    );

    return { embed, row, row2, row3 };
}