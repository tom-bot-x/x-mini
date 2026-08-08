const { getStats } = require('../../utils/groupstats');

module.exports = {
    name: 'myactivity',
    aliases: ['mystats', 'mymsgs', 'rank'],
    category: 'general',
    description: 'Check your activity stats for today',
    usage: '.myactivity',
    groupOnly: true,

    async execute(sock, msg, args, extra) {
        try {
            const from = extra.from;
            const sender = extra.sender;
            const stats = getStats(from);

            if (!stats ||!stats.users ||!stats.users[sender]) {
                return extra.reply('📊 ʏᴏᴜ ʜᴀᴠᴇɴ\'ᴛ sᴇɴᴛ ᴀɴʏ ᴍᴇssᴀɢᴇs ᴛᴏᴅᴀʏ ʏᴇᴛ!');
            }

            const userCount = stats.users[sender];
            const totalMessages = stats.total;
            const percentage = ((userCount / totalMessages) * 100).toFixed(1);

            // Calculate rank
            const sortedUsers = Object.entries(stats.users)
               .sort((a, b) => b[1] - a[1]);

            const rank = sortedUsers.findIndex(([id]) => id === sender) + 1;

            const text = `
📊 *ʏᴏᴜʀ ᴀᴄᴛɪᴠɪᴛʏ ᴛᴏᴅᴀʏ*

👤 *ᴜsᴇʀ:* @${sender.split('@')[0]}
📝 *ᴍᴇssᴀɢᴇs sᴇɴᴛ:* ${userCount}
📈 *ʏᴏᴜʀ sʜᴀʀᴇ:* ${percentage}%
🏆 *ʀᴀɴᴋ:* #${rank} ᴏғ ${sortedUsers.length}

ᴋᴇᴇᴘ ᴄʜᴀᴛɪɴɢ! 💬

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐱-мιηι♡ 💗 вσт`.trim();

            await sock.sendMessage(from, {
                text,
                mentions: [sender]
            }, { quoted: msg });

        } catch (err) {
            console.error('[myactivity cmd] error:', err);
            extra.reply('❌ ᴇʀᴏʀ ʟᴏᴀᴅɪɴɢ ʏᴏᴜʀ ᴀᴄᴛɪᴠɪᴛʏ sᴛᴀᴛs.');
        }
    }
};