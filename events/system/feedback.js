const { ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const FeedbackSetup = require("../../Mangodb/setup.js");

// تسجيل الخط
try {
    registerFont(path.join(__dirname, '../../fonts/l.q1fount.ttf'), { family: 'CustomArabic' });
} catch (error) {
    console.warn('Could not load custom font, using default');
}

const STAR = '⭐';

// وظائف Canvas (نفس الكود الذي قدمته مع تعديلات بسيطة)
function createGradientBackground(ctx, width, height) {
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.8);
    gradient.addColorStop(0, '#0d0b1f');
    gradient.addColorStop(0.5, '#1a1a2e');
    gradient.addColorStop(0.7, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

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

function drawDecorations(ctx) {
    const width = 1000;
    const height = 500;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(60, 80, 200, 60);
    ctx.fillRect(width - 260, 100, 200, 60);

    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 8]);

    ctx.beginPath();
    ctx.moveTo(0, 420);
    ctx.lineTo(width, 420);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 60);
    ctx.lineTo(width, 60);
    ctx.stroke();

    ctx.setLineDash([]);

    ctx.shadowColor = '#8a2be2';
    ctx.shadowBlur = 25;
    ctx.fillStyle = 'rgba(138,43,226,0.05)';
    ctx.fillRect(0, 0, width, 8);
    ctx.fillRect(0, height - 8, width, 8);
    ctx.shadowBlur = 0;
}

function isRTLText(text) {
    return /[\u0600-\u06FF]/.test(text);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, isRTL=false) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let word of words) {
        const testLine = line + (line ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && line) {
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = isRTL ? 'right' : 'left';
            const xPos = isRTL ? (x + maxWidth) : x;
            ctx.fillText(line, xPos, currentY);
            line = word;
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.textAlign = isRTL ? 'right' : 'left';
    const xPos = isRTL ? (x + maxWidth) : x;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line, xPos, currentY);
    return currentY;
}

function drawTitle(ctx, text, x, y, isRTL=true) {
    ctx.save();
    ctx.font = 'bold 42px "CustomArabic", sans-serif';
    const gradient = ctx.createLinearGradient(x, y-20, x+200, y+20);
    gradient.addColorStop(0, '#14a1ff');
    gradient.addColorStop(0.5, '#8a2be2');
    gradient.addColorStop(1, '#5d0cff');
    ctx.fillStyle = gradient;
    ctx.shadowColor = '#5d0cff';
    ctx.shadowBlur = 15;
    ctx.textAlign = 'center';
    ctx.fillText(text, 500, y);
    ctx.shadowBlur = 0;
    ctx.restore();
}

async function drawAvatar(ctx, user, x = 900, y = 400) {
    try {
        const avatarURL = user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
        const avatar = await loadImage(avatarURL);

        ctx.save();
        const radius = 80;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI*2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, x-radius, y-radius, radius*2, radius*2);
        ctx.restore();

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI*2);
        ctx.closePath();
        const gradientStroke = ctx.createLinearGradient(x-radius, y-radius, x+radius, y+radius);
        gradientStroke.addColorStop(0, '#14a1ff');
        gradientStroke.addColorStop(1, '#5d0cff');
        ctx.lineWidth = 4;
        ctx.strokeStyle = gradientStroke;
        ctx.stroke();
        ctx.shadowColor = '#5d0cff';
        ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.shadowBlur = 0;
    } catch(err) {
        console.error('Avatar error:', err);
    }
}

async function drawServerIcon(ctx, message, x = 100, y = 400) {
    try {
        const guildIconURL = message.guild.iconURL({ extension:'png', size:256 });
        if(guildIconURL){
            const guildIcon = await loadImage(guildIconURL);
            ctx.save();
            
            const radius = 80;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI*2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(guildIcon, x-radius, y-radius, radius*2, radius*2);
            ctx.restore();
            
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI*2);
            ctx.closePath();
            const gradientStroke = ctx.createLinearGradient(x-radius, y-radius, x+radius, y+radius);
            gradientStroke.addColorStop(0, '#FFD700');
            gradientStroke.addColorStop(0.5, '#FFA500');
            gradientStroke.addColorStop(1, '#FF8C00');
            ctx.lineWidth = 4;
            ctx.strokeStyle = gradientStroke;
            ctx.stroke();
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 20;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    } catch(err){
        console.error('Server icon error:', err);
    }
}

function drawUsername(ctx, username, x, y) {
    ctx.save();
    ctx.font = 'bold 40px "CustomArabic", sans-serif';
    const gradient = ctx.createLinearGradient(x, y-20, x+200, y+20);
    gradient.addColorStop(0, '#14a1ff');
    gradient.addColorStop(0.5, '#8a2be2');
    gradient.addColorStop(1, '#5d0cff');
    ctx.fillStyle = gradient;
    ctx.shadowColor = '#5d0cff';
    ctx.shadowBlur = 15;
    ctx.textAlign = 'right';
    ctx.fillText(username, x, y + 10);
    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawServerName(ctx, serverName, x, y) {
    ctx.save();
    ctx.font = 'bold 40px "CustomArabic", sans-serif';
    const gradient = ctx.createLinearGradient(x, y-20, x+200, y+20);
    gradient.addColorStop(0, '#FFD700');
    gradient.addColorStop(1, '#FF8C00');
    ctx.fillStyle = gradient;
    ctx.textAlign = 'left';
    ctx.fillText(serverName, x, y + 10);
    ctx.restore();
}

function drawStars(ctx, rating) {
    ctx.save();
    const starSize = 28;
    const spacing = 10;
    const startX = 500;
    const starsY = 90;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    function drawStar(x, y, size, filled) {
        const points = 5;
        const outerRadius = size / 2;
        const innerRadius = size / 5;
        
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / points - Math.PI / 2;
            const px = x + radius * Math.cos(angle);
            const py = y + radius * Math.sin(angle);
            
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
        
        if (filled) {
            const starGradient = ctx.createRadialGradient(x, y, 0, x, y, outerRadius);
            starGradient.addColorStop(0, '#ffffff');
            starGradient.addColorStop(0.5, '#ffd700');
            starGradient.addColorStop(1, '#ff6b00');
            ctx.fillStyle = starGradient;
            ctx.fill();
            ctx.shadowColor = '#ff6b00';
            ctx.shadowBlur = 20;
        } else {
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    for (let i = 0; i < 5; i++) {
        const x = startX - (i - 2) * (starSize + spacing);
        if (i < rating) {
            ctx.save();
            drawStar(x, starsY, starSize, true);
            ctx.restore();
        } else {
            ctx.save();
            drawStar(x, starsY, starSize, false);
            ctx.restore();
        }
    }
    ctx.restore();
}

function createRatingButtons() {
    const row = new ActionRowBuilder();
    for (let i = 1; i <= 5; i++) {
        const stars = STAR.repeat(i);
        let style = ButtonStyle.Primary;
        switch(i){
            case 1: style=ButtonStyle.Danger; break;
            case 2: style=ButtonStyle.Secondary; break;
            case 3: style=ButtonStyle.Primary; break;
            case 4: style=ButtonStyle.Success; break;
            case 5: style=ButtonStyle.Primary; break;
        }
        row.addComponents(new ButtonBuilder()
            .setCustomId(`feedback_rate_${i}`)
            .setLabel(stars)
            .setStyle(style));
    }
    return [row];
}

async function createFeedbackImage(message, rating=null) {
    const canvas = createCanvas(1000,500);
    const ctx = canvas.getContext('2d');

    createGradientBackground(ctx,1000,500);
    drawDecorations(ctx);
    
    drawTitle(ctx,'تقييم المستخدم',500,50);
    if(rating) drawStars(ctx,rating);

    ctx.save();
    ctx.fillStyle = 'rgba(20,20,40,0.7)';
    ctx.beginPath();
    ctx.roundRect(50,140,900,250,20);
    ctx.fill();
    ctx.restore();

    const isRTL = isRTLText(message.content);
    ctx.font = 'bold 26px "CustomArabic", sans-serif';
    wrapText(ctx,message.content,70,180,860,35,isRTL);

    await drawAvatar(ctx, message.author, 900, 400);
    drawUsername(ctx, message.author.username, 810, 400);

    await drawServerIcon(ctx, message, 100, 400);
    drawServerName(ctx, message.guild.name, 190, 400);

    return canvas;
}

module.exports = {
    name: "messageCreate",
    once: false,

    async execute(client, message) {
        if (message.author.bot) return;

        const feedbackData = await FeedbackSetup.findOne({ guildId: message.guild.id });
        if (!feedbackData || !feedbackData.feedbackRooms || feedbackData.feedbackRooms.length === 0) return;

        const feedbackRoom = feedbackData.feedbackRooms.find(room => room.channelId === message.channel.id);
        if (!feedbackRoom) return;

        try {
            const canvas = await createFeedbackImage(message);
            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'feedback.png' });

            const reply = await message.reply({ 
                files: [attachment], 
                components: createRatingButtons() 
            });

            const collector = reply.createMessageComponentCollector({ 
                filter: i => i.user.id === message.author.id, 
                time: 30000 
            });

            collector.on('collect', async interaction => {
                if (!interaction.customId.startsWith('feedback_rate_')) return;
                
                const rating = parseInt(interaction.customId.split('_')[2]);
                
                await interaction.deferUpdate();
                
                try {
                    await message.delete().catch(() => {});
                    await reply.delete().catch(() => {});
                    
                    const newCanvas = await createFeedbackImage(message, rating);
                    const newAttachment = new AttachmentBuilder(newCanvas.toBuffer(), { name: 'feedback_rated.png' });
                    
                    const finalMessage = await message.channel.send({ 
                        files: [newAttachment]
                    });
                    
                    if (feedbackRoom.lineUrl) {
                        setTimeout(async () => {
                            try {
                                await message.channel.send({ files: [feedbackRoom.lineUrl] });
                            } catch (error) {
                                console.error('خطأ في إرسال الخط:', error);
                            }
                        }, 1000);
                    }
                    
                    collector.stop();
                } catch (error) {
                    console.error('خطأ في معالجة التقييم:', error);
                    await interaction.followUp({ 
                        content: '❌ حدث خطأ أثناء معالجة التقييم', 
                        ephemeral: true 
                    });
                }
            });

            collector.on('end', async collected => {
                if (collected.size === 0) {
                    try {
                        await reply.edit({ components: [] }).catch(() => {});
                    } catch (error) {
                        console.error('خطأ في تعديل الرسالة:', error);
                    }
                }
            });

        } catch (error) {
            console.error('خطأ في نظام التقييم:', error);
            await message.reply('❌ حدث خطأ في إنشاء صورة التقييم').catch(() => {});
        }
    }
};