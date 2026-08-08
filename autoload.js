const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Auto-load paired numbers from pairs.json on startup
const PAIRS_FILE = path.join(__dirname, 'pairs.json');

function loadAutoPairs() {
  try {
    if (fs.existsSync(PAIRS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PAIRS_FILE, 'utf8'));
      return Array.isArray(data) ? data : (data.numbers || []);
    }
  } catch (e) {
    console.log(chalk.yellow('⚠️ Could not load auto-pairs'));
  }
  return [];
}

module.exports = { loadAutoPairs };
