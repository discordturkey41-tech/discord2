// commands/set-tax.js
const Setup = require("../../Mangodb/setup.js");
const ms = require('ms');

module.exports = {
    name: "set-tax",
    description: "تـحـديـد وقـت الـضـريـبـة",
    options: [
        {
            name: "time",
            description: "الـوقـت (مثال: 5m = 5 دقائق, 2h = ساعتين, 1w = أسبوع, 1y = سنة)",
            type: 3, // STRING
            required: true,
        }
    ],

    async execute(client, interaction) {
        const timeInput = interaction.options.getString("time");

        const setupData = await Setup.findOne({ guildId: interaction.guild.id });

        if (!setupData || !setupData.shopAdmin) {
            return interaction.reply({
                content: `**الــرجــاء تــحــديــد مــســؤول مــتــاجــر مــن امــر \n/setup**`,
                ephemeral: true,
            });
        }

        if (!interaction.member.roles.cache.has(setupData.shopAdmin)) {
            return interaction.reply({
                content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج رتـبـه <@&${setupData.shopAdmin}>**`,
                ephemeral: true,
            });
        }

        // regex للتحقق من الوقت
        const regex = /^(\d+)(m|h|w|y)$/i;
        const match = timeInput.match(regex);

        if (!match) {
            return interaction.reply({
                content: `❌ صيغة غير صحيحة. استعمل: \`5m\`, \`2h\`, \`1w\`, \`1y\``,
                ephemeral: true,
            });
        }

        const value = parseInt(match[1]); // الرقم
        const unit = match[2].toLowerCase(); // الوحدة m/h/w/y

        // تحويل لميلي ثانية
        let durationMs;
        switch (unit) {
            case "m": durationMs = value * 60 * 1000; break;
            case "h": durationMs = value * 60 * 60 * 1000; break;
            case "w": durationMs = value * 7 * 24 * 60 * 60 * 1000; break;
            case "y": durationMs = value * 365 * 24 * 60 * 60 * 1000; break;
            default: durationMs = null;
        }

        if (!durationMs) {
            return interaction.reply({
                content: `❌ وحدة غير مدعومة. استعمل: m, h, w, y`,
                ephemeral: true,
            });
        }

        const now = new Date();
        
        await Setup.updateOne(
            { guildId: interaction.guild.id },
            { 
                $set: { 
                    taxTime: durationMs,
                    lastTaxDate: now // حفظ وقت الأمر كتاريخ آخر ضريبة
                } 
            }
        );

        const nextTaxDate = new Date(now.getTime() + durationMs);
        
        await interaction.reply({
            content: `**✅ تـم تـحـديـد وقـت الـضـريـبـة: **__${timeInput}__**\n**⏰ الضريبة القادمة: **__${nextTaxDate.toLocaleString('ar-SA')}__**`
        });
    }
};