const { ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");

const Prices = require("../../Mangodb/prices.js");

module.exports = {

  name: "setup-prices",

  description: "تــغــيــر الاســعــار",

  options: [

    { name: "remove-warn-price", description: "ســعــر ازالــة الــتــحــذيــر", type: ApplicationCommandOptionType.Number },

    { name: "change-name-price", description: "ســعــر تــغــيــر اســم مــتــجــر", type: ApplicationCommandOptionType.Number },

    { name: "change-owner-price", description: "ســعــر تــغــيــر اونــر مــتــجــر", type: ApplicationCommandOptionType.Number },

    { name: "add-partners-price", description: "ســعــر اضــافــة شــريــك", type: ApplicationCommandOptionType.Number },

    { name: "remove-partners-price", description: "ســعــر ازالــة شــريــك", type: ApplicationCommandOptionType.Number },

    { name: "change-shape-price", description: "ســعــر تــغــيــر شــكــل", type: ApplicationCommandOptionType.Number },

    { name: "order-every-price", description: "ســعــر مــنــشــن ايــفــري طــلــبــات", type: ApplicationCommandOptionType.Number },

    { name: "order-here-price", description: "ســعــر مــنــشــن هــيــر طــلــبــات", type: ApplicationCommandOptionType.Number },

    { name: "order-mention-price", description: "ســعــر مــنــشــن طــلــبــات", type: ApplicationCommandOptionType.Number },

    { name: "auction-every-price", description: "ســعــر مــنــشــن ايــفــري مــزاد", type: ApplicationCommandOptionType.Number },

    { name: "auction-here-price", description: "ســعــر مــنــشــن هــيــر مــزاد", type: ApplicationCommandOptionType.Number },

    { name: "auction-mention-price", description: "ســعــر مــنــشــن مــزاد", type: ApplicationCommandOptionType.Number },

    { name: "everyone-price", description: "ســعــر شــراء مــنــشــن ايــفــري", type: ApplicationCommandOptionType.Number },

    { name: "here-price", description: "ســعــر شــراء مــنــشــن هــيــر", type: ApplicationCommandOptionType.Number },

    { name: "shop-mention-price", description: "ســعــر شــراء مــنــشــن مــتــجــر", type: ApplicationCommandOptionType.Number },

  ],

  async execute(client, interaction) {


    
        if (!interaction.member.permissions.has("Administrator")) {
  return interaction.reply({
    content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج صـلاحـيــة Administrator**`,
    ephemeral: true,
  });
}
    const guildId = interaction.guild.id;

    let data = await Prices.findOne({ guildId });

    

    if (!data) {

      data = new Prices({ guildId });

    }

    const embedFields = [];

    const updatedFields = [];

    

    // خريطة تحويل أسماء الخيارات إلى أسماء الحقول في الموديل

    const optionToFieldMap = {

      "remove-warn-price": "removeWarnPrice",

      "change-name-price": "changeNamePrice",

      "change-owner-price": "changeOwnerPrice",

      "add-partners-price": "addPartnersPrice",

      "remove-partners-price": "removePartnersPrice",

      "change-shape-price": "changeShapePrice",

      "order-every-price": "orderEveryPrice",

      "order-here-price": "orderHerePrice",

      "order-mention-price": "orderMentionPrice",

      "auction-every-price": "auctionEveryPrice",

      "auction-here-price": "auctionHerePrice",

      "auction-mention-price": "auctionMentionPrice",

      "everyone-price": "everyonePrice",

      "here-price": "herePrice",

      "shop-mention-price": "shopMentionPrice"

    };

    // نمر على جميع الخيارات المتاحة

    for (const option of this.options) {

      const fieldName = optionToFieldMap[option.name];

      

      if (!fieldName) continue;

      

      const newValue = interaction.options.getNumber(option.name);

      

      // إذا تم تقديم قيمة جديدة لهذا الخيار

      if (newValue !== null) {

        data[fieldName] = newValue;

        updatedFields.push(fieldName);

        

        embedFields.push({

          name: option.description,

          value: `\`${newValue}\` الــســعــر:`,

          inline: true,

        });

      }

      // إذا لم يتم تقديم قيمة جديدة ولكن هناك قيمة سابقة

      else if (data[fieldName] !== undefined && data[fieldName] !== null) {

        embedFields.push({

          name: option.description,

          value: `\`${data[fieldName]}\` الــســعــر: (حــفــظ ســابــق)`,

          inline: true,

        });

      }

    }

    if (updatedFields.length === 0) {

      return await interaction.editReply({

        content: "❌ لــم تــقــم بــتــحــديــث أي مــن الأســعــار",

        ephemeral: true

      });

    }

    try {

      await data.save();

      const embed = new EmbedBuilder()

        .setAuthor({

          name: client.user.username,

          iconURL: client.user.displayAvatarURL(),

        })

        .setTitle("تــعــديــل الأســعــار")

        .setDescription(`تــم تــحــديــث ${updatedFields.length} مــن الأســعــار`)

        .addFields(embedFields)

        .setThumbnail(client.user.displayAvatarURL())

        .setFooter({

          text: "Dev By Hox Devs",

          iconURL: interaction.guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL(),

        })

        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {

      console.error("Error saving prices:", error);

      await interaction.reply({

        content: "❌ حــدث خــطــأ أثــنــاء حــفــظ الأســعــار",

        ephemeral: true

      });

    }

  }

};