const { ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");

module.exports = {
  name: "edit-embed",
  description: "تـعـديـل إمـبـد رسـالـة مـعـيـنـة",
  options: [
    { 
      name: "message-id", 
      description: "ايـدي رسـالـة الـبـوت", 
      type: ApplicationCommandOptionType.String,
      required: true
    },
    { 
      name: "title", 
      description: "عـنوان الإمـبـد الـجـديـد", 
      type: ApplicationCommandOptionType.String,
      required: false
    },
    { 
      name: "description", 
      description: "وصـف الإمـبـد الـجـديـد", 
      type: ApplicationCommandOptionType.String,
      required: false
    },
    { 
      name: "author", 
      description: "إضـافة اسـم وصـورة الـسـيـرفـر كـ author؟", 
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [
        { name: "نعم", value: "yes" },
        { name: "لا", value: "no" },
        { name: "حذف", value: "remove" }
      ]
    },
    { 
      name: "thumbnail", 
      description: "إضـافة صـورة الـسـيـرفـر كـ thumbnail؟", 
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [
        { name: "نعم", value: "yes" },
        { name: "لا", value: "no" },
        { name: "حذف", value: "remove" }
      ]
    },
    { 
      name: "color", 
      description: "لـون الإمـبـد (HEX)", 
      type: ApplicationCommandOptionType.String,
      required: false
    },
  ],

  async execute(client, interaction) {
    try {
      const messageId = interaction.options.getString("message-id");
      const title = interaction.options.getString("title");
      const description = interaction.options.getString("description");
      const addAuthor = interaction.options.getString("author");
      const addThumbnail = interaction.options.getString("thumbnail");
      const color = interaction.options.getString("color");
      const footer = interaction.options.getString("footer");

      // التحقق إذا لم يختار المستخدم أي تعديلات
      if (!title && !description && !addAuthor && !addThumbnail && !color && !footer) {
        return interaction.reply({
          content: "**❌ انت مخترتش اي حاجة اعدل ايه يعني؟**\nيجب اختيار على الأقل خيار واحد للتعديل.",
          ephemeral: true
        });
      }

      // البحث عن الرسالة في نفس الروم
      let message;
      try {
        message = await interaction.channel.messages.fetch(messageId);
      } catch (error) {
        return interaction.reply({
          content: "**❌ لـم أعـثـر عـلـى الـرسـالـة فـي هـذا الـروم**",
          ephemeral: true
        });
      }

      // التحقق إذا كانت الرسالة من بوت آخر
      if (message.author.id !== client.user.id) {
        return interaction.reply({
          content: "**❌ لا يمكن تعديل رسالة ليست من هذا البوت**\nيمكنني تعديل رسائلي فقط.",
          ephemeral: true
        });
      }

      // التحقق من وجود إمبد في الرسالة
      if (!message.embeds || message.embeds.length === 0) {
        return interaction.reply({
          content: "**❌ هـذه الرسالة لا تحتوي على إمبد**",
          ephemeral: true
        });
      }

      // الحصول على الإمبد القديم
      const oldEmbed = message.embeds[0];
      const newEmbed = EmbedBuilder.from(oldEmbed);

      // تعديل العنوان إذا تم إدخاله
      if (title !== null) {
        newEmbed.setTitle(title);
      }

      // تعديل الوصف إذا تم إدخاله
      if (description !== null) {
        newEmbed.setDescription(description);
      }

      // تعديل اللون إذا تم إدخاله
      if (color !== null) {
        // التحقق من صحة اللون HEX
        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (hexRegex.test(color)) {
          newEmbed.setColor(color);
        } else {
          // إذا كان اللون غير صحيح، نستخدم اللون القديم
          const reply = await interaction.reply({
            content: `**⚠️ اللون ${color} غير صحيح. سيتم الاحتفاظ باللون القديم.**`,
            ephemeral: true,
            fetchReply: true
          });
          setTimeout(() => reply.delete().catch(() => {}), 5000);
        }
      }

      // معالجة author
      if (addAuthor !== null) {
        if (addAuthor === "yes") {
          newEmbed.setAuthor({
            name: interaction.guild.name,
            iconURL: interaction.guild.iconURL({ dynamic: true }) || null
          });
        } else if (addAuthor === "remove") {
          newEmbed.setAuthor(null);
        } else if (addAuthor === "no") {
          // لا نغير شيئاً، نحتفظ بالقيمة القديمة
        }
      }

      // معالجة thumbnail
      if (addThumbnail !== null) {
        if (addThumbnail === "yes") {
          newEmbed.setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 1024 }));
        } else if (addThumbnail === "remove") {
          newEmbed.setThumbnail(null);
        } else if (addThumbnail === "no") {
          // لا نغير شيئاً، نحتفظ بالقيمة القديمة
        }
      }

      // تعديل الفوتر إذا تم إدخاله
      if (footer !== null) {
        newEmbed.setFooter({
          text: footer,
          iconURL: oldEmbed.footer?.iconURL || null
        });
      }

      // تحديث الطابع الزمني
      newEmbed.setTimestamp();

      // تعديل الرسالة الأصلية بالإمبد الجديد
      await message.edit({ embeds: [newEmbed] });

      // إنشاء قائمة بالتعديلات
      const changes = [];
      if (title !== null) changes.push(`**الـعـنـوان**: ${title}`);
      if (description !== null) changes.push(`**الـوصـف**: ${description.substring(0, 50)}${description.length > 50 ? '...' : ''}`);
      if (color !== null) changes.push(`**الـلـون**: ${color}`);
      if (addAuthor === "yes") changes.push(`**تـم إضـافـة Author**`);
      if (addAuthor === "remove") changes.push(`**تـم حـذف Author**`);
      if (addThumbnail === "yes") changes.push(`**تـم إضـافـة Thumbnail**`);
      if (addThumbnail === "remove") changes.push(`**تـم حـذف Thumbnail**`);

      // رد تأكيد للمستخدم
      const successEmbed = new EmbedBuilder()
        .setColor("#00ff00")
        .setTitle("تـم تـعـديـل الإمـبـد بـنـجـاح")
        .addFields(
          { name: "الرسالة", value: `[اضغط هنا للانتقال](${message.url})` },
          { name: "التعديلات", value: changes.join('\n') || "لم يتم إجراء أي تعديلات" }
        )
        .setFooter({ text: `بواسطة: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      await interaction.reply({
        embeds: [successEmbed],
        ephemeral: true
      });

    } catch (error) {
      console.error(error);
      
      // التحقق من نوع الخطأ
      if (error.code === 50001) {
        return interaction.reply({
          content: "** لـيـس لـدي صـلاحـيـة الـوصـول إلـى هـذه الـرسـالـة**",
          ephemeral: true
        });
      } else if (error.code === 50013) {
        return interaction.reply({
          content: "** لـيـس لـدي صـلاحـيـة تـعـديـل الـرسـائـل فـي هـذا الـروم**",
          ephemeral: true
        });
      }

      return interaction.reply({
        content: "** حـدث خـطـأ أثـنـاء تـعـديـل الإمـبـد**",
        ephemeral: true
      });
    }
  },
};