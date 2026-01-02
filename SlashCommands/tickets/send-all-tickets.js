const { 
    ApplicationCommandOptionType, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    ContainerBuilder, 
    TextDisplayBuilder, 
    SeparatorBuilder, 
    SeparatorSpacingSize, 
    MessageFlags,
    MediaGalleryItemBuilder
} = require("discord.js");
const Setup = require("../../Mangodb/setup.js");
const SetupPhoto = require("../../Mangodb/setupPhoto.js");

module.exports = {
    name: "send-all-tickets",
    description: "ارســال جــمــيــع التــكــتــات فــي روم واحــد",
    options: [
        {
            name: "channel",
            description: "الــروم الــذي ســوف يــتــم ارســال فــيــهــا التــكــتــات",
            type: ApplicationCommandOptionType.Channel,
            channel_types: [ChannelType.GuildText],
            required: false
        },
        {
            name: "auction-button",
            description: "حــالــة زر الــمــزادات",
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
                { name: "إضــافــة", value: "add" },
                { name: "إزالــة", value: "remove" }
            ]
        },
        {
            name: "order-button",
            description: "حــالــة زر الــطــلــبــات",
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
                { name: "إضــافــة", value: "add" },
                { name: "إزالــة", value: "remove" }
            ]
        },
        {
            name: "role-button",
            description: "حــالــة زر الــرتــب",
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
                { name: "إضــافــة", value: "add" },
                { name: "إزالــة", value: "remove" }
            ]
        },
        {
            name: "shop-button",
            description: "حــالــة زر الــمــتــاجــر",
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
                { name: "إضــافــة", value: "add" },
                { name: "إزالــة", value: "remove" }
            ]
        }
    ],

    async execute(client, interaction) {
        const channel = interaction.options.getChannel("channel") || interaction.channel;
        const setupData = await Setup.findOne({ guildId: interaction.guild.id });
        const setupPhoto = await SetupPhoto.findOne({ guildId: interaction.guild.id });

        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({
                content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج صـلاحـيــة Administrator**`,
                ephemeral: true,
            });
        }

        const auctionButton = interaction.options.getString("auction-button") || "add";
        const orderButton = interaction.options.getString("order-button") || "add";
        const roleButton = interaction.options.getString("role-button") || "add";
        const shopButton = interaction.options.getString("shop-button") || "add";

        const buyButtons = [];
        const priceButtons = [];

        if (auctionButton === "add") {
            buyButtons.push(
                new ButtonBuilder()
                    .setCustomId("buyy_auction_ticket")
                    .setLabel("شــراء مــزاد")
                    .setEmoji("<a:hox_star_gray:1326824634397626478>")
                    .setStyle(ButtonStyle.Secondary)
            );
            priceButtons.push(
                new ButtonBuilder()
                    .setCustomId("auctionss-pricee")
                    .setLabel("أسـعـار الـمـزادات")
                    .setEmoji("<a:hox_money:1416511233141637252>")
                    .setStyle(ButtonStyle.Primary)
            );
        }

        if (orderButton === "add") {
            buyButtons.push(
                new ButtonBuilder()
                    .setCustomId("buyy_order_ticket")
                    .setLabel("شــراء طــلــب")
                    .setEmoji("<a:hox_star_gray:1326824634397626478>")
                    .setStyle(ButtonStyle.Secondary)
            );
            priceButtons.push(
                new ButtonBuilder()
                    .setCustomId("orderss-pricee")
                    .setLabel("أسـعـار الـطـلـبـات")
                    .setEmoji("<a:hox_money:1416511233141637252>")
                    .setStyle(ButtonStyle.Primary)
            );
        }

        if (roleButton === "add") {
            buyButtons.push(
                new ButtonBuilder()
                    .setCustomId("r654ole_b421u6y")
                    .setLabel("شــراء رتــب")
                    .setEmoji("<a:hox_star_gray:1326824634397626478>")
                    .setStyle(ButtonStyle.Secondary)
            );
            priceButtons.push(
                new ButtonBuilder()
                    .setCustomId("roles_prices")
                    .setLabel("أسـعـار الـرتـب")
                    .setEmoji("<a:hox_money:1416511233141637252>")
                    .setStyle(ButtonStyle.Primary)
            );
        }

        if (shopButton === "add") {
            buyButtons.push(
                new ButtonBuilder()
                    .setCustomId("shop_buy")
                    .setLabel("شــراء مــتــجــر")
                    .setEmoji("<a:hox_star_gray:1326824634397626478>")
                    .setStyle(ButtonStyle.Secondary)
            );
            priceButtons.push(
                new ButtonBuilder()
                    .setCustomId("shop_prices")
                    .setLabel("أسـعـار الـمـتـاجــر")
                    .setEmoji("<a:hox_money:1416511233141637252>")
                    .setStyle(ButtonStyle.Primary)
            );
        }

        if (buyButtons.length === 0) {
            return interaction.reply({
                content: "**انــت مــخــتــرتــش اي زر \nاحــطــلــك زر مــن ...**",
                ephemeral: true
            });
        }

        const actionRows = [];
        const allButtons = [...buyButtons, ...priceButtons];
        for (let i = 0; i < allButtons.length; i += 5) {
            const row = new ActionRowBuilder();
            row.addComponents(allButtons.slice(i, i + 5));
            actionRows.push(row);
        }

        const mainContainer = new ContainerBuilder();

        // العنوان
        mainContainer.addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent("# جــمــيــع التــكــتــات")
        );

        // النص الأول
        mainContainer.addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent("**<a:004:1326822409227210845> اخــتــر نــوع الــخــدمــة الــتــي تــريــدهــا مــن الأزرار الــتــالــيــة <a:004:1326822409227210845>**")
        );

        // 🔹 إضافة الصورة أو الخط في المنتصف
        const allTicketPhoto = setupPhoto?.allTicketPhoto;
        
        if (allTicketPhoto) {
            // إذا فيه صورة → أضفها
            mainContainer.addMediaGalleryComponents(media =>
                media.addItems(
                    new MediaGalleryItemBuilder()
                        .setURL(allTicketPhoto)
                )
            );
        } else {
            // إذا مافيه صورة → أضف الخط
            mainContainer.addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(setupData?.line || "----------------")
            );
        }

        // فاصل قبل الأزرار
        mainContainer.addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true)
        );

        // الأزرار
        actionRows.forEach(row => {
            mainContainer.addActionRowComponents(row);
        });

        await channel.send({ 
            components: [mainContainer], 
            flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 
        });

        await interaction.reply({
            content: `**تــم ارســال جــمــيــع التــكــتــات بــنــجــاح فــي : ${channel}**`,
            ephemeral: true
        });
    }
};