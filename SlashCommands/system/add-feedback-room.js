const { ApplicationCommandOptionType, ChannelType } = require("discord.js");
const FeedbackSetup = require("../../Mangodb/setup.js");
const axios = require("axios");
const FormData = require("form-data");

module.exports = {
    name: "add-feedback-room",
    description: "إضـافـة روم لـلـتـقـيـيـمـات",
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
        }
    ],

    async execute(client, interaction) {
        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({
                content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر**`,
                ephemeral: true,
            });
        }

        const channel = interaction.options.getChannel("channel");
        const lineAttachment = interaction.options.getAttachment("line");

        if (!lineAttachment.contentType?.startsWith("image/")) {
            return interaction.reply({
                content: "**يـجـب أن تـكـون الـمـلـف صـورة**",
                ephemeral: true
            });
        }

        async function uploadImage(attachment) {
            try {
                const response = await axios.get(attachment.url, { responseType: "arraybuffer" });
                const buffer = Buffer.from(response.data, "binary");

                const form = new FormData();
                form.append("key", "d6207a09b60e476f2955a7d9990f86a6");
                form.append("image", buffer.toString("base64"));

                const uploadResponse = await axios.post("https://api.imgbb.com/1/upload", form, {
                    headers: { ...form.getHeaders() }
                });

                if (uploadResponse.data?.data?.url) {
                    return uploadResponse.data.data.url;
                }
                return null;
            } catch (error) {
                console.error("Upload error:", error.response?.data || error.message);
                return null;
            }
        }

        await interaction.deferReply({ ephemeral: true });

        const uploadedLineUrl = await uploadImage(lineAttachment);
        if (!uploadedLineUrl) {
            return interaction.editReply({
                content: "❌ فشل في رفع صورة الخط"
            });
        }

        let feedbackData = await FeedbackSetup.findOne({ guildId: interaction.guild.id });

        if (!feedbackData) {
            feedbackData = new FeedbackSetup({
                guildId: interaction.guild.id,
                feedbackRooms: []
            });
        }

        if (feedbackData.feedbackRooms?.some(room => room.channelId === channel.id)) {
            return interaction.editReply({
                content: `**هــذا الــروم مــضــاف مــســبــقــاً**`
            });
        }

        const newRoom = {
            channelId: channel.id,
            lineUrl: uploadedLineUrl
        };

        if (!feedbackData.feedbackRooms) {
            feedbackData.feedbackRooms = [newRoom];
        } else {
            feedbackData.feedbackRooms.push(newRoom);
        }

        await feedbackData.save();

        await interaction.editReply({
            content: `**تـم إضـافـة روم التـقـيـيـمـات ${channel}**`
        });
    }
};