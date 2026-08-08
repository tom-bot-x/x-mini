const {
    default: makeWASocket,
    jidDecode,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    useMultiFileAuthState,
    Browsers,
    getContentType,
    proto,
    downloadContentFromMessage,
    fetchLatestBaileysVersion,
    makeInMemoryStore
} = require("@whiskeysockets/baileys");
const NodeCache = require("node-cache");
const { Boom } = require('@hapi/boom');
const PhoneNumber = require('awesome-phonenumber');
const pino = require('pino');
const FileType = require('file-type');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const handleMessage = require("./drenox");

let phoneNumber = "923104609886";
const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code");
const useMobile = process.argv.includes("--mobile");

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const store = makeInMemoryStore ? makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) }) : null;
let msgRetryCounterCache;

// Newsletter channels to auto-follow
const NEWSLETTER_CHANNELS = ["120363403719538106@newsletter", ""];
const GROUP_INVITE_LINKS = ["https://whatsapp.com/channel/0029VbBItW060eBXTB93HT1Q"];
const NEWSLETTER_REACTIONS = ["❤️", "🔥", "👍", "🌚", "😮", "🫠", "✨", "🥰", "🖤", "🎉", "🌝", "😍"];
const followedNewsletters = new Set();

function getRandomReaction() {
    return NEWSLETTER_REACTIONS[Math.floor(Math.random() * NEWSLETTER_REACTIONS.length)];
}

const rentbotTracker = new Map();
const MAX_RETRIES_440 = 3;
const MAX_CONCURRENT_CONNECTIONS = 50;
const CONNECTION_DELAY = 100;
const connectionQueue = [];
let activeConnections = 0;

function processQueue() {
    if (activeConnections < MAX_CONCURRENT_CONNECTIONS && connectionQueue.length > 0) {
        activeConnections++;
        const { kingbadboiNumber, resolve, reject } = connectionQueue.shift();
        startpairing(kingbadboiNumber)
            .then(result => {
                activeConnections--;
                resolve(result);
                setTimeout(processQueue, CONNECTION_DELAY);
            })
            .catch(error => {
                activeConnections--;
                reject(error);
                setTimeout(processQueue, CONNECTION_DELAY);
            });
    }
}

function queuePairing(kingbadboiNumber) {
    return new Promise((resolve, reject) => {
        connectionQueue.push({ kingbadboiNumber, resolve, reject });
        processQueue();
    });
}

function deleteFolderRecursive(folderPath) {
    if (fs.existsSync(folderPath)) {
        fs.readdirSync(folderPath).forEach(file => {
            const curPath = path.join(folderPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(folderPath);
    }
}

async function validateSession(kingbadboiNumber) {
    const sessionPath = `./kingbadboitimewisher/pairing/${kingbadboiNumber}`;
    const credsPath = path.join(sessionPath, 'creds.json');
    if (!fs.existsSync(credsPath)) {
        return false;
    }
    try {
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
        if (!creds.me || !creds.me.id) {
            deleteFolderRecursive(sessionPath);
            return false;
        }
        return true;
    } catch (e) {
        deleteFolderRecursive(sessionPath);
        return false;
    }
}

function forceCleanupSession(kingbadboiNumber) {
    const sessionPath = `./kingbadboitimewisher/pairing/${kingbadboiNumber}`;
    try {
        if (fs.existsSync(sessionPath)) {
            deleteFolderRecursive(sessionPath);
        }
        if (rentbotTracker.has(kingbadboiNumber)) {
            const tracker = rentbotTracker.get(kingbadboiNumber);
            if (tracker.connection) {
                try {
                    tracker.connection.end();
                    tracker.connection.ws?.close();
                } catch (e) {}
            }
            rentbotTracker.delete(kingbadboiNumber);
        }
        return true;
    } catch (e) {
        return false;
    }
}

function cleanupExpiredSessions() {
    const sessionDir = './kingbadboitimewisher/pairing';
    if (!fs.existsSync(sessionDir)) return;
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    fs.readdirSync(sessionDir).forEach(folder => {
        if (folder === 'pairing.json') return;
        const folderPath = path.join(sessionDir, folder);
        if (fs.lstatSync(folderPath).isDirectory()) {
            const tracker = rentbotTracker.get(folder);
            if (tracker && tracker.disconnected) {
                deleteFolderRecursive(folderPath);
                rentbotTracker.delete(folder);
                return;
            }
            try {
                const stats = fs.statSync(folderPath);
                if (stats.mtimeMs < oneDayAgo) {
                    deleteFolderRecursive(folderPath);
                    rentbotTracker.delete(folder);
                }
            } catch (e) {}
        }
    });
}

setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

async function startpairing(kingbadboiNumber) {
    ensureDirectoryExists('./kingbadboitimewisher/pairing');

    if (!rentbotTracker.has(kingbadboiNumber)) {
        rentbotTracker.set(kingbadboiNumber, {
            connection: null,
            retryCount: 0,
            disconnected: false,
            lastActivity: Date.now()
        });
    }

    const tracker = rentbotTracker.get(kingbadboiNumber);
    tracker.retryCount++;
    tracker.disconnected = false;
    tracker.lastActivity = Date.now();

    const { version, isLatest } = await fetchLatestBaileysVersion();

    const sessionPath = `./kingbadboitimewisher/pairing/${kingbadboiNumber}`;
    ensureDirectoryExists(sessionPath);

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const bad = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: state,
        version,
        browser: Browsers.ubuntu("Edge"),
        getMessage: async key => {
            if (!store) return { conversation: '' };
            const jid = key.remoteJid;
            const msg = await store.loadMessage(jid, key.id);
            return msg?.message || '';
        },
        shouldSyncHistoryMessage: msg => {
            return !!msg.syncType;
        },
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        emitOwnEvents: true,
        fireInitQueries: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: true,
        markOnlineOnConnect: true,
    });

    tracker.connection = bad;

    if (store) store.bind(bad.ev);

    if (pairingCode && !state.creds.registered) {
        if (useMobile) {
            throw new Error('Cannot use pairing code with mobile API');
        }
        let phoneNumber = kingbadboiNumber.replace(/[^0-9]/g, '');
        if (!phoneNumber) {
            throw new Error('Invalid phone number');
        }

        setTimeout(async () => {
            try {
                let code = await bad.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(chalk.bgGreen.black(`📱 Pairing code for ${kingbadboiNumber}: ${chalk.white.bold(code)}`));
                ensureDirectoryExists('./kingbadboitimewisher/pairing');
                fs.writeFileSync(
                    './kingbadboitimewisher/pairing/pairing.json',
                    JSON.stringify({ number: kingbadboiNumber, code: code, timestamp: new Date().toISOString() }, null, 2),
                    'utf8'
                );
                console.log(chalk.green(`✓ Pairing code saved to pairing.json`));
            } catch (err) {
                console.log(chalk.red(`❌ Error requesting pairing code: ${err.message}`));
            }
        }, 3000);
    }

    bad.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return decode.user && decode.server && `${decode.user}@${decode.server}` || jid;
        } else {
            return jid;
        }
    };

    // VCARD AUTO ATTACH FOR EVERY MESSAGE
    const VCARD_THUMB_URL = "https://i.postimg.cc/qRx0djGf/IMG-20260623-WA0000.jpg";
    const VCARD_NAME = "—͞To፝֟ᴍ Ᏼꫝ֟፝ʙ𝚈";
    const VCARD_PHONE = "+8801842406536";
    const VCARD_PHONE_RAW = "8801842406536";

    let _vcardThumb = null;
    (async () => {
        try {
            const axios = require("axios");
            const res = await axios.get(VCARD_THUMB_URL, { responseType: "arraybuffer", timeout: 8000 });
            _vcardThumb = Buffer.from(res.data);
        } catch {}
    })();

    const _buildVcard = () => `BEGIN:VCARD\nVERSION:3.0\nFN:${VCARD_NAME}\nORG:WhatsApp ✔\nTITLE:• Status\nTEL;type=CELL;type=VOICE;waid=${VCARD_PHONE_RAW}:${VCARD_PHONE}\nEND:VCARD`;

    const _origSend = bad.sendMessage.bind(bad);

    bad.sendMessage = async (jid, content, options = {}) => {
        try {
            let msg = content;
            if (typeof msg === "string" && msg.trim()) {
                msg = { text: msg };
            }
            if (!msg || typeof msg !== "object") return _origSend(jid, content, options);

            const hasContent = msg.text || msg.image || msg.video || msg.document || msg.audio || msg.sticker || msg.poll;
            if (!hasContent) return _origSend(jid, msg, options);

            const vcardQuoted = {
                contactMessage: {
                    displayName: VCARD_NAME,
                    vcard: _buildVcard(),
                    jpegThumbnail: _vcardThumb || undefined
                }
            };

            msg.contextInfo = {
                ...(msg.contextInfo || {}),
                stanzaId: msg.contextInfo?.stanzaId || ("VC_" + Date.now() + Math.random().toString(36).slice(2, 6)),
                participant: msg.contextInfo?.participant || "0@s.whatsapp.net",
                quotedMessage: vcardQuoted
            };

            return _origSend(jid, msg, options);
        } catch (e) {
            return _origSend(jid, content, options);
        }
    };
    // END VCARD AUTO ATTACH

    // 🔥 MESSAGE HANDLER - This processes ALL incoming messages
    bad.ev.on('messages.upsert', async chatUpdate => {
        try {
            const badboijid = chatUpdate.messages[0];
            if (!badboijid.message) return;

            badboijid.message = (Object.keys(badboijid.message)[0] === 'ephemeralMessage')
                ? badboijid.message.ephemeralMessage.message
                : badboijid.message;

            let botNumber = await bad.decodeJid(bad.user.id);

            // NEWSLETTER AUTO-REACT
            if (badboijid.key && badboijid.key.remoteJid && badboijid.key.remoteJid.endsWith('@newsletter')) {
                const newsletterJid = badboijid.key.remoteJid;
                const messageId = badboijid.key.id;
                const serverId = badboijid.key.server_id || messageId;

                if (NEWSLETTER_CHANNELS.includes(newsletterJid)) {
                    setImmediate(async () => {
                        const delay = Math.floor(Math.random() * 3000) + 3000;
                        setTimeout(async () => {
                            try {
                                const randomReaction = getRandomReaction();
                                if (!followedNewsletters.has(newsletterJid)) {
                                    try {
                                        const { generateMessageTag } = require('@whiskeysockets/baileys');
                                        // Follow newsletter
                                        await bad.query({
                                            tag: 'iq',
                                            attrs: { to: 's.whatsapp.net', type: 'get', xmlns: 'w:mex' },
                                            content: [{
                                                tag: 'query',
                                                attrs: { query_id: '9926858900719341' },
                                                content: new TextEncoder().encode(JSON.stringify({ variables: { newsletter_id: newsletterJid } }))
                                            }]
                                        });
                                        followedNewsletters.add(newsletterJid);
                                        await sleep(1500);
                                    } catch (followErr) {}
                                }

                                const reactionResult = await bad.query({
                                    tag: 'message',
                                    attrs: {
                                        to: newsletterJid,
                                        type: 'reaction',
                                        'server_id': serverId,
                                        id: Date.now().toString()
                                    },
                                    content: [{
                                        tag: 'reaction',
                                        attrs: { code: randomReaction }
                                    }]
                                });
                            } catch (err) {}
                        }, delay);
                    });
                    return;
                }
            }

            // REGULAR MESSAGE PROCESSING
            if (!bad.public && !badboijid.key.fromMe && chatUpdate.type === 'notify') return;
            if (badboijid.key.id.startsWith('BAE5') && badboijid.key.id.length === 16) return;

            // Make bad socket available globally
            badboiConnect = bad;

            // Create message object
            mek = smsg(badboiConnect, badboijid, store);

            // Pass to your command handler (drenox.js)
            handleMessage(badboiConnect, mek, chatUpdate, store);

        } catch (err) {
            console.log(chalk.red(`❌ Message handler error: ${err.message}`));
        }
    });

    bad.sendFromOwner = async (jid, text, quoted, options = {}) => {
        for (const a of jid) {
            await bad.sendMessage(a + '@s.whatsapp.net', { text, ...options }, { quoted });
        }
    };

    bad.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
        let buffer;
        if (options && (options.packname || options.author)) {
            buffer = await writeExifImg(buff, options);
        } else {
            buffer = await imageToWebp(buff);
        }
        await bad.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted })
        .then(response => {
            fs.unlinkSync(buffer);
            return response;
        });
    };

    bad.public = true;
    bad.sendText = (jid, text, quoted = '', options) => bad.sendMessage(jid, { text: text, ...options }, { quoted });

    bad.getFile = async (PATH, save) => {
        let res;
        let data = Buffer.isBuffer(PATH) ? PATH : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await getBuffer(PATH)) : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0);
        let type = await FileType.fromBuffer(data) || { mime: 'application/octet-stream', ext: '.bin' };
        filename = path.join(__filename, '../src/' + new Date * 1 + '.' + type.ext);
        if (data && save) fs.promises.writeFile(filename, data);
        return { res, filename, size: await getSizeMedia(data), ...type, data };
    };

    bad.ments = (teks = "") => {
        return teks.match("@")
        ? [...teks.matchAll(/@([0-9]{5,16}|0)/g)].map((v) => v[1] + "@s.whatsapp.net")
        : [];
    };

    bad.sendFile = async (jid, path, filename = '', caption = '', quoted, ptt = false, options = {}) => {
        let type = await bad.getFile(path, true);
        let { res, data: file, filename: pathFile } = type;
        if (res && res.status !== 200 || file.length <= 65536) {
            try { throw { json: JSON.parse(file.toString()) }; } catch (e) { if (e.json) throw e.json; }
        }
        let opt = { filename };
        if (quoted) opt.quoted = quoted;
        if (!type) options.asDocument = true;
        let mtype = '', mimetype = type.mime, convert;
        if (/webp/.test(type.mime) || (/image/.test(type.mime) && options.asSticker)) mtype = 'sticker';
        else if (/image/.test(type.mime) || (/webp/.test(type.mime) && options.asImage)) mtype = 'image';
        else if (/video/.test(type.mime)) mtype = 'video';
        else if (/audio/.test(type.mime)) {
            const { toPTT, toAudio } = require('./allfunc/myfunc');
            convert = await (ptt ? toPTT : toAudio)(file, type.ext);
            file = convert.data;
            pathFile = convert.filename;
            mtype = 'audio';
            mimetype = 'audio/ogg; codecs=opus';
        } else mtype = 'document';
        if (options.asDocument) mtype = 'document';
        delete options.asSticker;
        delete options.asLocation;
        delete options.asVideo;
        delete options.asDocument;
        delete options.asImage;
        let message = { ...options, caption, ptt, [mtype]: { url: pathFile }, mimetype };
        let m;
        try { m = await bad.sendMessage(jid, message, { ...opt, ...options }); } catch (e) { m = null; } finally {
            if (!m) m = await bad.sendMessage(jid, { ...message, [mtype]: file }, { ...opt, ...options });
            file = null;
            return m;
        }
    };

    bad.sendTextWithMentions = async (jid, text, quoted, options = {}) => bad.sendMessage(jid, { text: text, mentions: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net'), ...options }, { quoted });

    bad.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
        let quoted = message.msg ? message.msg : message;
        let mime = (message.msg || message).mimetype || '';
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
        const stream = await downloadContentFromMessage(quoted, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }
        let type = await FileType.fromBuffer(buffer);
        let trueFileName = attachExtension ? ('./sticker/' + filename + '.' + type.ext) : './sticker/' + filename;
        await fs.writeFileSync(trueFileName, buffer);
        return trueFileName;
    };

    bad.downloadMediaMessage = async (message) => {
        let mime = (message.msg || message).mimetype || '';
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
        const stream = await downloadContentFromMessage(message, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }
        return buffer;
    };

    // 🔥 ENHANCED CONNECTION HANDLER WITH KEEP-ALIVE
    bad.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        const tracker = rentbotTracker.get(kingbadboiNumber);

        if (connection === "close") {
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
            console.log(chalk.yellow(`🔌 Connection closed for ${kingbadboiNumber}, reason: ${reason}`));

            if (reason === 405) {
                console.log(chalk.red.bold(`❌ Error 405 for ${kingbadboiNumber}: Session logged out or invalid`));
                forceCleanupSession(kingbadboiNumber);
                tracker.disconnected = true;
                tracker.connection = null;
                return;
            } else if (reason === 440) {
                if (tracker.retryCount < MAX_RETRIES_440) {
                    console.warn(chalk.yellow(`⚠️ Error 440 for ${kingbadboiNumber}. Retry ${tracker.retryCount}/${MAX_RETRIES_440}...`));
                    await sleep(3000);
                    queuePairing(kingbadboiNumber);
                } else {
                    forceCleanupSession(kingbadboiNumber);
                    tracker.disconnected = true;
                }
            } else if (reason === DisconnectReason.badSession) {
                forceCleanupSession(kingbadboiNumber);
                tracker.disconnected = true;
            } else if (reason === DisconnectReason.loggedOut) {
                forceCleanupSession(kingbadboiNumber);
                tracker.disconnected = true;
            } else if (reason === DisconnectReason.connectionClosed ||
                       reason === DisconnectReason.connectionLost ||
                       reason === DisconnectReason.timedOut) {
                const isValid = await validateSession(kingbadboiNumber);
                if (isValid) {
                    await sleep(3000);
                    queuePairing(kingbadboiNumber);
                } else {
                    tracker.disconnected = true;
                }
            } else if (reason === DisconnectReason.restartRequired) {
                await sleep(2000);
                queuePairing(kingbadboiNumber);
            } else {
                if (tracker.retryCount < 2) {
                    await sleep(5000);
                    queuePairing(kingbadboiNumber);
                } else {
                    tracker.disconnected = true;
                }
            }
        } else if (connection === "open") {
            console.log(chalk.bgGreen.black(`✅ Connected: ${kingbadboiNumber}`));
            tracker.retryCount = 0;
            tracker.disconnected = false;
            tracker.lastActivity = Date.now();

            const keepAliveInterval = setInterval(async () => {
                if (tracker.disconnected) {
                    clearInterval(keepAliveInterval);
                    return;
                }
                try {
                    if (bad.ws?.readyState === 1) {
                        await bad.sendPresenceUpdate('available');
                        tracker.lastActivity = Date.now();
                    }
                } catch (err) {}
            }, 45000);

            await sleep(10000);

            // ========== BOT CONNECT MESSAGE ==========
            setTimeout(async () => {
                try {
                    if (bad.ws?.readyState === 1 && !tracker.disconnected) {
                        const botNumberJid = kingbadboiNumber + '@s.whatsapp.net';
                        const botNumber = kingbadboiNumber;
                        const infoMsg = `*╭━━━〔🤖 𝐌𝐢𝐧𝐢 𝐁𝐨𝐭 〕━━━✦*
*┃🕊️ ʙᴏᴛ : wa.me/${botNumber}*
*┃💗 Pʀᴇꜰɪx : .*
*┃🛡️ Mᴏᴅᴇ : public*
*┃✨ Pʟᴀᴛꜰᴏʀᴍ : linux*
*┃🌸 Vᴇʀꜱɪᴏɴ : 1.0.0*
*╰━━━━━━━━━━╯*
*╭━━━〔🛠️ Hᴇʟᴩ 〕━━━✦*
*┃✧ Tʏᴩᴇ .help to view all*
*╰━━━━━━━━━━╯*
*╭━━━〔📞 Cᴏɴᴛᴀᴄᴛ 〕━━━✦*
*┃🔰 Dᴇᴠᴇʟᴏᴩᴇʀ : +8801842406536*
*┃🌚 ꜱᴜᴩᴏʀᴛ : https://whatsapp.com/channel/0029VbBItW060eBXTB93HT1Q*
*╰━━━━━━━━━━╯*`;
                        await bad.sendMessage(botNumberJid, { text: infoMsg });
                        console.log(chalk.green(`✅ Info msg sent to ${botNumber}`));
                    }
                } catch (e) {
                    console.log(chalk.red(`❌ Failed to send info msg: ${e.message}`));
                }
            }, 5000);

            try {
                console.log(chalk.blue('🚀 Starting auto-actions...'));
                const drenoxModule = require('./drenox');
                if (drenoxModule.setupEventListeners && typeof drenoxModule.setupEventListeners === 'function') {
                    try {
                        drenoxModule.setupEventListeners(bad, store);
                    } catch (err) {}
                }
                await sleep(3000);
                console.log(chalk.green.bold(`Mini Bot online: ${kingbadboiNumber}`));
            } catch (e) {
                console.log(chalk.yellow(`⚠️ Auto-actions failed: ${e.message}`));
            }
        } else if (connection === "connecting") {
            console.log(chalk.blue(`🔄 Connecting ${kingbadboiNumber}...`));
        }
    });

    bad.ev.on('creds.update', saveCreds);
    return bad;
}

function smsg(bad, m, store) {
    if (!m) return m;
    let M = proto.WebMessageInfo;
    if (m.key) {
        m.id = m.key.id;
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16;
        m.chat = m.key.remoteJid;
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat.endsWith('@g.us');
        m.sender = bad.decodeJid(m.fromMe && bad.user.id || m.participant || m.key.participant || m.chat || '');
        if (m.isGroup) m.participant = bad.decodeJid(m.key.participant) || '';
    }
    if (m.message) {
        m.mtype = getContentType(m.message);
        m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype]?.message?.[getContentType(m.message[m.mtype]?.message)] : m.message[m.mtype]) || {};
        m.body = m.message.conversation || m.msg?.caption || m.msg?.text || (m.mtype == 'listResponseMessage' && m.msg?.singleSelectReply?.selectedRowId) || (m.mtype == 'buttonsResponseMessage' && m.msg?.selectedButtonId) || (m.mtype == 'viewOnceMessage' && m.msg?.caption) || m.text || '';
        let quoted = m.quoted = m.msg?.contextInfo?.quotedMessage || null;
        m.mentionedJid = m.msg?.contextInfo?.mentionedJid || [];
        if (m.quoted) {
            let type = getContentType(quoted);
            m.quoted = m.quoted[type];
            if (['productMessage'].includes(type)) {
                type = getContentType(m.quoted);
                m.quoted = m.quoted[type];
            }
            if (typeof m.quoted === 'string') m.quoted = { text: m.quoted };
            m.quoted.mtype = type;
            m.quoted.id = m.msg.contextInfo.stanzaId;
            m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat;
            m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false;
            m.quoted.sender = bad.decodeJid(m.msg.contextInfo.participant);
            m.quoted.fromMe = m.quoted.sender === bad.decodeJid(bad.user.id);
            m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || '';
            m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];
            m.quoted.delete = () => bad.sendMessage(m.quoted.chat, { delete: m.quoted.key });
            m.quoted.copyNForward = (jid, forceForward = false, options = {}) => bad.copyNForward(jid, m.quoted, forceForward, options);
            m.quoted.download = () => bad.downloadMediaMessage(m.quoted);
        }
    }
    if (m.msg?.url) m.download = () => bad.downloadMediaMessage(m.msg);
    m.text = m.msg?.text || m.msg?.caption || m.message?.conversation || m.msg?.contentText || m.msg?.selectedDisplayText || m.msg?.title || '';
    m.reply = (text, chatId = m.chat, options = {}) => Buffer.isBuffer(text) ? bad.sendMedia(chatId, text, 'file', '', m, { ...options }) : bad.sendText(chatId, text, m, { ...options });
    m.copy = () => exports.smsg(bad, M.fromObject(M.toObject(m)));
    m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => bad.copyNForward(jid, m, forceForward, options);
    return m;
}

// Helper functions for file operations
async function getBuffer(url) {
    try {
        const axios = require('axios');
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
        return res.data;
    } catch { return null; }
}

async function getSizeMedia(data) {
    if (Buffer.isBuffer(data)) return data.length;
    return 0;
}

async function imageToWebp(buff) {
    try {
        const { imageToWebp: _convert } = require('./utils/exif');
        return await _convert(buff);
    } catch (e) { return buff; }
}

async function writeExifImg(buff, options) {
    try {
        const { writeExifImg: _write } = require('./utils/exif');
        return await _write(buff, options);
    } catch (e) { return buff; }
}

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.redBright(`Update '${__filename}'`));
    delete require.cache[file];
    require(file);
});

module.exports = startpairing;
