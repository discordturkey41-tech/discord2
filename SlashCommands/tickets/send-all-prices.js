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
    name: "send-all-prices",
    description: "ارســال جــمــيــع الأســعــار فــي روم واحــد",
    options: [
        {
            name: "channel",
            description: "الــروم الــذي ســوف يــتــم ارســال فــيــهــا الأســعــار",
            type: ApplicationCommandOptionType.Channel,
            channel_types: [ChannelType.GuildText],
            required: false
        },
        {
            name: "auction-button",
            description: "حــالــة زر أســعــار الــمــزادات",
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
                { name: "إضــافــة", value: "add" },
                { name: "إزالــة", value: "remove" }
            ]
        },
        {
            name: "order-button",
            description: "حــالــة زر أســعــار الــطــلــبــات",
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
                { name: "إضــافــة", value: "add" },
                { name: "إزالــة", value: "remove" }
            ]
        },
        {
            name: "role-button",
            description: "حــالــة زر أســعــار الــرتــب",
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
                { name: "إضــافــة", value: "add" },
                { name: "إزالــة", value: "remove" }
            ]
        },
        {
            name: "shop-button",
            description: "حــالــة زر أســعــار الــمــتــاجــر",
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
                { name: "إضــافــة", value: "add" },
                { name: "إزالــة", value: "remove" }
            ]
        },
        {
            name: "service-button",
            description: "حــالــة زر أســعــار الــخــدمــات",
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
        const serviceButton = interaction.options.getString("service-button") || "add";

        const buttons = [];

        if (auctionButton === "add") {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId("auctionss-pricee")
                    .setLabel("أسـعـار الـمـزادات")
                    .setEmoji("<a:hox_star_gray:1326824634397626478>")
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        if (orderButton === "add") {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId("orderss-pricee")
                    .setLabel("أسـعـار الـطـلـبــات")
                    .setEmoji("<a:hox_star_gray:1326824634397626478>")
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        if (roleButton === "add") {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId("roles_prices")
                    .setLabel("أسـعـار الـرتــب")
                    .setEmoji("<a:hox_star_gray:1326824634397626478>")
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        if (shopButton === "add") {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId("shop_prices")
                    .setLabel("أسـعـار الـمـتــاجــر")
                    .setEmoji("<a:hox_star_gray:1326824634397626478>")
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        if (serviceButton === "add") {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId("service_prices")
                    .setLabel("أسـعـار الـخـدمـات")
                    .setEmoji("<a:hox_star_gray:1326824634397626478>")
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        if (buttons.length === 0) {
            return interaction.reply({
                content: "**انــت مــخــتــرتــش اي زر \nاحــطــلــك زر مــن ...**",
                ephemeral: true
            });
        }

        const actionRows = [];
        for (let i = 0; i < buttons.length; i += 5) {
            const row = new ActionRowBuilder();
            row.addComponents(buttons.slice(i, i + 5));
            actionRows.push(row);
        }

        const mainContainer = new ContainerBuilder();

        // العنوان
        mainContainer.addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent("# جــمــيــع الأســعــار")
        );

        // النص الأول
        mainContainer.addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent("**<a:004:1326822409227210845> اخــتــر نــوع الأســعــار الــتــي تــريــدهــا مــن الأزرار الــتــالــيــة <a:004:1326822409227210845>**")
        );

        // 🔹 إضافة الصورة أو الخط في المنتصف
        const allPricePhoto = setupPhoto?.allPricePhoto;
        
        if (allPricePhoto) {
            // إذا فيه صورة → أضفها
            mainContainer.addMediaGalleryComponents(media =>
                media.addItems(
                    new MediaGalleryItemBuilder()
                        .setURL(allPricePhoto)
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
            content: `**تــم ارســال جــمــيــع الأســعــار بــنــجــاح فــي : ${channel}**`,
            ephemeral: true
        });
    }
};