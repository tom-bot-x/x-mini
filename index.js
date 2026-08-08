require('events').EventEmitter.defaultMaxListeners = 500;
require('path');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const figlet = require('figlet');

// Import required modules
const startpairing = require("./pair");

// ==================== STARTUP BANNER ====================
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Cleanup puppeteer cache on exit
function cleanupPuppeteerCache() {
  const puppeteerCachePath = path.join(__dirname, '.cache', 'puppeteer');
  try {
    if (fs.existsSync(puppeteerCachePath)) {
      fs.rmSync(puppeteerCachePath, { recursive: true, force: true });
    }
  } catch (e) {}
}

// Clean stale pairing sessions on startup
function cleanStaleSessions() {
  const pairingDir = './kingbadboitimewisher/pairing';
  if (!fs.existsSync(pairingDir)) return;
  
  try {
    const entries = fs.readdirSync(pairingDir);
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    for (const entry of entries) {
      if (entry === 'pairing.json') continue;
      const entryPath = path.join(pairingDir, entry);
      const stats = fs.statSync(entryPath);
      
      // Delete old disconnected sessions (older than 7 days)
      if (stats.mtimeMs < sevenDaysAgo) {
        try {
          if (fs.lstatSync(entryPath).isDirectory()) {
            fs.rmSync(entryPath, { recursive: true, force: true });
          }
        } catch (e) {}
      }
    }
  } catch (e) {}
}

async function startBot() {
  try {
    console.log(chalk.cyan(figlet.textSync('Mini Bot')));
    console.log(chalk.cyan(`══════════════════════════════════════════════════`));
    console.log(chalk.cyan(`  🤖 Mini Bot Public`));
    console.log(chalk.cyan(`  STATUS: ONLINE`));
    console.log(chalk.cyan(`  PREFIX: .`));
    console.log(chalk.cyan(`  MODE: Public`));
    console.log(chalk.cyan(`  PLATFORM: Linux`));
    console.log(chalk.cyan(`  VERSION: 1.0.0`));
    console.log(chalk.cyan(`══════════════════════════════════════════════════`));

    cleanStaleSessions();
    
    // Load auto-connect numbers
    const pairsJsonPath = './pairs.json';
    let autoPairs = [];
    
    try {
      if (fs.existsSync(pairsJsonPath)) {
        const data = JSON.parse(fs.readFileSync(pairsJsonPath, 'utf8'));
        autoPairs = Array.isArray(data) ? data : (data.numbers || []);
      }
    } catch (e) {
      console.log(chalk.yellow('⚠️ Could not load pairs.json'));
    }

    // AUTO CONNECT OFF KORE DILAM
    if (autoPairs.length > 0) {
      console.log(chalk.yellow(`⚠️ pairs.json e ${autoPairs.length} ta number ache. Kintu auto-connect OFF ache.`));
      console.log(chalk.yellow(`   Pair korte chaile bot e giye number dao.`));
    } else {
      console.log(chalk.green(`✅ Auto-connect OFF. Manual pairing ready.`));
    }

    // Start Telegram bot for pairing
    try {
      const startTelegramBot = require('./bot');
      startTelegramBot(startpairing);
    } catch (err) {
      console.log(chalk.red(`❌ Telegram bot failed: ${err.message}`));
    }

  } catch (error) {
    console.error(chalk.red('Fatal error:', error));
    process.exit(1);
  }
}

cleanupPuppeteerCache();
startBot().catch(err => {
  console.error('Error starting bot:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});