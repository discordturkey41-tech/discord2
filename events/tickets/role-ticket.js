const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, PermissionsBitField } = require("discord.js");
const Setup = require("../../Mangodb/setup.js");
const Roles = require("../../Mangodb/roles.js");
const Ticket = require("../../Mangodb/tickets.js"); 
const SaleState = require('../../Mangodb/saleState.js');

// Maps لمنع الشراء المزدوج (نفس المابس المستخدمة في الأعلى)
const activePurchases = new Map();
const purchaseCollectors = new Map();

module.exports = {
    name: "interactionCreate",
    once: false,

    async execute(client, interaction) {
        if (!interaction.isButton()) return;
        if (!interaction.guild) return;
        const guildId = interaction.guild.id;

        // فـتـح تـذكـرة شـراء رتـب
        if (interaction.customId === "r654ole_b421u6y") {
            // التحقق من حالة بيع الرتب
            const saleState = await SaleState.findOne({
                guildId: interaction.guild.id,
                type: "role_sale"
            });
            
            if (saleState?.state === "disable") {
                return interaction.reply({
                    content: "**بــيــع الــرتــب مــعــطــل حالياً**",
                    ephemeral: true
                });
            }

            // التحقق من وجود عملية شراء نشطة
            if (activePurchases.has(interaction.user.id)) {
                return interaction.reply({
                    content: "**⚠️ لــديــك عــمــلــيــة شــراء نــشــطــة بالفــعــل، الــرجــاء الانتــظــار حــتــى تــنــتــهــي**",
                    ephemeral: true
                });
            }

            const existingTicket = await Ticket.findOne({ 
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                closed: false,
                ticketType: "role"
            });

            if (existingTicket) {
                try {
                    const channel = await interaction.guild.channels.fetch(existingTicket.channelId);
                    const cancelButton = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('astacancel-role-ticket')
                            .setLabel('الــغــاء')
                            .setStyle(ButtonStyle.Danger)
                    );

                    return interaction.reply({
                        ephemeral: true,
                        content: `**عــنــدك تــذكــرة مــفــتــوحــة :${channel}\n-# لو عــنــدك مــشــكــلــة اســتــعــمــل زر الــغــاء ســوف يــتــم حــل جــمــيــع مــشــاكــلــك**`,
                        components: [cancelButton],
                    });
                } catch (e) {
                    await Ticket.deleteOne({ _id: existingTicket._id });
                }
            }

            const setupData = await Setup.findOne({ guildId: interaction.guild.id });
            if (!setupData?.roleTicket) {
                return interaction.reply({
                    content: `**❌ | يـرجـي تـحـديـد كـاتـاغـوري الـتـكـتـات عـبـر أمـر __/setup__**`,
                    ephemeral: true
                });
            }

            const roles = await Roles.find({ guildId }) || [];

            if (!roles || roles.length === 0) {
                return interaction.reply({
                    content: `**لا يــوجــد رتــب مــتــاحــة لــلــشــراء، الــرجــاء مــراســلــة الادارة**`,
                    ephemeral: true
                });
            }

            // تصفية الرتب المعطلة
            const saleStateData = await SaleState.findOne({
                guildId: interaction.guild.id,
                type: "role_sale"
            });
            
            const availableRoles = roles.filter(role => 
                !saleStateData?.disabledRoles?.includes(role.roleId)
            );

            if (availableRoles.length === 0) {
                return interaction.reply({
                    content: "**جــمــيــع الــرتــب مــعــطــلــة حالياً**",
                    ephemeral: true
                });
            }

            const category = await client.channels.fetch(setupData.roleTicket).catch(() => null);
            if (!category) {
                return interaction.reply({
                    content: `**❌ | كـاتـاغـوري الـتـكـتـات مـحـذوفـة **`,
                    ephemeral: true
                });
            }

            const ticket = await interaction.guild.channels.create({
                name: `Buy-Role-${interaction.user.username}`,
                type: 0,
                parent: category,
                topic: `Ticket Owner: ${interaction.user.id}`,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] }
                ]
            });

            const newTicket = new Ticket({
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                channelId: ticket.id,
                ticketType: 'role',
                closed: false,
                createdAt: new Date()
            });
            await newTicket.save();

            if (setupData.roleAdmin) {
                await ticket.permissionOverwrites.edit(setupData.roleAdmin, { ViewChannel: true });
            }

            const embed = new EmbedBuilder()
                .setTitle("شـراء رتـب")
                .setDescription("**<a:004:1326822409227210845>لـ شـراء رتـب الــرجــاء الــضــغــط عــلــى زر الــرتــبــة الــتـي تـريــد شـراءه <a:004:1326822409227210845>\n <a:hox_red_spar:1405145176027959366> لـ اغـلاق الـتـذكـرة الـرجـاء الضغط عـلـي زر إغـلاق الـتـذكـرة <a:hox_red_spar:1405145176027959366>**")
                .setImage(setupData?.line || null)
                .setFooter({ text: "Dev By Hox Devs", iconURL: interaction.guild.iconURL({ dynamic: true }) })
                .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                .setTimestamp();

            let row = new ActionRowBuilder();
            let rows = [];
            
            availableRoles.forEach((role, index) => {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`buyRole_${role.roleId}`)
                        .setLabel(role.roleName)
                        .setStyle(ButtonStyle.Secondary)
                );

                if ((index + 1) % 5 === 0 || index === availableRoles.length - 1) {
                    rows.push(row);
                    row = new ActionRowBuilder();
                }
            });

            const closeButton = new ButtonBuilder()
                .setCustomId("close_ticket")
                .setLabel("إغـلاق الـتـذكـرة")
                .setStyle(ButtonStyle.Danger)
                .setEmoji("<a:no:1405131885146800148>");

            if (rows.length > 0 && rows[rows.length - 1].components.length < 5) {
                rows[rows.length - 1].addComponents(closeButton);
            } else {
                rows.push(new ActionRowBuilder().addComponents(closeButton));
            }

            await ticket.send({ content: `${interaction.user}`, embeds: [embed], components: rows });
            return interaction.reply({ content: `**تـم إنـشـاء الـتـذكـرة بـنـجـاح ${ticket}**`, ephemeral: true });
        }

        // إغـلاق الـتـذكـرة
        if (interaction.customId === "close_ticket") {
            const userId = interaction.channel.topic?.replace('Ticket Owner: ', '');
            if (!userId) return interaction.reply({ content: "**هـذه لـيـسـت تـذكـرة**", ephemeral: true });

            // إزالة أي عمليات شراء نشطة للمستخدم
            if (activePurchases.has(userId)) {
                const collectors = purchaseCollectors.get(userId);
                if (collectors) {
                    collectors.messageCollector?.stop();
                }
                activePurchases.delete(userId);
                purchaseCollectors.delete(userId);
            }

            await Ticket.updateOne(
                { channelId: interaction.channel.id },
                { $set: { closed: true, closedAt: new Date() } }
            );

            await interaction.reply({ content: "**ســوف يــتــم إغــلاق الــتــذكــرة بــعــد 10 ثــوانــي**" });
            setTimeout(async () => {
                if (interaction.channel.deletable) await interaction.channel.delete().catch(() => {});
            }, 10000);
        }

        // شــراء رتــبــة - إضافة إيمبد التأكيد هنا
        if (interaction.customId.startsWith("buyRole_")) {
            // التحقق من حالة بيع الرتب مرة أخرى
            const saleState = await SaleState.findOne({
                guildId: interaction.guild.id,
                type: "role_sale"
            });
            
            if (saleState?.state === "disable") {
                return interaction.reply({
                    content: "**بــيــع الــرتــب مــعــطــل حالياً**",
                    ephemeral: true
                });
            }

            // التحقق من وجود عملية شراء نشطة
            if (activePurchases.has(interaction.user.id)) {
                return interaction.reply({
                    content: "**لــديــك عــمــلــيــة شــراء نــشــطــة بالفــعــل، الــرجــاء الانتــظــار حــتــى تــنــتــهــي**",
                    ephemeral: true
                });
            }

            const userId = interaction.channel.topic?.replace('Ticket Owner: ', '');
            if (!userId) return interaction.reply({ content: "**هـذه لـيـسـت تـذكـرة**", ephemeral: true });
            if (userId !== interaction.user.id) return interaction.reply({ content: `**هـذة لـيـسـت تـذكـرتـك **`, ephemeral: true });

            const roleId = interaction.customId.split("_")[1];
            const role = interaction.guild.roles.cache.get(roleId);
            const setupData = await Setup.findOne({ guildId: interaction.guild.id });

            if (!role) {
                return interaction.reply({ content: "**الــرتــبــة غــيــر مــوجــودة**", ephemeral: true });
            }

            // التحقق مما إذا كانت الرتبة معطلة
            if (saleState?.disabledRoles?.includes(roleId)) {
                return interaction.reply({
                    content: `**الــرتبــة ${role} مــعــطــلــة حالياً**`,
                    ephemeral: true
                });
            }

            const member = await interaction.guild.members.fetch(interaction.user.id);
            if (member.roles.cache.has(role.id)) {
                return interaction.reply({ content: "**انــت مــعــاك الــرتــبــة اصــلا\nشــكــل فــلــوســك كــتــيــرة**", ephemeral: true });
            }

            // جلب سعر الرتبة من Roles model
            const roleData = await Roles.findOne({ guildId, roleId });
            if (!roleData || !roleData.price) {
                return interaction.reply({ content: "**لــم يــتــم تــحــديــد ســعــر هــذه الــرتــبــة**", ephemeral: true });
            }

            const price = roleData.price;

            // إنشاء إيمبد تأكيد الشراء
            const confirmEmbed = new EmbedBuilder()
                .setTitle(`تــأكــيــد شــراء الــرتــبــة`)
                .setImage(setupData?.line || null)
                .addFields(
                    { name: "الــرتــبــة", value: `${role}`, inline: true },
                    { name: "الــســعــر", value: `${price}`, inline: true }
                )
                .setFooter({
                    text: "Dev By Hox Devs",
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                });

            // أزرار التأكيد والإلغاء
            const confirmRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`confirmRole_${roleId}`)
                        .setLabel("تــأكــيــد الــشــراء")
                        .setStyle(ButtonStyle.Success)
                        .setEmoji("<a:yes:1405131777948909599>"),
                    new ButtonBuilder()
                        .setCustomId("cancel_role_purchase")
                        .setLabel("إلــغــاء الــعــمــلــيــة")
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji("<a:no:1405131885146800148>")
                );

            await interaction.reply({
                content: `${interaction.user}`,
                embeds: [confirmEmbed],
                components: [confirmRow],
                ephemeral: false
            });
        }

        // تأكيد شراء الرتبة
        if (interaction.customId.startsWith("confirmRole_")) {
            // التحقق من حالة بيع الرتب مرة أخرى
            const saleState = await SaleState.findOne({
                guildId: interaction.guild.id,
                type: "role_sale"
            });
            
            if (saleState?.state === "disable") {
                return interaction.reply({
                    content: "**بــيــع الــرتــب مــعــطــل حالياً**",
                    ephemeral: true
                });
            }

            // التحقق من وجود عملية شراء نشطة
            if (activePurchases.has(interaction.user.id)) {
                return interaction.reply({
                    content: "**⚠️ لــديــك عــمــلــيــة شــراء نــشــطــة بالفــعــل، الــرجــاء الانتــظــار حــتــى تــنــتــهــي**",
                    ephemeral: true
                });
            }

            const userId = interaction.channel.topic?.replace('Ticket Owner: ', '');
            if (!userId || userId !== interaction.user.id) {
                return interaction.reply({ content: "**هـذه لـيـسـت تـذكـرتـك**", ephemeral: true });
            }

            const roleId = interaction.customId.split("_")[1];
            const role = interaction.guild.roles.cache.get(roleId);
            const setupData = await Setup.findOne({ guildId: interaction.guild.id });

            if (!setupData || !setupData.bank) {
                return interaction.reply({
                    content: "**الــرجــاء اخــبــار الادارة بــوضــع صــاحــب الــتــحــويــل مــن امــر\n /setup**",
                    ephemeral: true
                });
            }

            // جلب سعر الرتبة من ملف roles.json
            
            // جلب سعر الرتبة من Roles model
            const roleData = await Roles.findOne({ guildId, roleId });
            if (!roleData || !roleData.price) {
                return interaction.reply({ content: "**لــم يــتــم تــحــديــد ســعــر هــذه الــرتــبــة**", ephemeral: true });
            }

            const price = roleData.price;

            // إضافة المستخدم إلى قائمة العمليات النشطة
            activePurchases.set(interaction.user.id, {
                type: 'role',
                roleId: roleId,
                price: price,
                startedAt: Date.now()
            });

            const taxs = Math.floor((price * 20) / 19 + 1);
            const bank = setupData.bank;

            const paymentEmbed = new EmbedBuilder()
                .setTitle("عــمــلــيــة الــتــحــويــل")
                .setAuthor({
                    name: interaction.guild.name,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setImage(setupData.line)
                .setDescription(`**<a:011:1326822363785990205> الــرجــاء الــتــحــويــل فــي اســرع وقــت لــ شــراء الــرتــبــة <a:011:1326822363785990205>**`)
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

            // حفظ الكوليكتور
            purchaseCollectors.set(interaction.user.id, { messageCollector });

            messageCollector.on('collect', async () => {
                try {
                    messageCollector.stop();

                    const member = await interaction.guild.members.fetch(interaction.user.id);
                    await member.roles.add(role.id);

                    await interaction.followUp({
                        content: `**تــم شــراء الــرتــبــة بــنــجــاح: ${role}**`
                    });

                    // إزالة المستخدم من العمليات النشطة بعد اكتمال العملية
                    activePurchases.delete(interaction.user.id);
                    purchaseCollectors.delete(interaction.user.id);

                    if (setupData.logs) {
                        const logChannel = await client.channels.fetch(setupData.logs);
                        if (logChannel) {
                            const embedLog = new EmbedBuilder()
                                .setTitle("تــم شــراء رتــبــة (تــلــقــائــي)")
                                .addFields(
                                    { name: "بـواسـطـة:", value: `<@${interaction.user.id}>`, inline: true },
                                    { name: "الــرتــبــة:", value: `${role}`, inline: true },
                                    { name: "الــوقــت:", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                                )
                                .setTimestamp();
                            await logChannel.send({ embeds: [embedLog] });
                        }
                    }

                    setTimeout(async () => {
                        await interaction.channel.send({
                            content: "**ســوف يــتــم إغــلاق الــتــذكــرة بــعــد 10 ثــوانــي**"
                        });

                        setTimeout(async () => {
                            try {
                                await Ticket.deleteOne({ 
                                    channelId: interaction.channel.id,
                                    guildId: interaction.guild.id, 
                                    ticketType: "role" 
                                });
                                
                                if (interaction.channel.deletable) {
                                    await interaction.channel.delete().catch(() => {});
                                }
                            } catch (error) {
                                console.error('Error deleting ticket data:', error);
                            }
                        }, 10000);
                    }, 5000);

                } catch (error) {
                    console.error(error);
                    await interaction.followUp({
                        content: `**حــدث خــطــأ، الرجــاء الــتــواصــل مــع الدعــم لــحــل الــمــشــكــلــة**\n[رابــط الدعــم](https://discord.gg/DDEMEczWAx)\n**الــمــشــكــلــة:** ${error.message}`,
                        ephemeral: false
                    });
                    // إزالة المستخدم من العمليات النشطة في حالة الخطأ
                    activePurchases.delete(interaction.user.id);
                    purchaseCollectors.delete(interaction.user.id);
                }
            });

            messageCollector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.followUp({
                        content: "**تــم انــتــهــاء الــوقــت\nالــرجــاء عــدم الــتــحــويــل**",
                        ephemeral: false
                    });
                    // إزالة المستخدم من العمليات النشطة عند انتهاء الوقت
                    activePurchases.delete(interaction.user.id);
                    purchaseCollectors.delete(interaction.user.id);
                }
            });
        }

        // إلغاء شراء الرتبة
        if (interaction.customId === "cancel_role_purchase") {
            // إزالة المستخدم من العمليات النشطة
            activePurchases.delete(interaction.user.id);
            
            // إيقاف الكوليكتور إذا كان موجوداً
            const collectors = purchaseCollectors.get(interaction.user.id);
            if (collectors) {
                collectors.messageCollector?.stop();
                purchaseCollectors.delete(interaction.user.id);
            }

            await interaction.update({
                content: "**تــم إلــغــاء عــمــلــيــة شــراء الــرتــبــة**",
                embeds: [],
                components: []
            });

        }
    }
};