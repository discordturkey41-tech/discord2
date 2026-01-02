// File: commands/setup-photo.js
const { ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const SetupPhoto = require("../../Mangodb/setupPhoto.js");
const axios = require('axios');
const FormData = require('form-data');

module.exports = {
    name: "setup-photo",
    description: "إعـداد الـصـور الـخـاصـة بـالـتـكـتـات والأسـعـار",
    options: [
        { name: "ticket-shop", description: "صـورة تـظـهـر فـي تـكـت الـمـتـاجـر", type: ApplicationCommandOptionType.Attachment, required: false },
        { name: "ticket-auction", description: "صـورة تـظـهـر فـي تـكـت الـمـزاد", type: ApplicationCommandOptionType.Attachment, required: false },
        { name: "ticket-order", description: "صـورة تـظـهـر فـي تـكـت الـطـلـبـات", type: ApplicationCommandOptionType.Attachment, required: false },
        { name: "ticket-role", description: "صـورة تـظـهـر فـي تـكـت الـرتـب", type: ApplicationCommandOptionType.Attachment, required: false },
        { name: "price-shop", description: "صـورة تـظـهـر فـي أسـعـار الـمـتـاجـر", type: ApplicationCommandOptionType.Attachment, required: false },
        { name: "price-auction", description: "صـورة تـظـهـر فـي أسـعـار الـمـزاد", type: ApplicationCommandOptionType.Attachment, required: false },
        { name: "price-order", description: "صـورة تـظـهـر فـي أسـعـار الـطـلـبـات", type: ApplicationCommandOptionType.Attachment, required: false },
        { name: "price-role", description: "صـورة تـظـهـر فـي أسـعـار الـرتـب", type: ApplicationCommandOptionType.Attachment, required: false },
        { name: "price-service", description: "صـورة تـظـهر فـي أسـعـار الـخـدمـات", type: ApplicationCommandOptionType.Attachment, required: false }, // ← جديد
        { name: "all-ticket", description: "صـورة تـظـهـر فـي تـكـت جـمـيـع الـتـكـتـات", type: ApplicationCommandOptionType.Attachment, required: false },
        { name: "all-price", description: "صـورة تـظـهـر فـي جـمـيـع الأسـعـار", type: ApplicationCommandOptionType.Attachment, required: false },
    ],

    async execute(client, interaction) {
        async function uploadImage(attachment) {
            try {
                if (!attachment) return null;
                const response = await axios.get(attachment.url, { responseType: 'arraybuffer', timeout: 10000 });
                const buffer = Buffer.from(response.data, 'binary');
                const form = new FormData();
                form.append('key', 'd6207a09b60e476f2955a7d9990f86a6');
                form.append('image', buffer.toString('base64'));
                const uploadResponse = await axios.post('https://api.imgbb.com/1/upload', form, { headers: { ...form.getHeaders() }, timeout: 15000 });
                return uploadResponse.data?.data?.url || null;
            } catch (error) {
                console.error('Upload error:', error.response?.data || error.message);
                return null;
            }
        }

        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({ content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر**`, ephemeral: true });
        }

        const hasAnyAttachment = [
            "ticket-shop","ticket-auction","ticket-order","ticket-role",
            "price-shop","price-auction","price-order","price-role",
            "price-service","all-ticket","all-price" // ← service-photo
        ].some(option => interaction.options.getAttachment(option));

        if (!hasAnyAttachment) {
            return interaction.reply({ content: "لا توجد صور مرفوعة!", ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        let existingData = await SetupPhoto.findOne({ guildId: interaction.guild.id });
        if (!existingData) existingData = new SetupPhoto({ guildId: interaction.guild.id });

        const optionsMap = [
            { optionName: "ticket-shop", dbField: "ticketShopPhoto" },
            { optionName: "ticket-auction", dbField: "ticketAuctionPhoto" },
            { optionName: "ticket-order", dbField: "ticketOrderPhoto" },
            { optionName: "ticket-role", dbField: "ticketRolePhoto" },
            { optionName: "price-shop", dbField: "priceShopPhoto" },
            { optionName: "price-auction", dbField: "priceAuctionPhoto" },
            { optionName: "price-order", dbField: "priceOrderPhoto" },
            { optionName: "price-role", dbField: "priceRolePhoto" },
            { optionName: "price-service", dbField: "servicePhoto" }, // ← جديد
            { optionName: "all-ticket", dbField: "allTicketPhoto" },
            { optionName: "all-price", dbField: "allPricePhoto" }
        ];

        const uploadResults = [];
        const failedUploads = [];

        for (const { optionName, dbField } of optionsMap) {
            const attachment = interaction.options.getAttachment(optionName);
            if (attachment) {
                const imageUrl = await uploadImage(attachment);
                if (imageUrl) {
                    existingData[dbField] = imageUrl;
                    uploadResults.push({ name: optionName.replace(/-/g, ' '), url: imageUrl });
                } else failedUploads.push(optionName.replace(/-/g, ' '));
            }
        }

        existingData.updatedAt = Date.now();
        await existingData.save();

        const embed = new EmbedBuilder()
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle("إعـدادات الـصـور")
            .setColor(0x00FF00)
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .setFooter({ text: "Dev By Hox Devs", iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        if (uploadResults.length > 0) {
            const fields = uploadResults.map(result => ({
                name: result.name,
                value: `[عـرض الـصـورة](${result.url})`,
                inline: true
            }));
            embed.addFields(fields);
        }

        if (failedUploads.length > 0) {
            embed.addFields({ name: "❌ فشل رفع الصور التالية:", value: failedUploads.map(name => `• ${name}`).join('\n'), inline: false });
            embed.setColor(0xFFA500);
        }

        await interaction.editReply({ embeds: [embed] });
    }
};
