const { getStats } = require('../../utils/groupstats');

module.exports = {
    name: 'groupstats',
    aliases: ['stats', 'leaderboard', 'gstats', 'topmembers', 'msgs', 'messagestats'],
    category: 'general',
    description: 'Show today\'s group chat statistics + group info',
    usage: '.groupstats',
    groupOnly: true,

    async execute(sock, msg, args, extra) {
        try {
            const from = extra.from;
            const groupMetadata = await sock.groupMetadata(from);
            const stats = getStats(from);

            // 1. MEMBER DISTRIBUTION
            const totalMembers = groupMetadata.participants.length;
            const admins = groupMetadata.participants.filter(p => p.admin).length;
            const regular = totalMembers - admins;
            const adminPercent = ((admins / totalMembers) * 100).toFixed(1);
            const regularPercent = ((regular / totalMembers) * 100).toFixed(1);

            // 2. TIMELINE - AGE fix
            let createdDate = 'Unknown';
            let ageDays = 'Unknown';
            if (groupMetadata.creation && groupMetadata.creation > 0) {
                const created = new Date(groupMetadata.creation * 1000);
                createdDate = `${created.getDate()}/${created.getMonth() + 1}/${created.getFullYear()}`;
                ageDays = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
                if(ageDays < 0) ageDays = 0;
            }

            // 3. SETTINGS STATUS
            const isAnnounce = groupMetadata.announce; 
            const isLocked = groupMetadata.restrict;   
            const joinApproval = groupMetadata.joinApprovalMode || false;

            const messagingStatus = isAnnounce ? '🔒 ᴀᴅᴍɪɴs ᴏɴʟʏ' : '🔓 ᴏᴘᴇɴ';
            const infoEditStatus = isLocked ? '🔒 ʟᴏᴄᴋᴇᴅ' : '🔓 ᴏᴘᴇɴ';
            const joinStatus = joinApproval ? '✅ ᴀᴘʀᴏᴠᴀʟ' : '❌ ᴏᴘᴇɴ';

            // 4. TODAY'S ACTIVITY STATS
            let totalMsgs = 0;
            let topText = 'ɴᴏ ᴀᴄᴛɪᴠɪᴛʏ ʀᴇᴄᴏʀᴅᴇᴅ ᴛᴏᴅᴀʏ.';
            let mentions = [];

            if (stats && stats.users) {
                totalMsgs = stats.total;
                const sortedUsers = Object.entries(stats.users)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5);

                mentions = sortedUsers.map(u => u[0]);

                topText = sortedUsers.length
                    ? sortedUsers.map(([id, count], i) => `${i + 1}) @${id.split('@')[0]} — ${count} ᴍsɢs`).join('\n')
                    : 'ɴᴏ ᴀᴄᴛɪᴠᴇ ᴜsᴇʀs ʏᴇᴛ.';
            }

            const text = `
╭──[ ɢʀᴏᴜᴘ sᴛᴀᴛɪsᴛɪᴄs ]──╮
│
│ 📊 ᴍᴇᴍʙᴇʀ ᴅɪsᴛʀɪʙᴜᴛɪᴏɴ
│ • ᴛᴏᴛᴀʟ ᴍᴇᴍʙᴇʀs: ${totalMembers}
│ • ᴀᴅᴍɪɴs: ${admins} (${adminPercent}%)
│ • ʀᴇɢᴜʟᴀʀ: ${regular} (${regularPercent}%)
│
│ 📅 ᴛɪᴍᴇʟɪɴᴇ
│ • ᴄʀᴇᴀᴛᴇᴅ: ${createdDate}
│ • ᴀɢᴇ: ${ageDays} ᴅᴀʏs
│
│ ⚙️ sᴇᴛɪɴɢs sᴛᴀᴛᴜs
│ • ᴍᴇssᴀɢɪɴɢ: ${messagingStatus}
│ • ɪɴғᴏ ᴇᴅɪᴛ: ${infoEditStatus}
│ • ᴊᴏɪɴ ᴍᴏᴅᴇ: ${joinStatus}
│
├──[ ᴛᴏᴅᴀʏ's ᴀᴄᴛɪᴠɪᴛʏ ]──┤
│
│ 📌 ᴛᴏᴛᴀʟ ᴍᴇssᴀɢᴇs: ${totalMsgs}
│
│ 👥 ᴛᴏᴘ ᴀᴄᴛɪᴠᴇ ᴍᴇᴍʙᴇʀs:
${topText}
│
╰─────────────╯

ᴛʏᴘᴇ .ᴍʏᴀᴄᴛɪᴠɪᴛʏ ᴛᴏ sᴇ ʏᴏᴜʀ sᴛᴀᴛs.

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐱-мιηι♡ 💗 вσт`;

            await sock.sendMessage(from, {
                text,
                mentions: mentions
            }, { quoted: msg });

        } catch (err) {
            console.error('[groupstats cmd] error:', err);
            extra.reply('❌ ᴇʀᴏʀ ʟᴏᴀᴅɪɴɢ ɢʀᴏᴜᴘ sᴛᴀᴛs.');
        }
    }
};