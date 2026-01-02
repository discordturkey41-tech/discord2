    // File: interactionCreate.js
    const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } = require('discord.js');
    const Shop = require("../../Mangodb/shop.js");
    const path = require('path');

    // تحميل الكلمات من ملف JSON
    let words = [];
    const wordsPath = path.join(__dirname, '../../data/words.json');

    // دالة لتحميل الكلمات مع التحديث التلقائي
    function loadWords() {
        try {
            delete require.cache[require.resolve(wordsPath)];
            words = require(wordsPath);
        } catch (err) {
            console.error('خطأ في تحميل ملف الكلمات:', err);
            words = [];
        }
    }

    // تحميل الكلمات أول مرة
    loadWords();

    // تحديث الكلمات كل ثانية
    setInterval(() => {
        loadWords();
    }, 1000);

    // دالة التشفير للكلمات المحددة فقط
    function tashfirProcess(inputText) {
        const symbols = ["/", "\\", "`", "'", '"', ".", ",", "!", "?", ":", ";", "-", "_", "(", ")", "[", "]", "{", "}", "@", "#", "$", "%", "^", "&", "*", "+", "=", "<", ">", "|"];

        // دالة لتحويل كلمة واحدة
        function encryptWord(word) {
            // تنظيف الكلمة من علامات الترقيم للتحقق
            const cleanWord = word.replace(/[^\u0600-\u06FF]/g, '');
            
            // التحقق إذا كانت الكلمة موجودة في القائمة
            const isEncrypted = words.some(w => {
                const cleanW = w.replace(/[^\u0600-\u06FF]/g, '');
                return cleanWord === cleanW;
            });

            // إذا كانت الكلمة ليست للتشفير، نرجعها كما هي
            if (!isEncrypted) {
                return word;
            }

            // إذا كانت الكلمة للتشفير، نضع العلامة في داخل الكلمة (في النهاية الداخلية)
            // نأخذ الكلمة بدون علامات ترقيم في النهاية
            const mainPart = word.replace(/[^\u0600-\u06FF]*$/, '');
            const punctuation = word.slice(mainPart.length);
            
            // نبحث عن مكان وضع العلامة داخل الكلمة
            if (mainPart.length <= 2) {
                // إذا كانت الكلمة قصيرة (2 حرف أو أقل)، نضع العلامة في المنتصف
                const midIndex = Math.floor(mainPart.length / 2);
                const encrypted = mainPart.slice(0, midIndex) + "ـ,ـ" + mainPart.slice(midIndex);
                return encrypted + punctuation;
            } else {
                // إذا كانت الكلمة طويلة، نضع العلامة قبل الحرفين الأخيرين
                // مثال: "نيترو" → "نيتـ,ـرو" (العلامة قبل "رو")
                const splitIndex = mainPart.length - 2;
                const encrypted = mainPart.slice(0, splitIndex) + "ـ,ـ" + mainPart.slice(splitIndex);
                return encrypted + punctuation;
            }
        }

        // تقسيم النص إلى كلمات
        const wordsArray = inputText.split(/(\s+)/);
        
        let result = "";
        
        for (const word of wordsArray) {
            // إذا كان نص عادي (ليس مسافات فقط)
            if (word.trim()) {
                result += encryptWord(word);
            } else {
                // إضافة المسافات كما هي
                result += word;
            }
        }

        return result;
    }

    module.exports = {
        name: "interactionCreate",
        once: false,
        async execute(client, i) {
            if (!i.isButton()) return;

            if (i.customId === "tachfier") {
                // تحديث الكلمات قبل كل استخدام
                loadWords();

                const modal = new ModalBuilder()
                    .setCustomId('tachfier2')
                    .setTitle('الـتـشـفـيـر');

                const textInput = new TextInputBuilder()
                    .setCustomId('text')
                    .setLabel('الـرسالـة')
                    .setStyle(TextInputStyle.Paragraph)
                    .setMaxLength(1000)
                    .setPlaceholder('اكتب رسالتك هنا')
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(textInput));
                await i.showModal(modal);

                try {
                    const submitted = await i.awaitModalSubmit({
                        filter: (modalInt) => modalInt.customId === 'tachfier2' && modalInt.user.id === i.user.id,
                        time: 60000
                    });

                    let msg = submitted.fields.getTextInputValue('text');

                    const finalMsg = tashfirProcess(msg);

                    await submitted.reply({
                        content: `**الـرسـالـة بـعـد الـتـشـفـيـر:**`,
                        ephemeral: true
                    });

                    await submitted.followUp({
                        content: finalMsg,
                        ephemeral: true
                    });

                } catch (err) {
                    console.error(err);
                }
            }
        }
    };