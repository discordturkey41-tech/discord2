// commands/add-autoline-room.js
const { ApplicationCommandOptionType, EmbedBuilder, ChannelType } = require("discord.js");
const Setup = require("../../Mangodb/setup.js");
const axios = require("axios");
const FormData = require("form-data");

module.exports = {
    name: "add-autoline-room",
    description: "إضـافـة روم لـلـخـط الـتـلـقـائـي",
    options: [
        {
            name: "channel",
            description: "الـروم الـذي تـريـد إضـافـتـه",
            type: ApplicationCommandOptionType.Channel,
            channel_types: [ChannelType.GuildText],
            required: true
        },
        {
            name: "line",
            description: "صـورة الـخـط",
            type: ApplicationCommandOptionType.Attachment,
            required: true
        },
        {
            name: "type",
            description: "نـوع الـخـط الـتـلـقـائـي",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                { name: "كـل رسـالـة", value: "every_message" },
                { name: "كـل مـنـشـن", value: "every_mention" }
            ]
        }
    ],

    async execute(client, interaction) {
        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({
                content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج صـلاحـيــة Administrator**`,
                ephemeral: true,
            });
        }

        const channel = interaction.options.getChannel("channel");
        const lineAttachment = interaction.options.getAttachment("line");
        const type = interaction.options.getString("type");

        if (!lineAttachment.contentType?.startsWith("image/")) {
            return interaction.reply({
                content: "**يـجـب أن تـكـون الـمـلـف صـورة**",
                ephemeral: true
            });
        }

        // نرفع الصورة على الـ API
        async function uploadImage(attachment) {
            try {
                const response = await axios.get(attachment.url, { responseType: "arraybuffer" });
                const buffer = Buffer.from(response.data, "binary");

                const form = new FormData();
                form.append("key", "d6207a09b60e476f2955a7d9990f86a6"); // API key
                form.append("image", buffer.toString("base64")); // استخدام base64

                const uploadResponse = await axios.post("https://api.imgbb.com/1/upload", form, {
                    headers: {
                        ...form.getHeaders()
                    }
                });

                if (uploadResponse.data && uploadResponse.data.data && uploadResponse.data.data.url) {
                    return uploadResponse.data.data.url;
                } else {
                    console.error('Invalid response from Imgbb:', uploadResponse.data);
                    return null;
                }
            } catch (error) {
                console.error("Upload error:", error.response?.data || error.message);
                return null;
            }
        }


        await interaction.deferReply({ ephemeral: true });

        const uploadedLineUrl = await uploadImage(lineAttachment);
        if (!uploadedLineUrl) {
            return interaction.editReply({
                content: "❌ فشل في رفع صورة الخط. الرجاء المحاولة لاحقاً"
            });
        }

        // جلب الإعدادات الحالية
        let setupData = await Setup.findOne({ guildId: interaction.guild.id });

        if (!setupData) {
            setupData = new Setup({
                guildId: interaction.guild.id,
                autoLines: []
            });
        }

        // التحقق إذا الروم مضاف مسبقاً
        if (setupData.autoLines && setupData.autoLines.some(line => line.channelId === channel.id)) {
            return interaction.editReply({
                content: `**هــذا الــروم مــضــاف مــســبــقــاً**`
            });
        }

        // إضافة الروم والخط الجديد
        const newLine = {
            channelId: channel.id,
            lineUrl: uploadedLineUrl, // ✅ رابط جديد من API
            type: type
        };

        if (!setupData.autoLines) {
            setupData.autoLines = [newLine];
        } else {
            setupData.autoLines.push(newLine);
        }

        await setupData.save();

        await interaction.editReply({
            content: `**تـم إضـافـة الـخـط الـتـلـقـائـي لـلـروم ${channel}\nالنـوع: ${type === 'every_message' ? 'كـل رسـالـة' : 'كـل مـنـشـن'}**`
        });
    }
};
