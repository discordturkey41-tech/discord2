const { 
  ApplicationCommandOptionType, 
  EmbedBuilder, 
  PermissionFlagsBits,
} = require("discord.js");
const Prefix = require("../../Mangodb/prefix.js");

module.exports = {
  name: "setup-prefix",
  description: "إعــداد الــبــريــفــكــســات الــخــاصــة بــالأوامــر",
  default_member_permissions: PermissionFlagsBits.Administrator,
  options: [
    { 
      name: "action", 
      description: "اخــتــر الــعــمــلــيــة الــتــي تــريــدهــا", 
      type: ApplicationCommandOptionType.String, 
      required: true,
      choices: [
        { name: "اضــافــة كــلــمــة", value: "add" },
        { name: "ازالــة كــلــمــة", value: "remove" },
        { name: "عــرض الــكــلــمــات", value: "show" }
      ]
    },
    { 
      name: "command", 
      description: "اخــتــر الأمــر الــذي تــريــد تــعــديــلــه", 
      type: ApplicationCommandOptionType.String, 
      required: false,
      choices: [
        { name: "mention-shop", value: "mentionShop" },
        { name: "add-data-shop", value: "addDataShop" },
        { name: "create-shop", value: "createShop" },
        { name: "warn-shop", value: "warnShop" },
        { name: "unwarn-shop", value: "unwarnShop" },
        { name: "warns-shop", value: "warnsShop" },
        { name: "disable-shop", value: "disableShop" },
        { name: "active-shop", value: "activeShop" },
        { name: "delete-shop", value: "deleteShop" }
      ]
    },
    { 
      name: "word", 
      description: "الــكــلــمــة الــتــي تــريــد اضــافــتــهــا أو ازالــتــهــا", 
      type: ApplicationCommandOptionType.String, 
      required: false 
    }
  ],

  async execute(client, interaction) {
    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.reply({
        content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج صـلاحـيــة Administrator**`,
        ephemeral: true,
      });
    }

    const action = interaction.options.getString("action");
    const command = interaction.options.getString("command");
    const word = interaction.options.getString("word");

    const existingData = await Prefix.findOne({ guildId: interaction.guild.id }) || {};

    // ===== إضافة كلمة =====
    if (action === "add") {
      if (!command) {
        return interaction.reply({
          content: "**❌ يــجــب اخــتــيــار أمــر لإضــافــة كــلــمــة لــه**",
          ephemeral: true
        });
      }

      if (!word) {
        return interaction.reply({
          content: "**❌ يــجــب عــلــيــك ادخــال كــلــمــة لــاضــافــتــهــا**",
          ephemeral: true
        });
      }

      // التأكد من أن القيمة نصية وليست null
      const currentValue = existingData[command] || "";
      const currentWords = currentValue ? currentValue.split(',') : [];
      
      if (currentWords.includes(word)) {
        return interaction.reply({
          content: "**❌ لا يــمــكــنــك تــكــرار الــكــلــمــة**",
          ephemeral: true
        });
      }

      currentWords.push(word);
      existingData[command] = currentWords.join(',');

      await Prefix.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { [command]: existingData[command] },
        { upsert: true, new: true }
      );

      return interaction.reply({
        content: `**✅ تــم اضــافــة الــكــلــمــة \`${word}\` لأمــر \`${command}\` بــنــجــاح**`,
        ephemeral: true
      });
    }

    // ===== إزالة كلمة =====
    else if (action === "remove") {
      if (!command) {
        return interaction.reply({
          content: "**❌ يــجــب اخــتــيــار أمــر لإزالــة كــلــمــة مــنــه**",
          ephemeral: true
        });
      }

      if (!word) {
        return interaction.reply({
          content: "**❌ يــجــب عــلــيــك ادخــال كــلــمــة لــازالــتــهــا**",
          ephemeral: true
        });
      }

      // التأكد من أن القيمة نصية وليست null
      const currentValue = existingData[command] || "";
      const currentWords = currentValue ? currentValue.split(',') : [];
      
      if (!currentWords.includes(word)) {
        return interaction.reply({
          content: "**❌ الــكــلــمــة غــيــر مــوجــودة**",
          ephemeral: true
        });
      }

      const updatedWords = currentWords.filter(w => w !== word);
      existingData[command] = updatedWords.length > 0 ? updatedWords.join(',') : null;

      await Prefix.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { [command]: existingData[command] },
        { upsert: true, new: true }
      );

      return interaction.reply({
        content: `**✅ تــم ازالــة الــكــلــمــة \`${word}\` مــن أمــر \`${command}\` بــنــجــاح**`,
        ephemeral: true
      });
    }

    // ===== عرض الكلمات =====
    else if (action === "show") {
      if (command) {
        // لو اختار أمر معين
        const currentValue = existingData[command] || "";
        const words = currentValue ? currentValue.split(',') : [];

        const embed = new EmbedBuilder()
          .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
          .setTitle(` **الــكــلــمــات للأمــر \`${command}\`**`)
          .setDescription(
            words.length > 0
              ? words.map(w => `\`${w}\``).join(', ')
              : "**❌ لــم يــتــم اضــافــة أي كــلــمــات لــهــذا الأمــر**"
          )
          .setThumbnail(client.user.displayAvatarURL())
          .setFooter({ text: "Dev By Hox Devs", iconURL: client.user.displayAvatarURL() })
          .setTimestamp()
          .setColor("#0099FF");

        return interaction.reply({ embeds: [embed], ephemeral: true });

      } else {
        // لو ما اختارش → عرض الكل
        const embedFields = [];
        
        // جميع الأوامر المحتملة
        const allCommands = [
          "mentionShop", "addDataShop", "createShop", "warnShop", 
          "unwarnShop", "warnsShop", "disableShop", "activeShop", "deleteShop"
        ];
        
        for (const cmd of allCommands) {
          const currentValue = existingData[cmd] || "";
          const words = currentValue ? currentValue.split(',') : [];
          
          embedFields.push({
            name: cmd,
            value: words.length > 0 ? words.map(w => `\`${w}\``).join(', ') : "لــم يــتــم الاخــتــيــار",
            inline: true
          });
        }

        const embed = new EmbedBuilder()
          .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
          .setTitle("**جــمــيــع الــبــريــفــكــســات الــمــضــافــة**")
          .addFields(embedFields)
          .setThumbnail(client.user.displayAvatarURL())
          .setFooter({ text: "Dev By Hox Devs", iconURL: client.user.displayAvatarURL() })
          .setTimestamp()
          .setColor("#0099FF");

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  }
};