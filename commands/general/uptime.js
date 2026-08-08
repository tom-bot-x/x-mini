/**
 * Uptime Command - Animation like ping with vCard
 */

function formatUptime(seconds) {
  if (seconds <= 0) return '0s';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

module.exports = {
  name: 'uptime',
  aliases: ['runtime', 'botuptime', 'alive'],
  category: 'general',
  description: 'Show bot uptime',
  usage: '.uptime',
  
  async execute(sock, msg, args, extra) {
    try {
      // First send loading message
      const sentMsg = await extra.reply('⚡ Calculating uptime...');
      
      const uptimeSeconds = process.uptime();
      const uptime = formatUptime(uptimeSeconds);
      
      // Edit message to final uptime like ping
      await sock.sendMessage(extra.from, {
        text: `*⚡ 𝐔𝐩𝐭𝐢𝐦𝐞 : ${uptime}👾*`,
        edit: sentMsg.key,
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
      
    } catch (error) {
      console.error('Error in uptime command:', error);
      await extra.reply('❌ Error');
    }
  }
};