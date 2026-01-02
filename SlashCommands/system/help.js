    const { ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const Setup = require("../../Mangodb/setup.js");

    module.exports = {
        name: "help",
        description: "هـذا الامـر يـسـاعـدك عـلـي معــرفـة اوامـر الـبـوت",
        options: [
            {
                name: "type",
                description: "اخـتـار الابـشـن الـذي تـريـد مـعـرفـت مـعـلـومـات عـنـه",
                type: ApplicationCommandOptionType.String,
                required: true,
                choices: [
                    { name: "طـريـقـة عـمـل نـوع", value: "create_type" },
                    { name: "طـريـقـة انـشـاء مـتـجـر", value: "create_shop" },
                    { name: "اوامـر لـ مـتـاجـر", value: "choice_3" },
                    { name: "اوامـر لـ مـتـاجـر 2", value: "choice_4" },
                    { name: "اوامـر لـ مـتـاجـر 3", value: "choice_5" },
                    { name: "الـمـنـشـنـات", value: "choice_6" },
                ]
            }
        ],
        async execute(client, interaction) {
            const choice = interaction.options.getString("type");
        const setupData = await Setup.findOne({ guildId: interaction.guild.id });

            const embedTemplate = new EmbedBuilder()
            .setImage(setupData.line)
                .setAuthor({
                    name: interaction.guild.name,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setFooter({
                    text: "Dev By Hox Devs",
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                });

            let embed;

            switch (choice) {
                case "create_type":
                    embed = EmbedBuilder.from(embedTemplate)
                        .setTitle("طـريـقـة عـمـل الـنـوع")
.setDescription("**هـمـمـم عـايـز تـعـمـل نـوع؟؟؟**\n\n**`﹣` /add-type عـشـان تـضـيـف نـوع**\n\n**> ༺═─────────────────────═༻**\n\n**- بـس لـو عـايـز تـعـدل عـلـي نـوع هـتـعـمـل ايـه؟؟؟؟**\n\n**`﹣` /edit-type عـشـان تـعـدل عـلـي الـنـوع بـراحـتـك**\n\n**> ༺═─────────────────────═༻**\n\n**- عـمـلـت نـوع بـالـغـلـط وعـايـز تـحـذفـه هـتـعـمـل ايـهههه؟**\n\n**`﹣` /remove-type عـشـان تـحـذفـه**\n\n**قـولـي شـكـرا بـقـا**")
                    break;
                case "create_shop":
                    embed = EmbedBuilder.from(embedTemplate).setTitle("طـريـقـة انـشـاء مـتـجـر").setDescription("**هـمـمـم عـايـز تـعـمـل مـتـجـر؟؟؟؟**\n\n**`﹣` /create-shop عـشـان تـعـمـل مـتـجـر**\n\n**> ༺═─────────────────────═༻**\n\n**- عـمـلـت متجر بـالـغـلـط وعـايـز تـحـذفـه هـتـعـمـل ايـهههه؟**\n\n**`﹣` /delete-shop عـشـان تـحـذفـه**\n\n**> ༺═─────────────────────═༻**\n\n**- عـايـز تـعـطـل الـمـتـجـر هـتـعـمـل ايـه؟**\n\n**`﹣` /disable-shop عـشـان تـعـطـلـه**\n\n**> ༺═─────────────────────═༻**\n\n**- عـايـز تـفـعـل الـمـتـجـر بـعـد مـا عـطـلـتـه هـتـعـمـل ايـه؟**\n\n**`﹣` /active-shop عـشـان تـفـعـلـه**\n\n**اشـكـرنـي بـقـا**")

                    break;
                case "choice_3":
                    embed = EmbedBuilder.from(embedTemplate).setTitle("اوامـر لـ مـتـاجـر").setDescription("**هـمـمـم عـايـز تـغـيـر اسـم المـتـجـر؟؟؟؟**\n\n**`﹣` /change-name عـشـان تـغـيـر اسـم المـتـجـر**\n\n**> ༺═─────────────────────═༻**\n\n**- عـمـلـت مـتـجـر بـ اونـر غـلـط وعـايـز تـغـيـره هـتـعـمـل ايـهههه؟**\n\n**`﹣` /change-owner عـشـان تـغـيـره**\n\n**> ༺═─────────────────────═༻**\n\n**- عـايـز تـغـيـر شـكـل الـمـتـجـر هـتـعـمـل ايـه؟**\n\n**`﹣` /change-shape عـشـان تـغـيـره**\n\n**> ༺═─────────────────────═༻**\n\n**- عـايـز تـغـيـر نـوع الـمـتـجـر بـعـد مـا عـمـلـتـه هـتـعـمـل ايـه؟**\n\n**`﹣` /change-type عـشـان تـغـيـره**\n\n **يـعـم مـاشـي يـعـم مـاشـي مـتـشـكـرنـيـش**")
                    break;
                case "choice_4":
                    embed = EmbedBuilder.from(embedTemplate).setTitle("اوامـر لـ مـتـاجـر 2").setDescription("**هـمـمـم عـايـز تـفـعـل كـل الـمـتـاجـر؟؟؟؟**\n\n**`﹣` /active-all-shops عـشـان تـفـعـل كـل الـمـتـاجـر**\n\n**> ༺═─────────────────────═༻**\n\n**- فـعـلـت كـل الـمـتـاجـر بـالـغـلـط وعـايـز تـعـطـلـهـم هـتـعـمـل ايـهههه؟**\n\n**`﹣` /disable-all-shops عـشـان تـعـطـل كـل الـمـتـاجـر**\n\n**> ༺═─────────────────────═༻**\n\n**- عـايـز تـخـفـي كـل الـمـتـاجـر هـتـعـمـل ايـه؟**\n\n**`﹣` /hide-all-shops عـشـان تـخـفـي كـل الـمـتـاجـر**\n\n**> ༺═─────────────────────═༻**\n\n**- عـايـز تـظـهـر كـل الـمـتـاجـر بـعـد مـا خـفـيـتـهـم هـتـعـمـل ايـه؟**\n\n**قـولـي شـكـرا حـتـي**")
                    break;
                case "choice_5":
                    embed = EmbedBuilder.from(embedTemplate).setTitle("اوامـر لـ مـتـاجـر 3").setDescription("**هـمـمـم عـايـز تـظـهـر داتـا الـمـتـجـر؟؟؟؟**\n\n**`﹣` /shop-data عـشـان تـظـهـر داتـا الـمـتـجـر**\n\n**> ༺═─────────────────────═༻**\n\n**- عـنـدك رومـات عـاديـه وعـايـز تـخـلـيـهـم مـتـاجـر مـاذا سـوف تـفـعـلللل؟؟؟**\n\n**`﹣` /add-shop-data عـشـان تـخـلـي رومـات الـعـاديـه مـتـاجـر**\n\n**> ༺═─────────────────────═༻**\n\n**- عـايـز تـرسـل رسـالـة لـ كـل الـمـتـاجـر او مـتـجـر مـحـدد هـتـعـمـل ايـه؟**\n\n**`﹣` /send-message-shop عـشـان تـرسـل رسـالـة لـ كـل الـمـتـاجـر او مـتـجـر مـحـدد**\n\n**مـش عـايـز تـشـكـرنـي يـعـم مـاشـي**")
                    break;
                case "choice_6":
                    embed = EmbedBuilder.from(embedTemplate).setTitle("الـمـنـشـنـات").setDescription("**هـمـمـم عـايـز تـظـهـر مـنـشـناـت الـمـتـجـر؟؟؟؟**\n\n**`﹣` اكـتـب \n-منشنات**\n\n**> ༺═─────────────────────═༻**\n\n**- عـايـز تـضـيـف مـنـشـنـات لـ الـمـتـجـر مـاذا سـوف تـفـعـلللل؟؟؟**\n\n**`﹣` /add-mention عـشـان تـضـيـف مـنـشـنـات لـ الـمـتـجـر **\n\n**> ༺═─────────────────────═༻**\n\n**- عـايـز تـعـدل مـنـشـنـات الـمـتـجـر هـتـعـمـل ايـه؟**\n\n**`﹣` /edit-mention عـشـان تـعـدل مـنــشـنـات الـمـتـجـر**\n\n**> ༺═─────────────────────═༻**\n\n**- عـايـز تـرسـت مـنـشـنـات الـمـتـاجـر او مـتـجـر مـحـدد هـتـعـمـل ايـه؟**\n\n**`﹣` /reset-mention عـشـان تـرسـت مـنـشـنـات الـمـتـاجـر**\n\n**يـعـم مـا تـشـكـرنـي**")
                    break;
                case "choice_7":
                    embed = EmbedBuilder.from(embedTemplate).setTitle("Choice 7").setDescription("");
                    break;
                case "choice_8":
                    embed = EmbedBuilder.from(embedTemplate).setTitle("Choice 8").setDescription("");
                    break;
                case "choice_9":
                    embed = EmbedBuilder.from(embedTemplate).setTitle("Choice 9").setDescription("");
                    break;
                case "choice_10":
                    embed = EmbedBuilder.from(embedTemplate).setTitle("Choice 10").setDescription("");
                    break;
                case "choice_11":
                    embed = EmbedBuilder.from(embedTemplate).setTitle("Choice 11").setDescription("");
                    break;
                case "choice_12":
                    embed = EmbedBuilder.from(embedTemplate).setTitle("Choice 12").setDescription("");
                    break;
                case "choice_13":
                    embed = EmbedBuilder.from(embedTemplate).setTitle("Choice 13").setDescription("");
                    break;
                case "choice_14":
                    embed = EmbedBuilder.from(embedTemplate).setTitle("Choice 14").setDescription("");
                    break;
                case "choice_15":
                    embed = EmbedBuilder.from(embedTemplate).setTitle("Choice 15").setDescription("");
                    break;
                case "choice_16":
                    embed = EmbedBuilder.from(embedTemplate).setTitle("Choice 16").setDescription("");
                    break;
                case "choice_17":
                    embed = EmbedBuilder.from(embedTemplate).setTitle("Choice 17").setDescription("");
                    break;
                case "choice_18":
                    embed = EmbedBuilder.from(embedTemplate).setTitle("Choice 18").setDescription("");
                    break;
                case "choice_19":
                    embed = EmbedBuilder.from(embedTemplate).setTitle("Choice 19").setDescription("");
                    break;
                case "choice_20":
                    embed = EmbedBuilder.from(embedTemplate).setTitle("Choice 20").setDescription("");
                    break;
                case "choice_21":
                    embed = EmbedBuilder.from(embedTemplate).setTitle("Choice 21").setDescription("");
                    break;
                case "choice_22":
                    embed = EmbedBuilder.from(embedTemplate).setTitle("Choice 22").setDescription("");
                    break;
                case "choice_23":
                    embed = EmbedBuilder.from(embedTemplate).setTitle("Choice 23").setDescription("");
                    break;
                case "choice_24":
                    embed = EmbedBuilder.from(embedTemplate).setTitle("Choice 24").setDescription("");
                    break;
                case "choice_25":
                    embed = EmbedBuilder.from(embedTemplate).setTitle("Choice 25").setDescription("");
                    break;
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    };
