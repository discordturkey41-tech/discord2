const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

let words = require('../../data/words.json');
const Logs = require("../../Mangodb/logs.js");

setInterval(() => {
    delete require.cache[require.resolve('../../data/words.json')];
    words = require('../../data/words.json');
}, 1000);

const Shop = require("../../Mangodb/shop.js");
const Setup = require("../../Mangodb/setup.js");

// تسجيل الخط العربي
try {
    registerFont(path.join(__dirname, '../../fonts/l.q1fount.ttf'), { family: 'CustomArabic' });
} catch (error) {
    console.warn('Could not load custom font, using default');
}

// دالة رفع الصور إلى Imgbb API
async function uploadImageToImgbb(buffer) {
    try {
        const form = new FormData();
        form.append('key', 'd6207a09b60e476f2955a7d9990f86a6'); // API key من Imgbb
        form.append('image', buffer.toString('base64')); // استخدام base64

        const uploadResponse = await axios.post('https://api.imgbb.com/1/upload', form, {
            headers: {
                ...form.getHeaders()
            }
        });

        if (uploadResponse.data && uploadResponse.data.data && uploadResponse.data.data.url) {
            return uploadResponse.data.data.url;
        } else {
            console.error('Invalid response from Imgbb:', uploadResponse.data);
            return null;
        }
    } catch (error) {
        console.error('Upload error:', error.response?.data || error.message);
        return null;
    }
}
// تسجيل الخط العربي
try {
    registerFont(path.join(__dirname, '../../fonts/l.q1fount.ttf'), { family: 'CustomArabic' });
} catch (error) {
    console.warn('Could not load custom font, using default');
}

// دالة لإنشاء خلفية متدرجة
function createGradientBackground(ctx, width, height) {
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.8);
    gradient.addColorStop(0, '#0d0b1f');
    gradient.addColorStop(0.5, '#1a1a2e');
    gradient.addColorStop(0.7, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // نجوم صغيرة في الخلفية
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const radius = Math.random() * 1.5;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// دالة لرسم الزينة
function drawDecorations(ctx, width, height) {
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(60, 80, 200, 60);
    ctx.fillRect(width - 260, 100, 200, 60);

    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 8]);

    ctx.beginPath();
    ctx.moveTo(0, height - 80);
    ctx.lineTo(width, height - 80);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 60);
    ctx.lineTo(width, 60);
    ctx.stroke();

    ctx.setLineDash([]);

    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 25;
    ctx.fillStyle = 'rgba(255,68,68,0.05)';
    ctx.fillRect(0, 0, width, 8);
    ctx.fillRect(0, height - 8, width, 8);
    ctx.shadowBlur = 0;
}

// دالة للتحقق من النص العربي
function isRTLText(text) {
    return /[\u0600-\u06FF]/.test(text);
}

// دالة لرسم النص مع تلوين الكلمات المحظورة
function drawMessageWithHighlights(ctx, text, x, y, maxWidth, lineHeight, bannedWords, isRTL = false) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    const lines = [];

    // تقسيم النص إلى أسطر بناءً على العرض المتاح
    for (let word of words) {
        const testLine = line + (line ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && line) {
            lines.push(line);
            line = word;
        } else {
            line = testLine;
        }
    }
    
    if (line) {
        lines.push(line);
    }

    // رسم كل سطر
    for (let lineText of lines) {
        drawLineWithBannedWords(ctx, lineText, x, currentY, bannedWords, isRTL);
        currentY += lineHeight;
    }

    return currentY;
}

// دالة لرسم السطر مع تلوين الكلمات المحظورة
function drawLineWithBannedWords(ctx, text, x, y, bannedWords, isRTL = false) {
    const words = text.split(' ');
    let currentX = x;

    ctx.font = 'bold 16px "CustomArabic", sans-serif';

    for (let word of words) {
        const isBanned = bannedWords.some(banned => word.toLowerCase().includes(banned.toLowerCase()));
        
        if (isBanned) {
            ctx.fillStyle = '#ff4444';
        } else {
            ctx.fillStyle = '#ffdddd';
        }

        // إذا كان النص عربي (RTL)، اعكس الرسم
        if (isRTL) {
            ctx.textAlign = 'right';
            ctx.fillText(word + ' ', currentX, y);
            currentX -= ctx.measureText(word + ' ').width;
        } else {
            ctx.textAlign = 'left';
            ctx.fillText(word + ' ', currentX, y);
            currentX += ctx.measureText(word + ' ').width;
        }
    }
}

// دالة لرسم الأفاتار
async function drawAvatar(ctx, user, x = 900, y = 400) {
    try {
        const avatarURL = user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
        const avatar = await loadImage(avatarURL);

        ctx.save();
        const radius = 80;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, x - radius, y - radius, radius * 2, radius * 2);
        ctx.restore();

        // إطار أحمر
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.closePath();
        const gradientStroke = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
        gradientStroke.addColorStop(0, '#ff4444');
        gradientStroke.addColorStop(1, '#ff8888');
        ctx.lineWidth = 4;
        ctx.strokeStyle = gradientStroke;
        ctx.stroke();
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.shadowBlur = 0;
    } catch (err) {
        console.error('Avatar error:', err);
    }
}

// دالة لرسم اسم المستخدم
function drawUsername(ctx, username, x, y) {
    ctx.save();
    ctx.font = 'bold 40px "CustomArabic", sans-serif';
    const gradient = ctx.createLinearGradient(x, y - 20, x + 200, y + 20);
    gradient.addColorStop(0, '#ff4444');
    gradient.addColorStop(0.5, '#ff6b6b');
    gradient.addColorStop(1, '#ff8888');
    ctx.fillStyle = gradient;
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 15;
    ctx.textAlign = 'right';
    ctx.fillText(username, x, y + 10);
    ctx.shadowBlur = 0;
    ctx.restore();
}

// دالة لإنشاء صورة التحذير
async function createWarnImage(message, bannedWords) {
    const canvasWidth = 1000;
    const canvasHeight = 650;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // خلفية متدرجة
    createGradientBackground(ctx, canvasWidth, canvasHeight);
    drawDecorations(ctx, canvasWidth, canvasHeight);

    // صندوق الكلمات المحظورة
    ctx.save();
    ctx.fillStyle = 'rgba(255,68,68,0.15)';
    ctx.strokeStyle = 'rgba(255,68,68,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(50, 85, 900, 100, 20);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // النص الأساسي فوق البار الأحمر
    ctx.save();
    ctx.font = 'bold 32px "CustomArabic", sans-serif';
    const gradient = ctx.createLinearGradient(250, 30, 750, 70);
    gradient.addColorStop(0, '#ff4444');
    gradient.addColorStop(0.5, '#ff6b6b');
    gradient.addColorStop(1, '#ff8888');
    ctx.fillStyle = gradient;
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 15;
    ctx.textAlign = 'right';
    ctx.fillText('تم تحذير متجرك', 820, 65);
    ctx.shadowBlur = 0;
    ctx.restore();

    // عنوان الكلمات المحظورة
    ctx.save();
    ctx.font = 'bold 20px "CustomArabic", sans-serif';
    ctx.fillStyle = '#ffaaaa';
    ctx.textAlign = 'right';
    ctx.fillText('الكلمات المحظورة:', 900, 115);
    ctx.restore();

    // قائمة الكلمات المحظورة
    ctx.save();
    ctx.font = 'bold 16px "CustomArabic", sans-serif';
    ctx.fillStyle = '#ff6b6b';
    ctx.textAlign = 'right';
    let yPos = 150;
    const wordsPerLine = 3;
    let wordsOnLine = [];
    
    for (let i = 0; i < bannedWords.length; i++) {
        wordsOnLine.push(bannedWords[i]);
        if (wordsOnLine.length === wordsPerLine || i === bannedWords.length - 1) {
            const wordsText = wordsOnLine.join(' • ');
            ctx.fillText(wordsText, 900, yPos);
            yPos += 25;
            wordsOnLine = [];
        }
    }
    ctx.restore();

    // صندوق النص الأصلي
    ctx.save();
    ctx.fillStyle = 'rgba(20,20,40,0.7)';
    ctx.beginPath();
    ctx.roundRect(50, 210, 900, 200, 15);
    ctx.fill();
    ctx.restore();

    // عنوان النص الأصلي
    ctx.save();
    ctx.font = 'bold 18px "CustomArabic", sans-serif';
    ctx.fillStyle = '#b9bbbe';
    ctx.textAlign = 'right';
    ctx.fillText('محتوى الرسالة:', 900, 235);
    ctx.restore();

    // النص الأصلي مع تلوين الكلمات المحظورة
    const isRTL = isRTLText(message.content);
    const textX = isRTL ? 880 : 70;
    drawMessageWithHighlights(ctx, message.content, textX, 265, 800, 28, bannedWords, isRTL);

    // الأفاتار والاسم
    await drawAvatar(ctx, message.author, 900, 550);
    drawUsername(ctx, message.author.username, 810, 550);

    return canvas.toBuffer();
}

module.exports = {
    name: "messageCreate",
    once: false,
    async execute(client, message) {
        if (!message.guild) return;
        if (message.author.bot) return;
        
        const logsData = await Logs.findOne({ guildId: message.guild.id });
        const shopData = await Shop.findOne({
            guildId: message.guild.id,
            channelId: message.channel.id,
        });
        
        if (!shopData) return;
        
        const owner = shopData.ownerId;
        const partners = shopData.partners;
        if (message.author.id !== owner && (!partners || !partners.includes(message.author.id)))
            return;
        
        const setupData = await Setup.findOne({ guildId: message.guild.id });
        if (!setupData) return;

        const messageWords = message.content.toLowerCase().replace(/[^\u0600-\u06FFa-z0-9\s]/g, '').split(/\s+/);
        if (typeof message.content === "string" && words.some(word => messageWords.some(msgWord => msgWord === word.toLowerCase()))) {
            const foundWords = words.filter(word => messageWords.some(msgWord => msgWord === word.toLowerCase()));
            const reasonText = foundWords.length > 1 
                ? foundWords.join(", ") 
                : foundWords[0];

            // إنشاء صورة التحذير
            const screenshotBuffer = await createWarnImage(message, foundWords);
            
            // رفع الصورة إلى Imgbb
            const imageUrl = await uploadImageToImgbb(screenshotBuffer);
            
            // تحديث عدد التحذيرات
            await Shop.updateOne(
                { guildId: message.guild.id, channelId: message.channel.id },
                { $inc: { warns: 1 } }
            );

            const updatedShopData = await Shop.findOne({
                guildId: message.guild.id,
                channelId: message.channel.id,
            });
            
            // حساب رقم التحذير الجديد
            const warningNumber = updatedShopData.warnings.length + 1;
            
            // إنشاء كائن التحذير الجديد
            const newWarning = {
                warningNumber: warningNumber,
                reason: `عــدم تــشــفــيــر الــكــلــمــات : ${reasonText}`,
                warnedBy: client.user.id, // البوت الذي قام بالتحذير
                warnedAt: new Date(),
                evidence: `رسالة في القناة ${message.channel.name}`,
                imageUrl: imageUrl || 'لا توجد صورة',
                messageId: message.id,
                channelId: message.channel.id,
                wordsFound: foundWords,
                messageContent: message.content.substring(0, 500) // حفظ أول 500 حرف فقط
            };
            
            // إضافة التحذير الجديد إلى المصفوفة
            await Shop.updateOne(
                { guildId: message.guild.id, channelId: message.channel.id },
                { $push: { warnings: newWarning } }
            );

            const remainingWarns = shopData.maxWarns - updatedShopData.warns;
            const attachment = new AttachmentBuilder(screenshotBuffer, { name: 'warning-message.png' });

            // إنشاء الإيمبد
            let emb = new EmbedBuilder()
                .setTitle("تــم تــحــذيــر الــمــتــجــر")
                .setImage('attachment://warning-message.png')
                .addFields([
                    {
                        name: "**الــمــتــجــر :**",
                        value: `<#${message.channel.id}>`,
                        inline: true,
                    },
                    {
                        name: "**ســبـــب الـــتـــحـــذيـــر :**",
                        value: `**عــدم تــشــفــيــر الــكــلــمــات : ${reasonText}**`,
                        inline: true,
                    },
                    {
                        name: "**عــدد تــحــذيــرات الــمـتــجــر :**",
                        value: `**${updatedShopData.warns}**`,
                        inline: true,
                    },
                    {
                        name: "**الــتــحـذيــرات الــمــتــبــقــيــة :**",
                        value: `**${remainingWarns > 0 ? remainingWarns : 'تــم الــوصــول للــحــد الأقــصــى'}**`,
                        inline: true,
                    },
                    {
                        name: "**رقــم الــتــحــذيــر :**",
                        value: `**#${warningNumber}**`,
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

            // إنشاء أزرار عرض التحذيرات

            // حذف الرسالة الأصلية
            try {
                await message.delete();
            } catch (err) {
                console.log("فشل في حذف الرسالة الأصلية");
            }

            // إرسال الإشعار في القناة
            const warningMessage = await message.channel.send({
                content: `<@${shopData.ownerId}>`,
                embeds: [emb],
                files: [attachment],
                components: [buttonsRow],
            });

            if (setupData.line) {
                await message.channel.send({
                    files: [setupData.line]
                });
            }
            const button = new ButtonBuilder()
                .setCustomId("remove-warn")
                .setLabel("لـــ ازالــة الــتــحــذيــر")
                .setEmoji("<a:005:1326822412607684618>")
                .setStyle("Secondary");

            const row = new ActionRowBuilder().addComponents(button);

            // إرسال إشعار لصاحب المتجر
            try {
                const owner = await client.users.fetch(shopData.ownerId);
                await owner.send({
                    content: `**تــم تــحــذيــر مــتــجــرك <#${message.channel.id}>**`,
                    embeds: [emb],
                    files: [attachment],
                    components: [row],
                });
            } catch (err) {
                console.log("فشل في إرسال رسالة خاصة لصاحب المتجر");
            }

            // تسجيل الحدث في سجلات السيرفر
            if (logsData && logsData.shopLogRoom) {
                const logChannel = await client.channels.fetch(logsData.shopLogRoom);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle("لــوق الــتــحــــذيــر الــتــلــقــائــي")
                        .setImage('attachment://warning-message.png')
                        .addFields(
                            { name: "الــمــتــجــر", value: `<#${message.channel.id}>`, inline: true },
                            { name: "رقــم الــتــحــذيــر", value: `#${warningNumber}`, inline: true },
                            { name: "عــدد تــحــذيــرات الــمــتــجــر", value: `${updatedShopData.warns}`, inline: true },
                            { name: "الــســبــب", value: `عــدم تــشــفــيــر الــكــلــمــات : ${reasonText}`, inline: false },
                            { name: "الــكــلــمــات", value: foundWords.join(', ') || 'لا توجد', inline: false }
                        )
                        .setTimestamp();

                    await logChannel.send({ 
                        embeds: [logEmbed],
                        files: [attachment]
                    });
                }
            }
        }
    }
};
