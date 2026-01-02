const { ApplicationCommandOptionType, ChannelType, EmbedBuilder } = require("discord.js");
const Setup = require("../../Mangodb/setup.js");
const SyncManager = require("../../services/syncManager.js");
const axios = require('axios');
const FormData = require('form-data');

module.exports = {
    name: "setup",
    description: "اعــداد اعــدادات الــســيــرفــر",
    options: [
        { name: "bank", description: "صــاحــب الــتــحــويــل", type: ApplicationCommandOptionType.User, required: false },
        { name: "line", description: "الــخــط", type: ApplicationCommandOptionType.Attachment, required: false },
        { name: "shop-mention", description: "مــنــشــن مــتــجــر", type: ApplicationCommandOptionType.Role, required: false },
        { name: "shop-admin", description: "مــســئــول مــتــاجــر", type: ApplicationCommandOptionType.Role, required: false },
        { name: "partner-role", description: "رتــبــة الــشــريــك", type: ApplicationCommandOptionType.Role, required: false },
        { name: "order-room", description: "روم طــلــبــات", type: ApplicationCommandOptionType.Channel, channel_types: [ChannelType.GuildText], required: false },
        { name: "order-admin", description: "مــســئــول الــطــلــبــات", type: ApplicationCommandOptionType.Role, required: false },
        { name: "order-mention", description: "مــنــشــن طــلــبــات", type: ApplicationCommandOptionType.Role, required: false },
        { name: "auction-admin", description: "مــســئــول مــزاد", type: ApplicationCommandOptionType.Role, required: false },
        { name: "auction-mention", description: "مــنــشــن مــزاد", type: ApplicationCommandOptionType.Role, required: false },
        { name: "ad-admin", description: "مــســئــول الاعــلانــات", type: ApplicationCommandOptionType.Role, required: false },
        { name: "shop-ticket", description: "تــكــت شــراء الــمــتــاجــر", type: ApplicationCommandOptionType.Channel, channel_types: [ChannelType.GuildCategory], required: false },
        { name: "order-ticket", description: "تــكــت شــراء طــلــبــات", type: ApplicationCommandOptionType.Channel, channel_types: [ChannelType.GuildCategory], required: false },
        { name: "auction-ticket", description: "تــكــت شــراء مــزاد", type: ApplicationCommandOptionType.Channel, channel_types: [ChannelType.GuildCategory], required: false },
        { name: "role-ticket", description: "تــكــت شــراء رتــب", type: ApplicationCommandOptionType.Channel, channel_types: [ChannelType.GuildCategory], required: false },
        { name: "ad-ticket", description: "تــكــت شــراء اعــلان", type: ApplicationCommandOptionType.Channel, channel_types: [ChannelType.GuildCategory], required: false },
    ],

    async execute(client, interaction) {
        // دالة رفع الصور إلى Imgbb API
        async function uploadImage(attachment) {
            try {
                const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(response.data, 'binary');

                const form = new FormData();
                form.append('key', 'd6207a09b60e476f2955a7d9990f86a6'); // API key
                form.append('image', buffer.toString('base64')); // استخدام base64

                const uploadResponse = await axios.post('https://api.imgbb.com/1/upload', form, {
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
                console.error('Upload error:', error.response?.data || error.message);
                return null;
            }
        }

        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({
                content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج صـلاحـيــة Administrator**`,
                ephemeral: true,
            });
        }

        const existingData = await Setup.findOne({ guildId: interaction.guild.id }) || {};

        let lineUrl = existingData.line || null;
        const lineAttachment = interaction.options.getAttachment("line");

        if (lineAttachment) {
            await interaction.deferReply({ ephemeral: true });
            lineUrl = await uploadImage(lineAttachment);
            
            if (!lineUrl) {
                return await interaction.editReply({ 
                    content: '❌ فشل في رفع صورة الخط. الرجاء المحاولة لاحقاً' 
                });
            }
        } else {
            await interaction.deferReply({ ephemeral: true });
        }

        const optionsInfo = [
            { name: "bank", type: "user", key: "bank" },
            { name: "line", type: "attachment", key: "line" },
            { name: "shop-mention", type: "role", key: "shopMention" },
            { name: "shop-admin", type: "role", key: "shopAdmin" },
            { name: "partner-role", type: "role", key: "partnerRole" },
            { name: "order-room", type: "channel", key: "orderRoom" },
            { name: "order-admin", type: "role", key: "orderAdmin" },
            { name: "order-mention", type: "role", key: "orderMention" },
            { name: "auction-admin", type: "role", key: "auctionAdmin" },
            { name: "auction-mention", type: "role", key: "auctionMention" },
            { name: "ad-admin", type: "role", key: "adAdmin" },
            { name: "logs", type: "channel", key: "logs" },
            { name: "shop-ticket", type: "channel", key: "shopTicket" },
            { name: "order-ticket", type: "channel", key: "orderTicket" },
            { name: "auction-ticket", type: "channel", key: "auctionTicket" },
            { name: "role-ticket", type: "channel", key: "roleTicket" },
            { name: "ad-ticket", type: "channel", key: "adTicket" },
        ];

        const data = {
            guildId: interaction.guild.id,
            bank: interaction.options.getUser("bank")?.id ?? existingData.bank ?? null,
            line: lineUrl,
            shopMention: interaction.options.getRole("shop-mention")?.id ?? existingData.shopMention ?? null,
            shopAdmin: interaction.options.getRole("shop-admin")?.id ?? existingData.shopAdmin ?? null,
            partnerRole: interaction.options.getRole("partner-role")?.id ?? existingData.partnerRole ?? null,
            orderRoom: interaction.options.getChannel("order-room")?.id ?? existingData.orderRoom ?? null,
            orderAdmin: interaction.options.getRole("order-admin")?.id ?? existingData.orderAdmin ?? null,
            orderMention: interaction.options.getRole("order-mention")?.id ?? existingData.orderMention ?? null,
            auctionAdmin: interaction.options.getRole("auction-admin")?.id ?? existingData.auctionAdmin ?? null,
            auctionMention: interaction.options.getRole("auction-mention")?.id ?? existingData.auctionMention ?? null,
            adAdmin: interaction.options.getRole("ad-admin")?.id ?? existingData.adAdmin ?? null,
            logs: interaction.options.getChannel("logs")?.id ?? existingData.logs ?? null,
            shopTicket: interaction.options.getChannel("shop-ticket")?.id ?? existingData.shopTicket ?? null,
            orderTicket: interaction.options.getChannel("order-ticket")?.id ?? existingData.orderTicket ?? null,
            auctionTicket: interaction.options.getChannel("auction-ticket")?.id ?? existingData.auctionTicket ?? null,
            roleTicket: interaction.options.getChannel("role-ticket")?.id ?? existingData.roleTicket ?? null,
            adTicket: interaction.options.getChannel("ad-ticket")?.id ?? existingData.adTicket ?? null,
        };

        await Setup.findOneAndUpdate(
            { guildId: interaction.guild.id },
            data,
            { upsert: true, new: true }
        );

        // NEW METHOD: Log sync event
        await SyncManager.logSync(
            interaction.guild.id,
            'bot',
            'update',
            data,
            interaction.user.id
        );

        console.log(`[BOT SETUP] Guild ${interaction.guild.id} setup saved to MongoDB`, {
            userId: interaction.user.id,
            timestamp: new Date(),
            dataFields: Object.keys(data).filter(k => data[k]).length,
            savedData: data
        });

        const embedFields = optionsInfo.map(({ name, type, key }) => {
            let value;
            switch(type) {
                case "user":
                    value = data[key] ? `<@${data[key]}>` : "لــم يــتــم الــتــحــديــد";
                    break;
                case "role":
                    value = data[key] ? `<@&${data[key]}>` : "لــم يــتــم الــتــحــديــد";
                    break;
                case "channel":
                    value = data[key] ? `<#${data[key]}>` : "لــم يــتــم الــتــحــديــد";
                    break;
                case "attachment":
                    value = data[key] ? `[عــرض الــخــط](${data[key]})` : "لــم يــتــم الــتــحــديــد";
                    break;
            }
            
            return {
                name: name.replace(/-/g, ' '),
                value: value,
                inline: true,
            };
        });

        const embed = new EmbedBuilder()
            .setAuthor({
                name: client.user.username,
                iconURL: client.user.displayAvatarURL()
            })
            .setTitle("تــم حــفــظ اعــدادات الــســيــرفــر")
            .addFields(embedFields)
            .setColor(0x00FF00)
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .setFooter({
                text: "Dev By Hox Devs",
                iconURL: client.user.displayAvatarURL()
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};