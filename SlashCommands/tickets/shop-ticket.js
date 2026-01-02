const { 
    ApplicationCommandOptionType,
    ImageDisplayBuilder,
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
    name: "shop-ticket",
    description: "ارســال تــكــت شــراء مــتــاجــر",
    options: [
        {
            name: "channel",
            description: "الــروم الــذي ســوف يــتــم ارســال فــيــهــا الــتــكــت",
            type: ApplicationCommandOptionType.Channel,
            channel_types: [ChannelType.GuildText],
            required: false
        },
        {
            name: "price-button",
            description: "اخــتــيــار حــالــة زر الأســعــار",
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
                { name: "إضــافــة زر الأســعــار", value: "add" },
                { name: "إزالــة زر الأســعــار", value: "remove" }
            ]
        }
    ],

    async execute(client, interaction) {

        const channel = interaction.options.getChannel("channel") || interaction.channel;
        const priceButtonOption = interaction.options.getString("price-button");

        const setupData = await Setup.findOne({ guildId: interaction.guild.id });
        const setupPhoto = await SetupPhoto.findOne({ guildId: interaction.guild.id });

        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({
                content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج صـلاحـيــة Administrator**`,
                flags: MessageFlags.Ephemeral
            });
        }

        // ⬅ الآن لا يوجد فاصل فوق الصورة
        const mainContainer = new ContainerBuilder();

        // العنوان
// العنوان
mainContainer.addTextDisplayComponents(
    new TextDisplayBuilder()
        .setContent("# شــراء مــتــاجــر")
);

// النص
mainContainer.addTextDisplayComponents(
    new TextDisplayBuilder()
        .setContent(
            "**<a:004:1326822409227210845> لــشــراء مــتــجــر يــرجــى الــضــغــط عــلــى زر شــراء مــتــجــر <a:004:1326822409227210845>**" +
            (priceButtonOption !== "remove"
                ? "\n**<a:005:1326822412607684618> ولــعــرض الأســعــار يــرجــى الــضــغــط عــلــى زر أســعــار الــمــتــاجــر <a:005:1326822412607684618>**"
                : "")
        )
);

// ⚡ تحقق من وجود الصورة
const shopPhoto = setupPhoto?.ticketShopPhoto;

// إذا فيه صورة → أضفها
if (shopPhoto) {
    mainContainer.addMediaGalleryComponents(media =>
        media.addItems(
            new MediaGalleryItemBuilder()
                .setURL(shopPhoto)
        )
    );
} else {
    // لو مافيه صورة → ضع الخط من setupData.line
    mainContainer.addTextDisplayComponents(
        new TextDisplayBuilder()
            .setContent(setupData.line || "----------------")
    );
}

        // فاصل قبل الأزرار فقط
        mainContainer.addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true)
        );

        // الأزرار
        mainContainer.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("shop_buy")
                    .setLabel("شــراء مــتــجــر")
                    .setEmoji("<a:hox_star_gray:1326824634397626478>")
                    .setStyle(ButtonStyle.Secondary),

                ...(priceButtonOption !== "remove"
                    ? [
                        new ButtonBuilder()
                            .setCustomId("shop_prices")
                            .setLabel("أســعــار الــمــتــاجــر")
                            .setEmoji("<a:hox_star_light:1326824621722435655>")
                            .setStyle(ButtonStyle.Primary)
                      ]
                    : [])
            )
        );

        await channel.send({
            components: [mainContainer],
            flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
        });

        await interaction.reply({
            content: `**تــم ارســال تــكــت شــراء الــمــتــجــر بــنــجــاح فــي : ${channel}**`,
            flags: MessageFlags.Ephemeral
        });
    }
};
