// events/messageCreate-decoration.js
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const Setup = require("../../Mangodb/setup.js");

// الحروف العربية المتصلة (ترتبط بالحرف الذي يليها)
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
        decoratedWord += 'ــ';
      }
    }
    
    return decoratedWord;
  }).join('');
};

// الزخارف الإنجليزية 1
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

const english1Transform = (text) => {
  return text.split('').map(char => englishMap1[char] || char).join('');
};

// الزخارف الإنجليزية 2
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

const english2Transform = (text) => {
  return text.split('').map(char => englishMap2[char] || char).join('');
};

// الزخارف الإنجليزية 3
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

const english3Transform = (text) => {
  return text.split('').map(char => englishMap3[char] || char).join('');
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

module.exports = {
    name: "messageCreate",
    once: false,

    async execute(client, message) {
        if (message.author.bot) return;

        const setupData = await Setup.findOne({ guildId: message.guild.id });
        if (!setupData || !setupData.decorationRooms || setupData.decorationRooms.length === 0) return;
        if (!setupData.decorationRooms.includes(message.channel.id)) return;

        const content = message.content.trim();
        if (!content) return;

        // حذف رسالة العضو الأصلية
        try {
            await message.delete();
        } catch (error) {
            console.log('لا يمكن حذف الرسالة');
        }

        // تطبيق جميع الزخارف
        const arabicText = isArabic(content) ? arabicTransform(content) : null;
        const english1Text = isEnglish(content) ? english1Transform(content) : null;
        const english2Text = isEnglish(content) ? english2Transform(content) : null;
        const english3Text = isEnglish(content) ? english3Transform(content) : null;

        // إذا كان النص طويلاً (أكثر من 1000 حرف)، إرساله كملفات
        if (content.length > 1000) {
            const files = [];

            if (arabicText) {
                const arabicBuffer = Buffer.from(arabicText, 'utf8');
                files.push(new AttachmentBuilder(arabicBuffer, { name: 'arabic_decoration.txt' }));
            }

            if (english1Text) {
                const english1Buffer = Buffer.from(english1Text, 'utf8');
                files.push(new AttachmentBuilder(english1Buffer, { name: 'english1_decoration.txt' }));
            }

            if (english2Text) {
                const english2Buffer = Buffer.from(english2Text, 'utf8');
                files.push(new AttachmentBuilder(english2Buffer, { name: 'english2_decoration.txt' }));
            }

            if (english3Text) {
                const english3Buffer = Buffer.from(english3Text, 'utf8');
                files.push(new AttachmentBuilder(english3Buffer, { name: 'english3_decoration.txt' }));
            }

            if (files.length > 0) {
                await message.channel.send({
                    content: `**${message.author} - الــنــص طــويــل جــداً، تــم إرســالــه كــمــلــف:**`,
                    files: files
                });
            }
            return;
        }

        // إذا كان النص قصيراً، إرساله كإمبديد
        const embed = new EmbedBuilder()
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

        // إضافة الحقول حسب نوع النص
        if (arabicText) {
            embed.addFields({
                name: "الــزخــرفــة الــعــربــيــة",
                value: `\`\`\`${arabicText}\`\`\``
            });
        }

        if (english1Text) {
            embed.addFields({
                name: "الــزخــرفــة الــانــجــلــيــزيــة 1",
                value: `\`\`\`${english1Text}\`\`\``
            });
        }

        if (english2Text) {
            embed.addFields({
                name: "الــزخــرفــة الــانــجــلــيــزيــة 2",
                value: `\`\`\`${english2Text}\`\`\``
            });
        }

        if (english3Text) {
            embed.addFields({
                name: "الــزخــرفــة الــانــجــلــيــزيــة 3",
                value: `\`\`\`${english3Text}\`\`\``
            });
        }

        // إذا لم يكن هناك نص مزخرف (غير عربي ولا إنجليزي)
        if (!arabicText && !english1Text && !english2Text && !english3Text) {
            embed.setDescription("**❌ الــنــص غــيــر مــدعــوم لــلــزخــرفــة**");
        }

        await message.channel.send({
            content: `${message.author}`,
            embeds: [embed]
        });
    }
};