// events/interactionCreate.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Shop = require("../../Mangodb/shop.js");
const Types = require("../../Mangodb/types.js");
const Setup = require("../../Mangodb/setup.js");

module.exports = {
    name: "interactionCreate",
    once: false,

    async execute(client, interaction) {
        if (!interaction.isButton()) return;
        
        // معالجة زر دفع الضريبة
        if (interaction.customId.startsWith('pay_tax_')) {
            const channelId = interaction.customId.replace('pay_tax_', '');
            
            // جلب بيانات المتجر
            const shopData = await Shop.findOne({ 
                guildId: interaction.guild.id, 
                channelId: channelId 
            });
            
            if (!shopData) {
                return interaction.reply({
                    content: "**لــم يــتــم الــعــثــور عــلــى الــمــتــجــر**",
                    ephemeral: true
                });
            }
            
            // التحقق من أن المستخدم هو صاحب المتجر
            if (interaction.user.id !== shopData.ownerId) {
                return interaction.reply({
                    content: "**فــقــط صــاحــب الــمــتــجــر يــســتــطــيــع دفــع الــضــريــبــة**",
                    ephemeral: true
                });
            }
                  const owner = shopData.ownerId;
      const partners = shopData.partners;

                  if (interaction.user.id !== owner && (!partners || !partners.includes(interaction.user.id))) {
        return interaction.reply({
          content: "**هــتــدفــع لــهــم يــعــنــي الــضــريــبــة?\nيــلا انــقــلــع*",
          ephemeral: true 
        });
      }
            // التحقق إذا كانت الضريبة مدفوعة مسبقاً
            if (shopData.taxPaid === "yes") {
                return interaction.reply({
                    content: "**الــضــريــبــة مــدفــوعــة مــســبــقــاً**",
                    ephemeral: true
                });
            }
            
            // جلب إعدادات السيرفر
            const setupData = await Setup.findOne({ guildId: interaction.guild.id });
            if (!setupData) {
                return interaction.reply({
                    content: "**لــم يــتــم الــعــثــور عــلــى إعــدادات الــســيــرفــر**",
                    ephemeral: true
                });
            }
            
            // جلب نوع المتجر لمعرفة سعر الضريبة
            const type = await Types.findOne({ guildId: interaction.guild.id, name: shopData.type });
            
            if (!type || !type.tax) {
                return interaction.reply({
                    content: "**لــم يــتــم تــعــيــين ضــريــبــة لــهــذا الــنــوع مــن الــمــتــاجــر**",
                    ephemeral: true
                });
            }
            
            const price = type.tax;
            const taxs = Math.floor((price * 20) / 19 + 1);
            const bank = setupData.bank;
            
            const paymentEmbed = new EmbedBuilder()
                .setTitle("عــمــلــيــة الــتــحــويــل")
                .setAuthor({
                    name: interaction.guild.name,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setImage(setupData.line)
                .setDescription(`**<a:011:1326822363785990205> الــرجــاء الــتــحــويــل فــي اســرع وقــت لــدفــع الــضــريــبــة <a:011:1326822363785990205>**`)
                .setFooter({
                    text: "Dev By Hox Devs",
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                });

            await interaction.reply({
                embeds: [paymentEmbed],
                ephemeral: false
            });

            await interaction.followUp({
                content: `**مــعــك 5 دقــائــق للــتــحــويــل**\n\`\`\`#credit ${bank} ${taxs}\`\`\``,
                ephemeral: false
            });

            const messageCollectorFilter = (m) =>
                m.author.bot &&
                (m.content === `**:moneybag: | ${interaction.user.username}, has transferred \`$${price}\` to <@!${bank}> **` ||
                 m.content === `**ـ ${interaction.user.username}, قام بتحويل \`$${price}\` لـ <@!${bank}> ** |:moneybag:**`);

            const messageCollector = interaction.channel.createMessageCollector({
                filter: messageCollectorFilter,
                time: 300000 // 5 دقائق
            });

            messageCollector.on('collect', async () => {
                try {
                    messageCollector.stop();
                    
                    // تحديث حالة الدفع وتاريخ آخر دفع للضريبة
                    await Shop.updateOne(
                        { guildId: interaction.guild.id, channelId: channelId },
                        { 
                            $set: { 
                                lastTaxPayment: new Date(),
                                taxPaid: "yes" // تحديث حالة الدفع إلى نعم
                            } 
                        }
                    );
                    
                    // إرسال رسالة التأكيد
                    const confirmEmbed = new EmbedBuilder()
                        .setTitle("تــم دفــع الــضــريــبــة")
                        .setDescription(`**تــم دفــع ضــريــبــة الــمــتــجــر <#${channelId}> بــنــجــاح**`)
                        .setColor("#00FF00")
                        .addFields(
                            { name: "حــالــة الــدفــع", value: "✅ مــدفــوعــة", inline: true },
                            { name: "وقــت الــدفــع", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                        )
                        .setFooter({
                            text: "Dev By Hox Devs",
                            iconURL: interaction.guild.iconURL({ dynamic: true })
                        });
                    
                    await interaction.followUp({
                        embeds: [confirmEmbed],
                        ephemeral: false
                    });
                    
                    // تسجيل في اللوقات
                    if (setupData.logs) {
                        const logChannel = await client.channels.fetch(setupData.logs);
                        if (logChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setTitle("دفــع ضــريــبــة مــتــجــر")
                                .addFields(
                                    { name: "الــمــتــجــر", value: `<#${channelId}>`, inline: true },
                                    { name: "صــاحــب الــمــتــجــر", value: `<@${interaction.user.id}>`, inline: true },
                                    { name: "مــبــلــغ الــضــريــبــة", value: `${price}`, inline: true },
                                    { name: "وقــت الــدفــع", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                                    { name: "حــالــة الــدفــع", value: "✅ مــدفــوعــة", inline: true }
                                )
                                .setTimestamp();
                            
                            await logChannel.send({ embeds: [logEmbed] });
                        }
                    }
                    
                } catch (error) {
                    console.error("Error processing tax payment:", error);
                    await interaction.followUp({
                        content: "**حــدث خــطــأ أثــنــاء مــعــالــجــة الــدفــع**",
                        ephemeral: true
                    });
                }
            });

            messageCollector.on('end', (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    interaction.followUp({
                        content: "**انــتــهــى الــوقــت الــمــحــدد لــلــتــحــويــل**",
                        ephemeral: true
                    });
                }
            });
        }
    }
};