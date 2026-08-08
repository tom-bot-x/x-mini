/**
 * GitHub Command - Live GitHub stats + your info + vCard
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'github',
    aliases: ['repo', 'git', 'source', 'sc', 'script'],
    category: 'general',
    description: 'Show bot GitHub repository and live statistics',
    usage: '.github',
    ownerOnly: false,

    async execute(sock, msg, args, extra) {
        try {
            const chatId = extra.from;
            const repoUrl = 'https://github.com/TOM-PRIME-X-MINI-BOT/TOM-PRIME-X-WATHAPP-BOT';
            const apiUrl = 'https://api.github.com/repos/TOM-PRIME-X-MINI-BOT/TOM-PRIME-X-WATHAPP-BOT';
            
            // Loading message like ping/uptime
            const loadingMsg = await extra.reply('🔍 ꜰᴇᴛᴄʜɪɴɢ ʀᴇᴘᴏ ɪɴꜰᴏ...');
            
            try {
                // Fetch live data from GitHub API
                const response = await axios.get(apiUrl, {
                    headers: {'User-Agent': 'TOM-PRIME-X-MINI'}
                });
                
                const repo = response.data;
                const sizeMB = (repo.size / 1024).toFixed(2);
                
                // Compact box with your info + live stats
                let message = `乂 ᴛ ᴏ ᴍ ᴘ ʀ ɪ ᴍ ᴇ x ᴍ ɪ ɴ ɪ 乂
┌『 ꜱʏꜱᴛᴇᴍ ɪɴꜰᴏ 』┐
│ ᴏᴡɴᴇʀ: ᴘʀᴏꜰᴇꜱᴏʀ ᴛᴏᴍ
│ ʀᴇᴘᴏ: ᴛᴏᴍ-ᴘʀɪᴍᴇ-x-ᴡᴀᴛʜᴀᴘ-ʙᴏᴛ
│ ʟɪᴄᴇɴꜱᴇ: ᴀᴘᴀᴄʜᴇ 2.0
│ ᴄᴏʀᴇ: ɴᴏᴅᴇ.ᴊꜱ / ʙᴀɪʟᴇʏꜱ
└─────────────╼
┌『 ʟɪᴠᴇ ꜱᴛᴀᴛꜱ 』┐
│ ⭐ ${repo.stargazers_count} | 🍴 ${repo.forks_count} | 📏 ${sizeMB}ᴍʙ
└─────────────╼
┌『 ᴄᴏɴᴇᴄᴛ 』┐
│ ɢʜ: https://github.com/TOM-PRIME-X-MINI-BOT/TOM-PRIME-X-WATHAPP-BOT
│ ʏᴛ: https://youtube.com/@saycotom?si=te1C6VdtNZJW2mPT
│ wp:
https://whatsapp.com/channel/0029VbBItW060eBXTB93HT1Q
└───────────╼
> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴛᴏᴍ-ᴘʀɪᴍᴇ-x-ᴍɪɴɪ`;

                // Send with vCard like ping command
                await sock.sendMessage(chatId, {
                    text: message,
                    edit: loadingMsg.key,
                    contextInfo: {
                        stanzaId: Date.now().toString(),
                        participant: "0@s.whatsapp.net",
                        quotedMessage: {
                            contactMessage: {
                                displayName: "—͞To፝֟ᴍ Ᏼꫝ֟፝ʙ𝚈",
                                vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:—͞To፝֟ᴍ Ᏼꫝ֟፝ʙ𝚈\nORG:WhatsApp ✔\nTITLE:• Status\nEND:VCARD`
                            }
                        }
                    }
                });
                
            } catch (apiError) {
                console.error('GitHub API Error:', apiError.message);
                
                // Fallback message if API fails
                let fallback = `乂 ᴛ ᴏ ᴍ ᴘ ʀ ɪ ᴍ ᴇ x ᴍ ɪ ɴ ɪ 乂
┌『 ꜱʏꜱᴛᴇᴍ ɪɴꜰᴏ 』┐
│ ᴏᴡɴᴇʀ: ᴘʀᴏꜰᴇꜱᴏʀ ᴛᴏᴍ
│ ʀᴇᴘᴏ: ᴛᴏᴍ-ᴘʀɪᴍᴇ-x-ᴡᴀᴛʜᴀᴘ-ʙᴏᴛ
│ ʟɪᴄᴇɴꜱᴇ: ᴀᴘᴀᴄʜᴇ 2.0
│ ᴄᴏʀᴇ: ɴᴏᴅᴇ.ᴊꜱ / ʙᴀɪʟᴇʏꜱ
└─────────────╼
⚠️ ʟɪᴠᴇ ꜱᴛᴀᴛꜱ ʟᴏᴀᴅ ʜᴏʟᴏ ɴᴀ
🔗 ʀᴇᴘᴏ: ${repoUrl}
> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐱-мιηι♡ 💗 вσт`;

                await sock.sendMessage(chatId, {
                    text: fallback,
                    edit: loadingMsg.key
                });
            }
            
        } catch (error) {
            console.error('GitHub command error:', error);
            await extra.reply('❌ ᴇʀᴏʀ: ' + error.message);
        }
    }
};