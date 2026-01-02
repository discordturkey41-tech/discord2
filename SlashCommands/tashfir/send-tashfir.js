const { 
    ApplicationCommandOptionType,
    ChannelType,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

module.exports = {
    name: "send-tashfir",
    description: "ارســال ايــمــبــد تــشــفــيــر الــمــنــشــورات ",
    options: [
        {
            name: "channel",
            description: "الــروم الــتــي ســيــتــم الإرســال فــيــهــا",
            type: ApplicationCommandOptionType.Channel,
            channel_types: [ChannelType.GuildText],
            required: false
        }
    ],

    async execute(client, interaction) {
        const channel = interaction.options.getChannel("channel") || interaction.channel;
        
        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({
                content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج صـلاحـيــة Administrator**`,
                ephemeral: true,
            });
        }


        // Components V2
        const components = [
            new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent("# تــشــفــيــر مــنــشــورات")
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent("**<a:hox_star_light:1326824621722435655> لــتــشــفــيــر مــنــشــورك اضــغــط عــلــى الــزر الــذي فــي الأســفــل <a:hox_star_light:1326824621722435655>**")
                )
                .addSeparatorComponents(
                    new SeparatorBuilder()
                        .setSpacing(SeparatorSpacingSize.Small)
                        .setDivider(true)
                )
                .addActionRowComponents(
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId("tachfier")
                                .setLabel("تــشــفــيــر")
                                .setEmoji("<a:hox_star_gray:1326824634397626478>")
                                .setStyle(ButtonStyle.Primary)
                        )
                )
        ];

        await channel.send({
            components: components,
            flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
        });

        await interaction.reply({
            content: `**تــم ارســال رســالــة الــتــشــفــيــر بــنــجــاح فــي : ${channel}**`,
            ephemeral: true
        });
    }
};
