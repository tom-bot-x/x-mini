/**
 * Ping Command - Check bot response time with vCard contact
 */

module.exports = {
    name: 'ping',
    aliases: ['p'],
    category: 'general',
    description: 'Check bot response time',
    usage: '.ping',
    
    async execute(sock, msg, args, extra) {
      try {
        const startTime = Date.now();
        const sentMsg = await extra.reply('🏓 Pinging...');
        const endTime = Date.now();
        
        const responseTime = endTime - startTime;
        const pingText = `*˹♡ 💗  𝚸❍𝐍𝐆 : ${responseTime} 𝐌𝐒⤸⟵*`;
        
        const { sendWithContact } = require('../../index.js');
        
        // Edit the first message instead of sending new one
        await sock.sendMessage(extra.from, {
          text: pingText,
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
        await extra.reply(`❌ Error: ${error.message}`);
      }
    }
  };