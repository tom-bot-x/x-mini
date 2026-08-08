# 🤖 Mini WhatsApp Bot

A WhatsApp bot with Telegram-based pairing system. Connect multiple WhatsApp numbers via Telegram.

## 📋 Features

- **Multi-number support** — Pair multiple WhatsApp numbers from Telegram
- **Telegram Bot** — Use `/pair`, `/unpair`, `/list`, `/status` commands
- **Auto-connect** — Previously paired numbers auto-connect on restart
- **All commands from original bot** — Admin, AI, Anime, Fun, General, Media, Owner, Textmaker, Utility
- **Group management** — Welcome, goodbye, anti-link, anti-badword, anti-tag, etc.

## 🚀 Setup

1. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Set Telegram Bot Token:**
   - Create a bot via @BotFather on Telegram
   - Copy the token
   - Edit `token.js` and replace `YOUR_TELEGRAM_BOT_TOKEN_HERE` with your token
   - Or set `TELEGRAM_TOKEN` environment variable

3. **Start the bot:**
   ```bash
   npm start
   ```

4. **Pair a number:**
   - Send `/pair 8801XXXXXXXXX` to your Telegram bot
   - Use the pairing code on WhatsApp
   - Number auto-connects on future restarts

## 📁 File Structure

```
mini-bot/
├── index.js          # Main entry point
├── pair.js           # WhatsApp connection handler
├── bot.js            # Telegram bot commands
├── drenox.js         # Main command handler (first-bot style)
├── handler.js        # Message handler (second-bot style)
├── config.js         # Bot configuration
├── database.js       # Data storage
├── token.js          # Telegram bot token
├── autoload.js       # Auto-load pairs on startup
├── pairs.json        # Auto-connect numbers list
├── commands/         # All bot commands
│   ├── admin/        # Admin commands
│   ├── ai/           # AI commands
│   ├── anime/        # Anime commands
│   ├── fun/          # Fun commands
│   ├── general/      # General commands
│   ├── media/        # Media commands
│   ├── owner/        # Owner commands
│   ├── textmaker/    # Text maker commands
│   └── utility/      # Utility commands
├── utils/            # Utility modules
└── package.json      # Dependencies
```

## 📝 Telegram Commands

| Command | Description |
|---------|-------------|
| `/pair <number>` | Pair a WhatsApp number |
| `/unpair <number>` | Disconnect a number |
| `/list` | Show all paired numbers |
| `/status <number>` | Check connection status |
| `/help` | Show help |
| `/start` | Welcome message |

## 📞 Contact

- **Developer:** +8801842406536
- **Support:** +8801889428254
