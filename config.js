/**
 * Global Configuration for WhatsApp Mini Bot
 * Adapted from bot2 (YEAN-MINI-BOT) config
 */

module.exports = {
    // Bot Owner Configuration
    ownerNumber: ['8801791903810'], // Your Bot number without + or spaces
    ownerName: ['Tom Mini Bot'], // Owner names corresponding to ownerNumber array
    
    // Bot Configuration
    botName: 'Mini Bot',
    prefix: '.',
    sessionName: '𝐱-мιηι-вσт-mini',
    sessionID: process.env.SESSION_ID || '',
    newsletterJid: '120363403719538106@newsletter',
    updateZipUrl: 'https://github.com/TOM-PRIME-X-MINI-BOT/TOM-PRIME-X-WATHAPP-BOT/archive/refs/heads/main.zip',
    
    // Sticker Configuration
    packname: 'Mini Bot',
    
    // Bot Behavior
    selfMode: true, // Public mode - everyone can use commands
    autoRead: false,
    autoTyping: false,
    autoBio: false,
    autoSticker: false,
    autoReact: false,
    autoReactMode: 'bot',
    autoDownload: false,
    
    /// Group Settings Defaults
    defaultGroupSettings: {
      antilink: false,
      antilinkAction: 'delete',
      antitag: false,
      antitagAction: 'delete',
      antiall: false,
      antiviewonce: false,
      antibot: false,
      antibotAction: 'warn',
      anticall: false,
      antigroupmention: false,
      antigroupmentionAction: 'delete',
      antigroupstatus: false,
      antigroupstatusAction: 'delete',
      antisticker: false,
      antistickerAction: 'delete',
      antibadword: false,
      antibadwordAction: 'delete',
      welcome: false,
      welcomeMessage: '',
      goodbye: false,
      goodbyeMessage: '',
      antiSpam: false,
      antidelete: false,
      nsfw: false,
      detect: false,
      chatbot: false,
      autosticker: false
    },
    
    // API Keys
    apiKeys: {
      openai: '',
      deepai: '',
      remove_bg: ''
    },
    
    // Message Configuration
    messages: {
      wait: '⏳ Please wait...',
      success: '✅ Success!',
      error: '❌ Error occurred!',
      ownerOnly: '👑 This command is only for bot owner!',
      adminOnly: '🛡️ This command is only for group admins!',
      groupOnly: '👥 This command can only be used in groups!',
      privateOnly: '💬 This command can only be used in private chat!',
      botAdminNeeded: '🤖 Bot needs to be admin to execute this command!',
      invalidCommand: '❓ Invalid command! Type .menu for help'
    },
    
    // Timezone
    timezone: 'Asia/Kolkata',
    
    // Limits
    maxWarnings: 3,
    
    // Social Links
    social: {
      github: 'https://github.com/TOM-PRIME-X-MINI-BOT/TOM-PRIME-X-WATHAPP-BOT',
      facebook: 'https://www.facebook.com/majidul.islam.zihad',
      youtube: 'https://youtube.com/@saycotom?si=4uI2q7LKL1Rl4cWK'
    }
};
