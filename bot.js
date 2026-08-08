const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Token loader
function getTelegramToken() {
  // Try from token.js first
  try {
    const tokenModule = require('./token');
    if (tokenModule.token) return tokenModule.token;
  } catch (e) {}
  // Try from env
  return process.env.TELEGRAM_TOKEN || '';
}

// Pairs file path
const PAIRS_FILE = path.join(__dirname, 'pairs.json');

function loadPairs() {
  try {
    if (fs.existsSync(PAIRS_FILE)) {
      return JSON.parse(fs.readFileSync(PAIRS_FILE, 'utf8'));
    }
  } catch (e) {}
  return [];
}

function savePairs(pairs) {
  fs.writeFileSync(PAIRS_FILE, JSON.stringify(pairs, null, 2), 'utf8');
}

function removePair(number) {
  const pairs = loadPairs();
  const cleanNum = number.replace(/[^0-9]/g, '');
  const filtered = pairs.filter(p => p.replace(/[^0-9]/g, '') !== cleanNum);
  savePairs(filtered);
  // Also clean session
  try {
    const sessionPath = `./kingbadboitimewisher/pairing/${cleanNum}`;
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
  } catch (e) {}
  return filtered;
}

function addPair(number) {
  const pairs = loadPairs();
  const cleanNum = number.replace(/[^0-9]/g, '');
  if (!pairs.includes(cleanNum)) {
    pairs.push(cleanNum);
  }
  savePairs(pairs);
  return pairs;
}

// Active pairing sessions
const activePairings = new Map();

function startTelegramBot(startpairing) {
  const token = getTelegramToken();
  
  if (!token) {
    console.log(chalk.red('❌ No Telegram bot token found!'));
    console.log(chalk.yellow('Please set TELEGRAM_TOKEN in .env or token.js'));
    return;
  }

  const bot = new TelegramBot(token, { polling: true });

  console.log(chalk.green('✅ Telegram bot started!'));

  // /start command
  bot.onText(/\/start/, async (msg) => {
    try {
      const chatId = msg.chat.id;
      const welcomeMsg = `*╭━━━〔🤖 𝐌𝐢𝐧𝐢 𝐁𝐨𝐭〕━━━✦*
*┃📱 𝚄𝚜𝚎 /𝚙𝚊𝚒𝚛 <𝚗𝚞𝚖𝚋𝚎𝚛> 𝚝𝚘 𝚌𝚘𝚗𝚗𝚎𝚌𝚝*
*┃📋 𝚄𝚜𝚎 /𝚕𝚒𝚜𝚝 𝚝𝚘 𝚜𝚎𝚎 𝚙𝚊𝚒𝚛𝚎𝚍 𝚗𝚞𝚖𝚋𝚎𝚛𝚜*
*┃🗑️ 𝚄𝚜𝚎 /𝚞𝚗𝚙𝚊𝚒𝚛 <𝚗𝚞𝚖𝚋𝚎𝚛> 𝚝𝚘 𝚍𝚒𝚜𝚌𝚘𝚗𝚗𝚎𝚌𝚝*
*┃❓ 𝚄𝚜𝚎 /𝚑𝚎𝚕𝚙 𝚏𝚘𝚛 𝚊𝚕𝚕 𝚌𝚘𝚖𝚖𝚊𝚗𝚍𝚜*
*╰━━━━━━━━━━╯*`;
      await bot.sendMessage(chatId, welcomeMsg, { parse_mode: 'Markdown' });
    } catch (e) {
      console.log(chalk.red('Error in /start:', e.message));
    }
  });

  // /help command
  bot.onText(/\/help/, async (msg) => {
    try {
      const chatId = msg.chat.id;
      const helpMsg = `*╭━━━〔📋 𝐇𝐞𝐥𝐩〕━━━✦*
*┃ /pair <number> - Pair WhatsApp number*
*┃ /unpair <number> - Disconnect number*
*┃ /list - Show all paired numbers*
*┃ /status <number> - Check connection status*
*┃ /start - Welcome message*
*┃ /help - Show this help*
*╰━━━━━━━━━━╯*`;
      await bot.sendMessage(chatId, helpMsg, { parse_mode: 'Markdown' });
    } catch (e) {
      console.log(chalk.red('Error in /help:', e.message));
    }
  });

  // /pair command - Main pairing command
  bot.onText(/\/pair\s+(.+)/, async (msg, match) => {
    try {
      const chatId = msg.chat.id;
      let number = match[1].trim().replace(/[^0-9]/g, '');
      
      if (!number) {
        await bot.sendMessage(chatId, '❌ Invalid number! Use: /pair 8801XXXXXXXXX');
        return;
      }

      // Remove country code if user adds it
      if (number.startsWith('00')) {
        number = number.slice(2);
      }
      
      if (number.length < 10 || number.length > 15) {
        await bot.sendMessage(chatId, '❌ Invalid number length! Use format: /pair 8801XXXXXXXXX');
        return;
      }

      const cleanNum = number;
      const sessionPath = `./kingbadboitimewisher/pairing/${cleanNum}`;

      // Check if already paired and active
      if (fs.existsSync(path.join(sessionPath, 'creds.json'))) {
        await bot.sendMessage(chatId, `⚠️ Number *${cleanNum}* is already paired!\nUse /unpair ${cleanNum} to disconnect first.`, { parse_mode: 'Markdown' });
        return;
      }

      await bot.sendMessage(chatId, `⏳ Starting pairing for *${cleanNum}*...\nPlease wait...`, { parse_mode: 'Markdown' });

      // Add to auto-connect list
      addPair(cleanNum);

      try {
        const result = await startpairing(cleanNum);
        
        // Wait for pairing code to be generated
        await sleep(8000);
        
        // Check for pairing code
        const pairingFilePath = './kingbadboitimewisher/pairing/pairing.json';
        if (fs.existsSync(pairingFilePath)) {
          const pairingData = JSON.parse(fs.readFileSync(pairingFilePath, 'utf8'));
          if (pairingData.number === cleanNum) {
            const pairMsg = `*╭━━━〔📱 𝐏𝐚𝐢𝐫𝐢𝐧𝐠〕━━━✦*
*┃ 𝙽𝚞𝚖𝚋𝚎𝚛: ${cleanNum}*
*┃ 𝙲𝚘𝚍𝚎: ${pairingData.code}*
*┃ 𝙲𝚘𝚙𝚢 𝚊𝚗𝚍 𝚞𝚜𝚎 𝚒𝚗 𝚆𝚑𝚊𝚝𝚜𝙰𝚙𝚙*
*╰━━━━━━━━━━╯*`;
            await bot.sendMessage(chatId, pairMsg, { parse_mode: 'Markdown' });
          }
        } else {
          await bot.sendMessage(chatId, `✅ Connection initiated for *${cleanNum}*\nCheck your WhatsApp for pairing instructions.`, { parse_mode: 'Markdown' });
        }
      } catch (err) {
        await bot.sendMessage(chatId, `❌ Pairing failed: ${err.message}`);
      }
    } catch (e) {
      console.log(chalk.red('Error in /pair:', e.message));
    }
  });

  // /unpair command
  bot.onText(/\/unpair\s+(.+)/, async (msg, match) => {
    try {
      const chatId = msg.chat.id;
      let number = match[1].trim().replace(/[^0-9]/g, '');
      
      if (!number) {
        await bot.sendMessage(chatId, '❌ Invalid number! Use: /unpair 8801XXXXXXXXX');
        return;
      }

      const remaining = removePair(number);
      
      await bot.sendMessage(chatId, `✅ *${number}* disconnected successfully!\n${remaining.length} number(s) remaining.`, { parse_mode: 'Markdown' });
    } catch (e) {
      console.log(chalk.red('Error in /unpair:', e.message));
    }
  });

  // /list command - Show all paired numbers
  bot.onText(/\/list/, async (msg) => {
    try {
      const chatId = msg.chat.id;
      const pairs = loadPairs();
      
      if (pairs.length === 0) {
        await bot.sendMessage(chatId, '📋 *No paired numbers found!*\nUse /pair <number> to add one.', { parse_mode: 'Markdown' });
        return;
      }

      let listMsg = `*╭━━━〔📋 𝐏𝐚𝐢𝐫𝐞𝐝 𝐍𝐮𝐦𝐛𝐞𝐫𝐬〕━━━✦*\n`;
      pairs.forEach((num, i) => {
        const isConnected = fs.existsSync(`./kingbadboitimewisher/pairing/${num}/creds.json`);
        const status = isConnected ? '🟢' : '🔴';
        listMsg += `*┃ ${i + 1}. ${status} ${num}*\n`;
      });
      listMsg += `*╰━━━━━━━━━━━━━━━━━━╯*\n📊 Total: ${pairs.length} number(s)`;
      
      await bot.sendMessage(chatId, listMsg, { parse_mode: 'Markdown' });
    } catch (e) {
      console.log(chalk.red('Error in /list:', e.message));
    }
  });

  // /status command - Check specific number status
  bot.onText(/\/status\s+(.+)/, async (msg, match) => {
    try {
      const chatId = msg.chat.id;
      let number = match[1].trim().replace(/[^0-9]/g, '');
      
      if (!number) {
        await bot.sendMessage(chatId, '❌ Invalid number! Use: /status 8801XXXXXXXXX');
        return;
      }

      const sessionPath = `./kingbadboitimewisher/pairing/${number}`;
      const isConnected = fs.existsSync(path.join(sessionPath, 'creds.json'));
      const isPaired = loadPairs().includes(number);
      
      let statusMsg = `*╭━━━〔📊 𝐒𝐭𝐚𝐭𝐮𝐬〕━━━✦*\n`;
      statusMsg += `*┃ 𝙽𝚞𝚖𝚋𝚎𝚛: ${number}*\n`;
      statusMsg += `*┃ 𝙿𝚊𝚒𝚛𝚎𝚍: ${isPaired ? '✅ Yes' : '❌ No'}*\n`;
      statusMsg += `*┃ 𝙲𝚘𝚗𝚗𝚎𝚌𝚝𝚎𝚍: ${isConnected ? '🟢 Yes' : '🔴 No'}*\n`;
      statusMsg += `*╰━━━━━━━━━━╯*`;
      
      await bot.sendMessage(chatId, statusMsg, { parse_mode: 'Markdown' });
    } catch (e) {
      console.log(chalk.red('Error in /status:', e.message));
    }
  });

  // Handle messages without command
  bot.on('message', async (msg) => {
    try {
      const text = msg.text;
      if (text && !text.startsWith('/')) {
        // Check if it's a phone number (for easy pairing)
        const cleaned = text.replace(/[^0-9]/g, '');
        if (cleaned.length >= 10 && cleaned.length <= 15) {
          const chatId = msg.chat.id;
          await bot.sendMessage(chatId, `🤔 Did you want to pair *${cleaned}*?\nUse: /pair ${cleaned}`, { parse_mode: 'Markdown' });
        }
      }
    } catch (e) {}
  });
}

module.exports = startTelegramBot;
