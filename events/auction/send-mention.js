const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const Auction = require('../../Mangodb/auction.js');
const Setup = require('../../Mangodb/setup.js');

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(client, interaction) {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;
    if (!interaction.guild) return;

    const guildId = interaction.guild.id;

    if (interaction.isButton() && interaction.customId === "send_mention") {
      try {
        // جلب بيانات المزاد والإعدادات
        const auction = await Auction.findOne({ 
          channelId: interaction.channelId,
          active: true 
        });
        
        const setup = await Setup.findOne({ guildId: interaction.guild.id });
        
        if (!auction) {
          return interaction.reply({ 
            content: "**لا يــوجــد مــزاد نــشــط فــي هــذا الــروم**", 
            ephemeral: true 
          });
        }

        // التحقق من صلاحية المستخدم
        if (interaction.user.id !== auction.ownerId && !interaction.member.roles.cache.has(setup.auctionAdmin)) {
          return interaction.reply({ 
            content: "**أنـت لـسـت صـاحـب الـمـزاد أو مـسـؤول الـمـزاد\nهــتـرسـل مـنـشـن لـيـه؟**", 
            ephemeral: true 
          });
        }

        // التحقق من الوقت المنقضي منذ آخر منشن
        const now = Date.now();
        const timeSinceLastMention = now - auction.lastMentionTime;
        const cooldownTime = 10 * 60 * 1000; // 10 دقائق بالمللي ثانية

        if (timeSinceLastMention < cooldownTime) {
          const remainingTime = cooldownTime - timeSinceLastMention;
          const remainingMinutes = Math.floor(remainingTime / 60000);
          const remainingSeconds = Math.floor((remainingTime % 60000) / 1000);
          
          return interaction.reply({ 
            content: `**أنـتـظـر الـوقـت الـمـتـبـقـي: ${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}**`, 
            ephemeral: true 
          });
        }

        // إنشاء إيمبد لعرض عدد المنشنات المتاحة
        const mentionEmbed = new EmbedBuilder()
          .setTitle("إرســال مــنــشــن")
          .setColor(0x0099FF)
          .addFields(
            { name: "Everyone", value: `${auction.everyoneMentions}`, inline: true },
            { name: "Here", value: `${auction.hereMentions}`, inline: true },
            { name: "Auction Mention", value: `${auction.auctionMentions}`, inline: true }
          )
          .setFooter({ text: "اختر نوع المنشن الذي تريد إرساله" });

        // إنشاء أزرار للمنشنات
        const mentionRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('mention_everyone')
              .setLabel('Everyone')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(auction.everyoneMentions <= 0),
            new ButtonBuilder()
              .setCustomId('mention_here')
              .setLabel('Here')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(auction.hereMentions <= 0),
            new ButtonBuilder()
              .setCustomId('mention_auction')
              .setLabel('Auction Mention')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(auction.auctionMentions <= 0 || !setup.auctionMention)
          );

        // إرسال الرسالة مع الإيمبد والأزرار
        await interaction.reply({ 
          embeds: [mentionEmbed], 
          components: [mentionRow], 
          ephemeral: true 
        });

        // معالج اختيار نوع المنشن
        const response = await interaction.fetchReply();
        const mentionFilter = m => m.user.id === interaction.user.id;
        const mentionCollector = response.createMessageComponentCollector({ 
          filter: mentionFilter, 
          time: 30000 
        });

        mentionCollector.on('collect', async mi => {
          try {
            let mentionType = mi.customId.replace('mention_', '');
            let mentionContent = '';
            let hasMentionsLeft = false;

            // جلب أحدث بيانات المزاد
            const currentAuction = await Auction.findById(auction._id);
            
            // التحقق من وجود منشنات متاحة
            switch(mentionType) {
              case 'everyone':
                if (currentAuction.everyoneMentions > 0) {
                  mentionContent = '@everyone';
                  currentAuction.everyoneMentions -= 1;
                  hasMentionsLeft = true;
                }
                break;
              case 'here':
                if (currentAuction.hereMentions > 0) {
                  mentionContent = '@here';
                  currentAuction.hereMentions -= 1;
                  hasMentionsLeft = true;
                }
                break;
              case 'auction':
                if (currentAuction.auctionMentions > 0 && setup.auctionMention) {
                  mentionContent = `<@&${setup.auctionMention}>`;
                  currentAuction.auctionMentions -= 1;
                  hasMentionsLeft = true;
                }
                break;
            }

            if (!hasMentionsLeft) {
              return mi.reply({ 
                content: "**الـمـنـشـنـات خـلـصـت أصـلاً؟ يـلا روح غـطـيـهـا**", 
                ephemeral: true 
              });
            }

            // تحديث وقت آخر منشن
            currentAuction.lastMentionTime = Date.now();
            await currentAuction.save();

            // إرسال المنشن
            await interaction.channel.send({ content: mentionContent });
            
            await mi.update({ 
              content: "**تـم إرسـال الـمـنـشـن بـنـجـاح**", 
              embeds: [], 
              components: [] 
            });
          } catch (error) {
            console.error("Error sending mention:", error);
            await mi.reply({ 
              content: "**حـدث خـطـأ أثـنـاء إرسـال الـمـنـشـن**", 
              ephemeral: true 
            });
          }
        });

        mentionCollector.on('end', async () => {
          try {
            await response.edit({ components: [] });
          } catch (error) {
            console.error("Error clearing components:", error);
          }
        });

      } catch (error) {
        console.error("Error in mention button:", error);
        await interaction.reply({ 
          content: "**حـدث خـطـأ أثـنـاء معـالـجـة طـلـبـك**", 
          ephemeral: true 
        });
      }
    }
    
  }
};