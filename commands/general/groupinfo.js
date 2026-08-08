/**
 * Group Info Command - Display group information
 */

module.exports = {
    name: 'groupinfo',
    aliases: ['info', 'ginfo'],
    category: 'general',
    description: 'Show group information',
    usage: '.groupinfo',
    groupOnly: true,
    
    async execute(sock, msg, args, extra) {
      try {
        const metadata = extra.groupMetadata;
        
        const admins = metadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
        const members = metadata.participants.filter(p => !p.admin);
        
        let text = `╭───[ɢʀᴏᴜᴘ ɪɴғᴏ]───╮
│
│ 📋 ɢʀᴏᴜᴘ ɪɴғᴏʀᴍᴀᴛɪᴏɴ
│
│ 🏷️ ɴᴀᴍᴇ: ${metadata.subject}
│ 🆔 ɪᴅ: ${metadata.id}
│ 👥 ᴍᴇᴍʙᴇʀs: ${metadata.participants.length}
│ 👑 ᴀᴅᴍɪɴs: ${admins.length}
│ 📝 ᴅᴇsᴄʀɪᴘᴛɪᴏɴ: ${metadata.desc || 'ɴᴏ ᴅᴇsᴄʀɪᴘᴛɪᴏɴ'}
│ 🔒 ʀᴇsᴛʀɪᴄᴛᴇᴅ: ${metadata.restrict ? 'ʏᴇs' : 'ɴᴏ'}
│ 📢 ᴀɴᴏᴜɴᴄᴇ: ${metadata.announce ? 'ʏᴇs' : 'ɴᴏ'}
│ 📅 ᴄʀᴇᴀᴛᴇᴅ: ${new Date(metadata.creation * 1000).toLocaleDateString()}
│
│ 👑 ᴀᴅᴍɪɴs:
`;
        
        admins.forEach((admin, index) => {
          text += `│ ${index + 1}) @${admin.id.split('@')[0]}\n`;
        });
        
        text += `│
╰─────────────╯

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐱-мιηι♡ 💗 вσт`;

        await sock.sendMessage(extra.from, {
          text,
          mentions: admins.map(a => a.id)
        }, { quoted: msg });
        
      } catch (error) {
        await extra.reply(`❌ ᴇʀᴏʀ: ${error.message}`);
      }
    }
};