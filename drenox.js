/**
 * Mini Bot - Main Command Handler (drenox.js style)
 * Single-file command handler integrated with handler.js
 * This file wraps handler.js and provides the first-bot style interface
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Import from bot2's handler (preserving all existing functionality)
const handler = require('./handler');

// Import command loader
const { loadCommands } = require('./utils/commandLoader');

// Import config
const config = require('./config');

// Import database
const database = require('./database');

// Group metadata cache (for first-bot style compatibility)
const groupMetadataCache = new Map();
const CACHE_TTL = 60000;

async function refreshGroupMetadata(sock, groupId) {
  try {
    if (!groupId || !groupId.endsWith('@g.us')) return null;
    const metadata = await sock.groupMetadata(groupId);
    groupMetadataCache.set(groupId, {
      data: metadata,
      timestamp: Date.now()
    });
    return metadata;
  } catch (error) {
    return groupMetadataCache.get(groupId)?.data || null;
  }
}

async function checkAdminStatus(sock, groupId, userId) {
  try {
    if (!groupId || !groupId.endsWith('@g.us')) return false;
    const metadata = await refreshGroupMetadata(sock, groupId);
    if (!metadata || !metadata.participants) return false;
    const participant = metadata.participants.find(p => {
      const id = p.id || p.jid;
      return id && id.split('@')[0] === userId;
    });
    return participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
  } catch (error) {
    return false;
  }
}

// ================================================================
// MAIN MESSAGE HANDLER - First bot style interface
// This is the function that pair.js calls when a message arrives
// ================================================================
async function handleMessage(bad, m, chatUpdate, store) {
  try {
    // Convert first-bot style message object to second-bot style msg object
    // and pass to the existing handler
    
    // Build a WhatsApp-style msg object from the parsed message
    const msg = buildMsgObject(bad, m);
    
    if (!msg || !msg.key) return;
    
    // Pass to the main handler
    await handler.handleMessage(bad, msg);
    
  } catch (error) {
    console.error(chalk.red('❌ Command handler error:'), error.message);
  }
}

// Build msg object compatible with handler.js expectations
function buildMsgObject(sock, m) {
  try {
    const msg = {
      key: {
        remoteJid: m.chat,
        fromMe: m.isBaileys || (m.sender && m.sender === sock.user?.id?.split(':')[0] + '@s.whatsapp.net'),
        participant: m.isGroup ? m.participant || m.sender : null,
        id: m.id || `MSG_${Date.now()}`,
        server_id: m.id || Date.now().toString()
      },
      message: {}
    };
    
    // Set message type based on mtype
    if (m.mtype === 'conversation') {
      msg.message = { conversation: m.body || '' };
    } else if (m.mtype === 'extendedTextMessage') {
      msg.message = { extendedTextMessage: { text: m.body || '', contextInfo: m.msg?.contextInfo || {} } };
    } else if (m.mtype === 'imageMessage') {
      msg.message = { imageMessage: { caption: m.body || '', contextInfo: m.msg?.contextInfo || {} } };
    } else if (m.mtype === 'videoMessage') {
      msg.message = { videoMessage: { caption: m.body || '', contextInfo: m.msg?.contextInfo || {} } };
    } else if (m.mtype === 'documentMessage') {
      msg.message = { documentMessage: { caption: m.body || '', contextInfo: m.msg?.contextInfo || {} } };
    } else if (m.mtype === 'buttonsResponseMessage') {
      msg.message = { buttonsResponseMessage: { selectedButtonId: m.msg?.selectedButtonId || m.body } };
    } else if (m.mtype === 'listResponseMessage') {
      msg.message = { listResponseMessage: { singleSelectReply: { selectedRowId: m.msg?.singleSelectReply?.selectedRowId || m.body } } };
    } else if (m.mtype === 'stickerMessage') {
      msg.message = { stickerMessage: {} };
    } else if (m.mtype === 'audioMessage') {
      msg.message = { audioMessage: { contextInfo: m.msg?.contextInfo || {} } };
    } else if (m.mtype === 'ephemeralMessage') {
      msg.message = { ephemeralMessage: { message: m.msg?.message || {} } };
    } else {
      // Try to pass through the raw message
      msg.message = m.message || m.msg || {};
    }
    
    return msg;
  } catch (e) {
    return null;
  }
}

// Setup event listeners for group updates, anti-delete, etc.
function setupEventListeners(sock, store) {
  // Group participant updates (welcome/goodbye)
  sock.ev.on('group-participants.update', async (update) => {
    try {
      await handler.handleGroupUpdate(sock, update);
    } catch (err) {
      console.error('Group update error:', err.message);
    }
  });

  // Anti-delete handler
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    try {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;
        const from = msg.key.remoteJid;
        if (!from || !from.endsWith('@g.us')) continue;
        
        const groupSettings = database.getGroupSettings(from);
        if (!groupSettings.antidelete) continue;
        
        // Store message for potential anti-delete
        if (store && msg.message) {
          if (!global._antideleteStore) global._antideleteStore = new Map();
          global._antideleteStore.set(msg.key.id, { msg, timestamp: Date.now() });
        }
      }
    } catch (err) {}
  });

  // Anti-call feature
  try {
    handler.initializeAntiCall(sock);
  } catch (err) {}

  // Newsletter auto-react
  const NEWSLETTER_REACTIONS = ["❤️", "🔥", "👍", "🌚", "😮", "🫠", "✨", "🥰", "🖤", "🎉", "🌝", "😍"];
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    try {
      for (const msg of messages) {
        if (!msg.key || !msg.key.remoteJid || !msg.key.remoteJid.endsWith('@newsletter')) continue;
        if (msg.key.remoteJid !== config.newsletterJid) continue;
        
        const jid = msg.key.remoteJid;
        const id = msg.key.id;
        
        setTimeout(async () => {
          try {
            const reaction = NEWSLETTER_REACTIONS[Math.floor(Math.random() * NEWSLETTER_REACTIONS.length)];
            await sock.sendMessage(jid, { react: { text: reaction, key: msg.key } });
          } catch (e) {}
        }, Math.random() * 3000 + 3000);
      }
    } catch (err) {}
  });
}

// File watcher (first-bot style)
let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.redBright(`Update '${__filename}'`));
  delete require.cache[file];
  require(file);
});

// Export main handler (MUST BE FIRST - this is what pair.js imports)
module.exports = handleMessage;
module.exports.groupMetadataCache = groupMetadataCache;
module.exports.refreshGroupMetadata = refreshGroupMetadata;
module.exports.checkAdminStatus = checkAdminStatus;
module.exports.setupEventListeners = setupEventListeners;
