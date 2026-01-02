// events/messageCreate.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Setup = require("../../Mangodb/setup.js");

module.exports = {
    name: "messageCreate",
    once: false,

    async execute(client, message) {
        if (message.author.bot) return;

        const setupData = await Setup.findOne({ guildId: message.guild.id });
        if (!setupData || !setupData.taxRooms || setupData.taxRooms.length === 0) return;
        if (!setupData.taxRooms.includes(message.channel.id)) return;

        const content = message.content.trim();

        let number;
        let originalInput = content;

        if (/^\d+$/.test(content)) {
            number = BigInt(content);
            const numValue = Number(content);
            if (numValue >= 1000000) {
                originalInput = Math.floor(numValue / 1000000) + 'M';
            } else if (numValue >= 1000) {
                originalInput = Math.floor(numValue / 1000) + 'K';
            }
        } else if (/^\d+\.?\d*[BTQKMbtqkm]$/.test(content)) {
            const match = content.match(/^(\d+\.?\d*)([BTQKMbtqkm])$/);
            const value = parseFloat(match[1]);
            const unit = match[2].toLowerCase();

            if (unit === 'k') number = BigInt(Math.floor(value * 1_000));
            else if (unit === 'm') number = BigInt(Math.floor(value * 1_000_000));
            else if (unit === 'b') number = BigInt(Math.floor(value * 1_000_000_000));
            else if (unit === 't') number = BigInt(Math.floor(value * 1_000_000_000_000));
            else if (unit === 'q') number = BigInt(Math.floor(value * 1_000_000_000_000_000));
        } else {
            // هنا الخطأ → نمسح رسالة العضو + رسالة التحذير بعد 10 ثواني
            const warning = await message.channel.send({
                content: `**يــعــنــي انــت ســايــب الــشــات وجــي تــتــكــلــم هــنــا\n يــلا انــقــلــع *${message.author}**`
            });

            setTimeout(async () => {
                try { await message.delete(); } catch (e) {}
                try { await warning.delete(); } catch (e) {}
            }, 10000);

            return;
        }

        const num = number > BigInt(Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : Number(number);

        const tax = Math.floor(num * 20 / 19 + 1);
        const tax2 = Math.floor(num * 20 / 19 + 1 - num);
        const tax3 = Math.floor(tax2 * 20 / 19 + 1);
        const totalWithBrokerTax = Math.floor(tax2 + tax3 + num);

        const formatNumberNoCommas = (n) => n.toString();

        const embed = new EmbedBuilder()
            .setTitle("حــســاب الــضــريــبــة")
            .addFields(
                { name: "الــمــبــلــغ", value: `\`\`\`${originalInput}\`\`\``, inline: true },
                { name: "ضــريــبــة بــرو بــوت", value: `\`\`\`${formatNumberNoCommas(tax)}\`\`\``, inline: true },
                { name: "الــمــبــلــغ + الــضــريــبــة", value: `\`\`\`${formatNumberNoCommas(num + tax2)}\`\`\``, inline: true },
                { name: "نــســبــة الــوســيــط", value: `\`\`\`${formatNumberNoCommas(tax2)}\`\`\``, inline: true },
                { name: "الــضــريــبــة كــامــلــة مــع نــســبــة الــوســيــط", value: `\`\`\`${formatNumberNoCommas(totalWithBrokerTax)}\`\`\``, inline: true }
            )
            .setImage(setupData.line)
            .setAuthor({
                name: message.guild.name,
                iconURL: message.guild.iconURL({ dynamic: true })
            })
            .setFooter({
                text: "Dev By Hox Devs",
                iconURL: message.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                .setCustomId(`copytax_${message.author.id}_${formatNumberNoCommas(num + tax2)}`)
                    .setLabel("نــســخ الــضــريــبــة")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("<a:009:1326822419482284123>")
            );

        await message.channel.send({
            content: `${message.author}`,
            embeds: [embed],
            components: [row]
        });
    }
};
