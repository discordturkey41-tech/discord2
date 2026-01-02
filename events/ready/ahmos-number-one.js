const { AttachmentBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  name: "messageCreate",
  once: false,
  async execute(client, message) {
    if (message.author.bot) return;
    if (message.channel.id !== "1334256774936658052") return; // بس الروم ده

    // لو مفيش مرفقات → نخرج
    if (!message.attachments.size) return;

    const file = message.attachments.first();
    if (!file.name.endsWith(".txt")) return; // نشتغل بس على txt

    try {
      // نجيب محتوى الملف
      const res = await axios.get(file.url);
      const inputText = res.data;

      // الأحرف المستثناة
      const excluded = ["ا", "أ", "إ", "آ", "و", "د", "ذ", "ر", "ز"];

      // الرموز اللي ما نزخرفهاش
      const symbols = ["/", "\\", "`", "'", '"', ".", ",", "!", "?", ":", ";", "-", "_", "(", ")", "[", "]", "{", "}", "@", "#", "$", "%", "^", "&", "*", "+", "=", "<", ">", "|"];

      let result = "";

      for (let i = 0; i < inputText.length; i++) {
        const char = inputText[i];
        const nextChar = inputText[i + 1];

        // لو مسافة → نضيفها ونكمل
        if (char === " ") {
          result += " ";
          continue;
        }

        // لو مش حرف عربي → نضيفه زي ما هو
        if (!/[\u0600-\u06FF]/.test(char)) {
          result += char;
          continue;
        }

        // لو الحرف من الرموز الممنوعة → نضيفه زي ما هو
        if (symbols.includes(char)) {
          result += char;
          continue;
        }

        // نضيف الحرف
        result += char;

        // الشرط للمد
        if (
          i === inputText.length - 1 || // آخر حرف
          excluded.includes(char) || // مستثنى
          (nextChar && ["ا", "أ", "إ", "آ"].includes(nextChar) && char === "ل") // ل + ألف
        ) {
          continue;
        }

        result += "ــ";
      }

      // نعمل الملف الجديد
      const buffer = Buffer.from(result, "utf-8");
      const newFile = new AttachmentBuilder(buffer, { name: "decorated.txt" });

      await message.channel.send({ files: [newFile] });
    } catch (err) {
      console.error("Error processing file:", err);
      await message.reply("⚠️ حصل خطأ وأنا بعالج الملف.");
    }
  },
};
