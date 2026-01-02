const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const Shop = require('../../Mangodb/shop.js');
const Prefix = require('../../Mangodb/prefix.js');

module.exports = {
    name: "messageCreate",
    once: false,

    async execute(client, message) {
        if (message.author.bot || !message.content) return;

        const prefixData = await Prefix.findOne({ guildId: message.guild.id }) || {};

        const reservedWords = [];

        const commandPrefixes = {
            mentionShop: prefixData.mentionShop ? prefixData.mentionShop.split(',') : [],
            warnShop: prefixData.warnShop ? prefixData.warnShop.split(',') : [],
            unwarnShop: prefixData.unwarnShop ? prefixData.unwarnShop.split(',') : [],
            warnsShop: prefixData.warnsShop ? prefixData.warnsShop.split(',') : [],
            disableShop: prefixData.disableShop ? prefixData.disableShop.split(',') : [],
            activeShop: prefixData.activeShop ? prefixData.activeShop.split(',') : [],
            deleteShop: prefixData.deleteShop ? prefixData.deleteShop.split(',') : [],
            addDataShop: prefixData.addDataShop ? prefixData.addDataShop.split(',') : [],
            createShop: prefixData.createShop ? prefixData.createShop.split(',') : [],
            changeType: prefixData.changeType ? prefixData.changeType.split(',') : []
        };

        for (const command in commandPrefixes) {
            reservedWords.push(...commandPrefixes[command]);
        }

        const fixedCommands = [
            "+منشنات", "-منشنات", 
            "+تحذير", "+ازالة", "+تحذيرات",
            "+تعطيل", "+تفعيل", "+حذف",
            "+اضافة", "+متجر", "+تغيير"
        ];
        
        reservedWords.push(...fixedCommands);

        const reservedWordsLower = reservedWords.map(word => word.toLowerCase().trim());
        const messageContentLower = message.content.toLowerCase().trim();

        const containsReservedWord = reservedWordsLower.some(word => 
            messageContentLower === word || messageContentLower.startsWith(word + ' ')
        );

        if (containsReservedWord) return;

        if (
            message.mentions.users.size > 0 ||
            message.mentions.roles.size > 0 ||
            message.mentions.everyone
        ) return;

        if (/^\d+$/.test(message.content)) return;

        try {
            const currentShop = await Shop.findOne({ channelId: message.channel.id });
            if (!currentShop) return;

            const isOwner = message.author.id === currentShop.ownerId;
            const isPartner = currentShop.partners.includes(message.author.id);

            if (!isOwner && !isPartner) return;

            if (currentShop.statusSend === "disabled") return;

            let userShops = await Shop.find({
                $or: [
                    { ownerId: message.author.id },
                    { partners: message.author.id }
                ],
                channelId: { $ne: message.channel.id },
                statusSend: "active"
            });

            // ★★★ التعديل المطلوب ★★★
            // فلترة المتاجر بحيث تكون فقط من نفس السيرفر
            userShops = userShops.filter(shop => shop.guildId === message.guild.id);

            if (userShops.length === 0) return;

            const rows = [];
            let currentRow = new ActionRowBuilder();
            
            for (let [index, shop] of userShops.entries()) {
                let channelName = message.channel.name;
                try {
                    const channel = await message.guild.channels.fetch(shop.channelId);
                    if (channel) channelName = channel.name;
                } catch (err) {
                    console.error(`❌ ماقدرتش اجيب القناة: ${shop.channelId}`);
                }

                const button = new ButtonBuilder()
                    .setCustomId(`send_shop_message:${shop.channelId}:${message.id}`)
                    .setLabel(channelName)
                    .setStyle(ButtonStyle.Secondary);

                currentRow.addComponents(button);

                if ((index + 1) % 5 === 0 || index === userShops.length - 1) {
                    rows.push(currentRow);
                    currentRow = new ActionRowBuilder();
                }
            }

            const allShopsRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`send_all_shops:${message.id}`)
                    .setLabel("إرســال لــكــل الــمــتــاجــر")
                    .setStyle(ButtonStyle.Success)
            );

            const embed = new EmbedBuilder()
                .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .setDescription("**<a:hox_star_light:1326824621722435655> لــو تــريــد ارســال نــفــس رســالــة الــي مــتــجــر مــن مــتــاجــرك اخــتــار الــمــتــجــر <a:hox_star_light:1326824621722435655> **")
                .setFooter({ text: "Dev By : Hox Devs" });

            const replyMessage = await message.reply({
                content: `${message.author}`,
                embeds: [embed],
                components: [...rows, allShopsRow]
            });

            setTimeout(async () => {
                try {
                    await replyMessage.delete();
                } catch (error) {
                    console.error('Error deleting message:', error);
                }
            }, 10000);

        } catch (error) {
            console.error('Error in messageCreate event:', error);
        }
    }
};
