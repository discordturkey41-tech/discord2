const { 
    ApplicationCommandOptionType,
    EmbedBuilder,
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
    name: "order-ticket",
    description: "ارســال تــكــت طــلــبــات",
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
        
        // جلب البيانات من قاعدة البيانات
        const setupData = await Setup.findOne({ guildId: interaction.guild.id });
        const setupPhoto = await SetupPhoto.findOne({ guildId: interaction.guild.id });
        
        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({
                content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج صـلاحـيــة Administrator**`,
                flags: MessageFlags.Ephemeral
            });
        }

        // إنشاء Container الرئيسي
        const mainContainer = new ContainerBuilder();

        // العنوان
        mainContainer.addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent("# نــشــر طــلــبــات")
        );

        // النص
        mainContainer.addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(
                    "**<a:004:1326822409227210845> لـنــشــر طــلــب جــديــد يــرجــى الــضــغــط عــلــى زر شــراء طــلــب <a:004:1326822409227210845>**" +
                    (priceButtonOption !== "remove"
                        ? "\n**<a:005:1326822412607684618> ولــعــرض الأســعــار يــرجــى الــضــغــط عــلــى زر أســعــار الــطــلــبــات <a:005:1326822412607684618>**"
                        : "")
                )
        );

        // ⚡ تحقق من وجود صورة الطلبات في قاعدة البيانات
        const orderPhoto = setupPhoto?.ticketOrderPhoto;

        // إذا فيه صورة → أضفها
        if (orderPhoto) {
            mainContainer.addMediaGalleryComponents(media =>
                media.addItems(
                    new MediaGalleryItemBuilder()
                        .setURL(orderPhoto)
                )
            );
        } else {
            // لو مافيه صورة → ضع الخط من setupData.line
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
        mainContainer.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("buyy_order_ticket")
                    .setLabel("شــراء طــلــب")
                    .setEmoji("<a:hox_star_gray:1326824634397626478>")
                    .setStyle(ButtonStyle.Secondary),

                ...(priceButtonOption !== "remove"
                    ? [
                        new ButtonBuilder()
                            .setCustomId("orderss-pricee")
                            .setLabel("أســعــار الــطــلــبــات")
                            .setEmoji("<a:hox_star_light:1326824621722435655>")
                            .setStyle(ButtonStyle.Primary)
                      ]
                    : [])
            )
        );

        // إرسال الرسالة في القناة المحددة
        await channel.send({
            components: [mainContainer],
            flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
        });

        await interaction.reply({
            content: `**تــم ارســال تــكــت الــطــلــبــات بــنــجــاح فــي : ${channel}**`,
            flags: MessageFlags.Ephemeral
        });
    }
};