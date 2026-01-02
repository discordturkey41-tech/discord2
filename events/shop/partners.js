const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Shop = require('../../Mangodb/shop.js');
const Setup = require("../../Mangodb/setup.js");

module.exports = {
    name: "interactionCreate",
    async execute(client, interaction) {
        if (!interaction.isButton()) return;

        // معالجة أزرار عرض الشركاء
        if (interaction.customId === 'current_partners' || interaction.customId === 'removed_partners') {
            const channelId = interaction.message.embeds[0].fields.find(f => f.name === "الــمــتــجــر").value.match(/\d+/)[0];
            const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
            const setupData = await Setup.findOne({ guildId: interaction.guild.id });

            if (!channel) {
                return interaction.reply({
                    content: "**❌ هــذا الــمــتــجــر غــيــر مــوجــود**",
                    ephemeral: true
                });
            }

            const shopData = await Shop.findOne({ 
                guildId: interaction.guild.id, 
                channelId: channel.id 
            });

            if (!shopData) {
                return interaction.reply({
                    content: "**❌ لا تــوجــد بــيــانــات لــهــذا الــمــتــجــر**",
                    ephemeral: true
                });
            }

            const isCurrent = interaction.customId === 'current_partners';
            const partners = isCurrent ? 
                shopData.partners : 
                (shopData.partnersData?.filter(p => !p.isActive).map(p => p.userId) || []);

            // إذا لم يكن هناك شركاء
            if (partners.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle(isCurrent ? 'الــشــركــاء الــحــالــيــيــن' : 'الــشــركــاء الــســابــقــيــن')
                    .setDescription(`**❌ لا يــوجــد ${isCurrent ? 'شــركــاء حــالــيــن' : 'شــركــاء ســابــقــيــن'} فــي هــذا الــمــتــجــر**`)
                    .setFooter({ 
                        text: "Dev By Hox Devs", 
                        iconURL: interaction.guild.iconURL() || undefined 
                    });

                if (setupData?.line) {
                    embed.setImage(setupData.line);
                }

                return interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            }

            // إنشاء أزرار للشركاء (5 أزرار في كل صف)
            const rows = [];
            let currentRow = new ActionRowBuilder();
            
            for (let i = 0; i < Math.min(partners.length, 25); i++) {
                const partnerId = partners[i];
                
                try {
                    const member = await interaction.guild.members.fetch(partnerId);
                    const displayName = member.displayName.length > 15 ? member.user.username : member.displayName;
                    
                    currentRow.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`partner_${partnerId}`)
                            .setLabel(displayName.slice(0, 15))
                            .setStyle(ButtonStyle.Secondary)
                    );
                } catch (error) {
                    currentRow.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`partner_${partnerId}`)
                            .setLabel(`غــيــر مــتــاح (${partnerId.slice(0, 10)}...)`)
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );
                }

                // عند اكتمال 5 أزرار في الصف، نضيف صف جديد
                if (currentRow.components.length === 5 || i === partners.length - 1) {
                    rows.push(currentRow);
                    currentRow = new ActionRowBuilder();
                }
            }

            const partnersEmbed = new EmbedBuilder()
                .setTitle(isCurrent ? 'الــشــركــاء الــحــالــيــيــن' : 'الــشــركــاء الــســابــقــيــن')
                .setDescription(isCurrent ? 
                    'قــائــمــة بــجــمــيــع الــشــركــاء الــمــضــافــيــن حــالــيــاً للــمــتــجــر' : 
                    'قــائــمــة بــجــمــيــع الــشــركــاء الــذيــن تــمــت إزالــتــهــم مــن الــمــتــجــر')
                .setFooter({ 
                    text: `Dev By Hox Devs`, 
                    iconURL: interaction.guild.iconURL() || undefined 
                });

            if (setupData?.line) {
                partnersEmbed.setImage(setupData.line);
            }

            await interaction.update({
                embeds: [partnersEmbed],
                components: rows
            });
        }

        // معالجة عرض تفاصيل الشريك
        if (interaction.customId.startsWith('partner_')) {
            const partnerId = interaction.customId.split('_')[1];
            const channelId = interaction.message.embeds[0].fields.find(f => f.name === "الــمــتــجــر")?.value.match(/\d+/)?.[0] || interaction.channelId;
            
            const shopData = await Shop.findOne({ 
                guildId: interaction.guild.id, 
                channelId: channelId 
            });

            const partnerData = shopData.partnersData?.find(p => p.userId === partnerId);
            const setupData = await Setup.findOne({ guildId: interaction.guild.id });

            try {
                const member = await interaction.guild.members.fetch(partnerId);
                const displayName = member.displayName.length > 32 ? member.user.username : member.displayName;
                
                // تحديد آخر عملية للشريك
                const lastAction = partnerData?.isActive ? 'added' : 'removed';
                const actionTime = partnerData?.isActive ? partnerData.addedAt : partnerData?.removedAt;
                const actionBy = partnerData?.isActive ? partnerData.addedBy : partnerData?.removedBy;

                const embed = new EmbedBuilder()
                    .setTitle(`تــفــاصــيــل الــشــريــك ${displayName}`)
                    .setThumbnail(member.user.displayAvatarURL())
                    .addFields(
                        { name: "آخـــر حــالــة", value: lastAction === 'added' ? "مــضــاف حــالــيــاً" : "مــزال حــالــيــاً", inline: true },
                        { name: "تــاريــخ آخــر عــمــلــيــة", value: actionTime ? `<t:${Math.floor(new Date(actionTime).getTime() / 1000)}:R>` : "غــيــر مــعــروف", inline: true },
                        { name: "تــمــت الــعــمــلــيــة بــواســطــة", value: actionBy ? `<@${actionBy}>` : "غــيــر مــعــروف", inline: true }
                    )
                    .setFooter({ 
                        text: "Dev By Hox Devs", 
                        iconURL: interaction.guild.iconURL() || undefined 
                    });

                if (setupData?.line) {
                    embed.setImage(setupData.line);
                }

                await interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            } catch (error) {
                await interaction.reply({
                    content: "**❌ حــدث خــطــأ أثــنــاء جــلــب بــيــانــات الــشــريــك**",
                    ephemeral: true
                });
            }
        }
    }
};