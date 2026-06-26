const mineflayer = require('mineflayer');
const express = require('express');
const { execFile } = require('child_process');
const http = require('http');
const dns = require('dns');
const fs = require('fs');
const path = require('path');

// ============================================================
//  CẤU HÌNH — Ưu tiên: ENV vars > config.json > defaults
//  HuggingFace: dùng /data/ (persistent storage) để lưu config
// ============================================================

// Chọn đường dẫn config: /data/ (HF persistent) hoặc local
const HF_DATA_DIR = '/data';
const CONFIG_PATH = fs.existsSync(HF_DATA_DIR)
  ? path.join(HF_DATA_DIR, 'config.json')
  : path.join(__dirname, 'config.json');

console.log(`[CONFIG] 📂 Config path: ${CONFIG_PATH}`);

const DEFAULT_CONFIG = {
  host: 'play.example.com',
  port: 25565,
  username: 'BotTreoServer',
  version: '1.21.1',
  auth: 'offline',
  reconnectDelay: 30_000,
  maxReconnectDelay: 600_000,
  antiAfkInterval: 5_000,
  antiAfkJitter: 5_000,
  // Webhook
  webhookEnabled: false,
  discordWebhook: '',
  webhookProxy: '',
  // Anti-AFK
  antiAfkEnabled: true,
  // LoginSecurity plugin
  loginSecurityEnabled: false,
  botPassword: '',
  loginDelay: 1_500,
};

function loadConfig() {
  // Bước 1: Load từ file config.json (nếu tồn tại)
  let cfg = { ...DEFAULT_CONFIG };
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const saved = JSON.parse(raw);
      cfg = { ...cfg, ...saved };
      console.log('[CONFIG] 📄 Đã load config.json');
    }
  } catch (err) {
    console.log(`[CONFIG] ⚠️ Lỗi đọc config.json: ${err.message}`);
  }

  // Bước 2: Environment variables override (HuggingFace Secrets)
  // Cho phép user set qua HF Secrets nếu không muốn dùng web panel
  if (process.env.MC_HOST) cfg.host = process.env.MC_HOST;
  if (process.env.MC_PORT) cfg.port = parseInt(process.env.MC_PORT, 10);
  if (process.env.MC_USERNAME) cfg.username = process.env.MC_USERNAME;
  if (process.env.MC_VERSION) cfg.version = process.env.MC_VERSION;
  if (process.env.DISCORD_WEBHOOK_URL) {
    cfg.discordWebhook = process.env.DISCORD_WEBHOOK_URL;
    cfg.webhookEnabled = true;
  }
  if (process.env.WEBHOOK_PROXY) cfg.webhookProxy = process.env.WEBHOOK_PROXY;
  if (process.env.BOT_PASSWORD) {
    cfg.botPassword = process.env.BOT_PASSWORD;
    cfg.loginSecurityEnabled = true;
  }
  if (process.env.ANTI_AFK === 'false') cfg.antiAfkEnabled = false;
  if (process.env.WEBHOOK_ENABLED === 'false') cfg.webhookEnabled = false;

  return cfg;
}

function saveConfig(newConfig) {
  // Chỉ lưu các field user-configurable
  const toSave = {
    host: newConfig.host,
    port: newConfig.port,
    username: newConfig.username,
    version: newConfig.version,
    webhookEnabled: newConfig.webhookEnabled,
    discordWebhook: newConfig.discordWebhook,
    webhookProxy: newConfig.webhookProxy,
    antiAfkEnabled: newConfig.antiAfkEnabled,
    loginSecurityEnabled: newConfig.loginSecurityEnabled,
    botPassword: newConfig.botPassword,
  };

  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(toSave, null, 2), 'utf-8');
    console.log(`[CONFIG] 💾 Đã lưu config → ${CONFIG_PATH}`);
  } catch (err) {
    // Fallback: nếu không ghi được /data/, thử ghi local
    console.log(`[CONFIG] ⚠️ Không ghi được ${CONFIG_PATH}: ${err.message}`);
    try {
      const fallback = path.join(__dirname, 'config.json');
      fs.writeFileSync(fallback, JSON.stringify(toSave, null, 2), 'utf-8');
      console.log(`[CONFIG] 💾 Fallback → ${fallback}`);
    } catch (err2) {
      console.log(`[CONFIG] ❌ Không thể lưu config: ${err2.message}`);
    }
  }
}

// Load config
let CONFIG = loadConfig();

const PRISON = {
  centerY: 310,
  innerSize: 5,
};

// ============================================================
//  DISCORD WEBHOOK – Embed đẹp với màu sắc theo loại sự kiện
// ============================================================
const DISCORD_COLORS = {
  success: 0x2ecc71,  // Xanh lá — kết nối thành công
  error: 0xe74c3c,    // Đỏ — lỗi, disconnect
  warning: 0xf39c12,  // Vàng — cảnh báo (XRay, hack)
  info: 0x3498db,     // Xanh dương — thông tin chung
  offline: 0x95a5a6,  // Xám — bot offline
};

// Hàm gửi webhook qua Google Apps Script proxy (bypass HuggingFace chặn Discord)
async function _sendWebhook(payload) {
  if (!CONFIG.webhookEnabled) return;

  const webhookUrl = CONFIG.discordWebhook;
  const proxyUrl = CONFIG.webhookProxy;

  if (!webhookUrl) {
    console.log('[WEBHOOK] ⚠️ Thiếu webhook URL, bỏ qua');
    return;
  }

  // Nếu có proxy → gửi qua proxy, không có → gửi trực tiếp
  const targetUrl = proxyUrl || webhookUrl;
  const body = proxyUrl
    ? JSON.stringify({ webhook_url: webhookUrl, payload: payload })
    : JSON.stringify(payload);

  console.log(`[WEBHOOK] 📤 Gửi ${proxyUrl ? 'qua proxy' : 'trực tiếp'}... (${body.length} bytes)`);

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
      redirect: 'follow',
    });

    const text = await res.text();
    if (res.ok) {
      console.log(`[WEBHOOK] ✅ Gửi thành công (HTTP ${res.status})`);
    } else {
      console.log(`[WEBHOOK] ❌ HTTP ${res.status}: ${text.substring(0, 200)}`);
    }
  } catch (err) {
    console.log(`[WEBHOOK] ❌ Lỗi fetch: ${err.message}`);
  }
}

// Gửi embed đẹp lên Discord
function sendDiscord(content, color = DISCORD_COLORS.info) {
  _sendWebhook({
    embeds: [{
      description: content,
      color: color,
      footer: { text: `🤖 MC Bot | ${CONFIG.host}:${CONFIG.port}` },
      timestamp: new Date().toISOString(),
    }],
  });
}

// Gửi tin nhắn text thường (cho forward chat)
function sendDiscordText(content) {
  _sendWebhook({ content });
}

// ============================================================
//  WEB SERVER
// ============================================================
const app = express();
const PORT = process.env.PORT || 3000;
let botStatus = { online: false, lastLogin: null, lastError: null, position: null, reconnects: 0 };

// Parse JSON body
app.use(express.json());

// Serve static files (web panel)
app.use(express.static(path.join(__dirname, 'public')));

// --- API: Bot status ---
app.get('/api/status', (_req, res) => {
  res.json({
    online: botStatus.online,
    server: `${CONFIG.host}:${CONFIG.port}`,
    username: CONFIG.username,
    version: CONFIG.version,
    position: botStatus.position,
    lastLogin: botStatus.lastLogin,
    lastError: botStatus.lastError,
    reconnects: botStatus.reconnects,
    uptime: process.uptime().toFixed(0) + 's',
    memoryMB: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1),
  });
});

// --- API: Get config ---
app.get('/api/config', (_req, res) => {
  // Trả về config hiện tại (ẩn password một phần cho security, nhưng ở đây trả đầy đủ vì local)
  res.json({
    host: CONFIG.host,
    port: CONFIG.port,
    username: CONFIG.username,
    version: CONFIG.version,
    webhookEnabled: CONFIG.webhookEnabled,
    discordWebhook: CONFIG.discordWebhook,
    webhookProxy: CONFIG.webhookProxy,
    antiAfkEnabled: CONFIG.antiAfkEnabled,
    loginSecurityEnabled: CONFIG.loginSecurityEnabled,
    botPassword: CONFIG.botPassword,
  });
});

// --- API: Save config & restart bot ---
app.post('/api/config', (req, res) => {
  try {
    const body = req.body;

    // Validate
    if (!body.username || !body.host || !body.port) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc (username, host, port)' });
    }

    // Update CONFIG
    CONFIG.host = body.host;
    CONFIG.port = parseInt(body.port, 10) || 25565;
    CONFIG.username = body.username;
    CONFIG.version = body.version || '1.21.1';
    CONFIG.webhookEnabled = body.webhookEnabled === true;
    CONFIG.discordWebhook = body.discordWebhook || '';
    CONFIG.webhookProxy = body.webhookProxy || '';
    CONFIG.antiAfkEnabled = body.antiAfkEnabled !== false;
    CONFIG.loginSecurityEnabled = body.loginSecurityEnabled === true;
    CONFIG.botPassword = body.botPassword || '';

    // Save to file
    saveConfig(CONFIG);

    // Reset DNS cache
    cachedAddress = null;
    cacheTime = 0;

    // Reset LoginSecurity state
    loginSecurityRegistered = false;

    // Restart bot
    console.log('[CONFIG] 🔄 Config đã cập nhật, restart bot...');
    restartBot();

    res.json({ message: 'Đã lưu cấu hình & restart bot!' });
  } catch (err) {
    console.log(`[CONFIG] ❌ Lỗi lưu config: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (_req, res) => res.send('OK'));

// Debug endpoint — kiểm tra kết nối mạng từ container
app.get('/debug', async (_req, res) => {
  const { exec } = require('child_process');
  const results = {};

  // Check proxy env vars
  results.proxy = {
    HTTP_PROXY: process.env.HTTP_PROXY || process.env.http_proxy || 'none',
    HTTPS_PROXY: process.env.HTTPS_PROXY || process.env.https_proxy || 'none',
    NO_PROXY: process.env.NO_PROXY || process.env.no_proxy || 'none',
  };

  // Test DNS
  try {
    const addr = await new Promise((resolve, reject) => {
      dns.lookup('discord.com', (err, address) => err ? reject(err) : resolve(address));
    });
    results.dns_discord = `✅ ${addr}`;
  } catch (e) {
    results.dns_discord = `❌ ${e.message}`;
  }

  // Test curl google (check if any HTTPS works)
  await new Promise((resolve) => {
    exec('curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://www.google.com', (err, stdout) => {
      results.curl_google = err ? `❌ ${err.message}` : `✅ HTTP ${stdout}`;
      resolve();
    });
  });

  results.webhook_url = CONFIG.discordWebhook ? '✅ Set (' + CONFIG.discordWebhook.substring(0, 50) + '...)' : '❌ Empty';
  results.webhook_enabled = CONFIG.webhookEnabled;

  res.json(results);
});

app.listen(PORT, () => console.log(`[WEB] 🌐 Panel: http://localhost:${PORT} | Port ${PORT} ready`));

// Self-ping mỗi 4 phút để chống HuggingFace Spaces sleep container
setInterval(() => {
  http.get(`http://localhost:${PORT}/health`, () => { }).on('error', () => { });
}, 240_000);

// ============================================================
//  BOT STATE
// ============================================================
let bot = null;
let antiAfkTimer = null;
let reconnectTimer = null;
let isConnecting = false;
let prisonBuilt = false;
let prisonCenter = { x: 0, y: PRISON.centerY, z: 0 };
let currentReconnectDelay = CONFIG.reconnectDelay;

// --- Anti-Detection State ---
let spawnTime = 0;              // Thời điểm bot spawn — dùng để tránh chat sớm
let isIdlePeriod = false;       // Đang trong giai đoạn "nghỉ ngơi" hay không
let idleCycleTimer = null;      // Timer cho activity cycle
let inventoryTimer = null;      // Timer mở/đóng inventory
let hotbarTimer = null;         // Timer đổi hotbar
let blockInteractTimer = null;  // Timer tương tác block

// --- LoginSecurity State ---
let loginSecurityRegistered = false; // Đã register chưa (persist qua reconnect cùng session)

// DNS cache — tránh resolve mỗi lần reconnect
let cachedAddress = null;
let cacheTime = 0;
const DNS_CACHE_TTL = 300_000; // 5 phút

async function resolveHost() {
  const now = Date.now();
  if (cachedAddress && (now - cacheTime) < DNS_CACHE_TTL) {
    console.log(`[DNS] 📦 Dùng cache: ${CONFIG.host} -> ${cachedAddress}`);
    return cachedAddress;
  }

  return new Promise((resolve, reject) => {
    dns.lookup(CONFIG.host, (err, address) => {
      if (err) {
        reject(err);
        return;
      }
      cachedAddress = address;
      cacheTime = now;
      console.log(`[DNS] 🔍 Phân giải thành công ${CONFIG.host} -> ${address}`);
      resolve(address);
    });
  });
}

// ============================================================
//  BOT LIFECYCLE
// ============================================================
function destroyBot() {
  stopAntiAfk();
  if (bot) {
    try { bot.removeAllListeners(); } catch (_) { }
    try { bot.end('cleanup'); } catch (_) { }
    bot = null;
  }
}

function restartBot() {
  // Hủy reconnect timer nếu có
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  currentReconnectDelay = CONFIG.reconnectDelay;
  isConnecting = false;
  destroyBot();
  // Đợi 1s rồi tạo bot mới
  setTimeout(() => createBot(), 1000);
}

async function createBot() {
  if (isConnecting) return;
  isConnecting = true;
  prisonBuilt = false;

  // Dọn bot cũ
  destroyBot();

  console.log(`[BOT] Đang kết nối đến ${CONFIG.host}:${CONFIG.port} (Java Edition)...`);

  let address;
  try {
    address = await resolveHost();
  } catch (dnsErr) {
    console.log(`[DNS] ❌ Lỗi phân giải ${CONFIG.host}: ${dnsErr.message}`);
    isConnecting = false;
    botStatus.lastError = `DNS: ${dnsErr.message}`;
    scheduleReconnect();
    return;
  }

  try {
    bot = mineflayer.createBot({
      host: address,
      port: CONFIG.port,
      username: CONFIG.username,
      auth: CONFIG.auth,
      version: CONFIG.version,
      hideErrors: false,
      skipValidation: true,
      checkTimeoutInterval: 60_000,
      viewDistance: 8,              // Tải ít chunk nhất — tiết kiệm RAM & CPU trên HF Spaces
      physicsEnabled: true,         // BẮT BUỘC bật physics để bot di chuyển thực sự — tránh bị phát hiện AFK
    });
  } catch (err) {
    console.log(`[BOT] ❌ Lỗi tạo bot: ${err.message}`);
    isConnecting = false;
    botStatus.lastError = err.message;
    scheduleReconnect();
    return;
  }

  // --- Guard chống xử lý disconnect nhiều lần ---
  let disconnected = false;
  function onDisconnect(reason) {
    if (disconnected) return;
    disconnected = true;
    console.log(`[BOT] 🔌 ${reason}`);
    botStatus.online = false;
    botStatus.lastError = reason;
    isConnecting = false;
    prisonBuilt = false;
    sendDiscord(`🔌 **Bot đã ngắt kết nối!**\n📛 Lý do: \`${reason}\`\n🔄 Đang reconnect... (lần thứ ${botStatus.reconnects + 1})`, DISCORD_COLORS.error);
    destroyBot();
    scheduleReconnect();
  }

  // Login thành công
  bot.on('login', () => {
    console.log('[BOT] ✅ Đã login!');
    botStatus.online = true;
    botStatus.lastLogin = new Date().toISOString();
    isConnecting = false;
    // Reset reconnect delay khi login thành công
    currentReconnectDelay = CONFIG.reconnectDelay;
    sendDiscord(`✅ **Đã kết nối thành công!**\n📡 Server: \`${CONFIG.host}:${CONFIG.port}\`\n👤 Bot: \`${CONFIG.username}\`\n🕐 Thời gian: <t:${Math.floor(Date.now()/1000)}:F>`, DISCORD_COLORS.success);
  });

  // Spawn vào thế giới — Anti-Detection Startup Sequence
  bot.once('spawn', () => {
    console.log('[BOT] ✅ Đã spawn!');
    if (!bot || !bot.entity) return;
    spawnTime = Date.now();
    const p = bot.entity.position;
    console.log(`[BOT] 📍 Vị trí: (${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)})`);

    // === ANTI-DETECTION STARTUP SEQUENCE ===
    // Bước 1: Đứng yên 2-3 giây (giả lập load map)
    const loadDelay = 2000 + Math.random() * 1000;
    console.log(`[STARTUP] 🌍 Giả lập load map... (${(loadDelay/1000).toFixed(1)}s)`);

    setTimeout(() => {
      if (!bot) return;
      // Bước 2: Xoay đầu nhìn xung quanh (observe map)
      console.log('[STARTUP] 👀 Nhìn xung quanh...');
      doLookAround();
      setTimeout(() => { if (bot) doLookAround(); }, 600 + Math.random() * 500);
      setTimeout(() => { if (bot) doLookAround(); }, 1300 + Math.random() * 500);

      // Bước 3: Đợi thêm — LoginSecurity sẽ xử lý qua chat event
      // Nếu không dùng LoginSecurity → đi thẳng vào setup prison
      const preSetupDelay = 1500 + Math.random() * 1000;
      setTimeout(() => {
        if (!bot) return;

        if (!CONFIG.loginSecurityEnabled) {
          // Không dùng LoginSecurity → setup prison ngay
          const postDelay = 500 + Math.random() * 2000;
          console.log(`[STARTUP] ⏳ Đợi ổn định... (${(postDelay/1000).toFixed(1)}s)`);
          setTimeout(() => {
            if (!bot) return;
            console.log('[STARTUP] 🏗️ Bắt đầu setup prison...');
            setupCreativePrison();
          }, postDelay);
        } else {
          // Dùng LoginSecurity → đợi handler xử lý qua chat
          console.log('[STARTUP] 🔐 Đợi LoginSecurity plugin yêu cầu login/register...');
          // Setup prison sẽ được gọi sau khi login thành công (trong chat handler)
          // Timeout 30s phòng trường hợp plugin không gửi message
          setTimeout(() => {
            if (!bot || prisonBuilt) return;
            console.log('[STARTUP] ⏰ Timeout chờ LoginSecurity, setup prison...');
            setupCreativePrison();
          }, 30_000);
        }
      }, preSetupDelay);
    }, loadDelay);
  });

  // Chat — LoginSecurity handler + phát hiện XRay/hack + SMART CHAT REPLY
  bot.on('chat', (username, message) => {
    if (username === CONFIG.username) return;
    console.log(`[CHAT] <${username}> ${message}`);

    const msgLower = message.toLowerCase();
    const botNameLower = CONFIG.username.toLowerCase();

    // === LOGINSECURITY AUTO-HANDLER ===
    if (CONFIG.loginSecurityEnabled && CONFIG.botPassword) {
      handleLoginSecurity(message, msgLower);
    }

    // === SMART CHAT SYSTEM ===
    // Không reply trong 30 giây đầu sau khi join (player thật cần load)
    const timeSinceSpawn = Date.now() - spawnTime;
    if (timeSinceSpawn > 30_000 && bot) {
      // Phản hồi khi bị gọi tên
      if (msgLower.includes(botNameLower)) {
        const nameReplies = ['hmm?', 'có gì?', 'ê', 'sao', 'gì vậy', '?', 'hả', 'có', 'ơi', 'chi'];
        const reply = nameReplies[Math.floor(Math.random() * nameReplies.length)];
        const replyDelay = 1000 + Math.random() * 3000; // 1-4 giây delay
        setTimeout(() => {
          try { if (bot) bot.chat(reply); } catch (_) { }
        }, replyDelay);
        console.log(`[SMART-CHAT] 🗣️ ${username} gọi tên bot → reply "${reply}" sau ${(replyDelay/1000).toFixed(1)}s`);
      }
      // Phản hồi khi có người chào
      else if (msgLower.match(/^(hello|hi|hey|xin chào|chào|yo|ê|alo)$/i) || 
               msgLower.match(/^(hello|hi|hey|chào).{0,10}$/i)) {
        const greetReplies = ['hi', 'hello', 'chào', 'hey', ':)', 'yo', 'ê', 'hi hi'];
        const reply = greetReplies[Math.floor(Math.random() * greetReplies.length)];
        // Chỉ reply 50% lần — player thật không reply mọi lúc
        if (Math.random() < 0.5) {
          const replyDelay = 1500 + Math.random() * 3500;
          setTimeout(() => {
            try { if (bot) bot.chat(reply); } catch (_) { }
          }, replyDelay);
          console.log(`[SMART-CHAT] 👋 Chào lại "${reply}" sau ${(replyDelay/1000).toFixed(1)}s`);
        }
      }
    }

    // Phát hiện XRay từ chat (plugin anti-cheat thường thông báo trong chat)
    if (msgLower.includes('xray') || msgLower.includes('x-ray') || msgLower.includes('ore alert') || msgLower.includes('orefinder')) {
      sendDiscord(`⚠️ **CẢNH BÁO XRAY!**\n👤 Tin nhắn từ: \`${username}\`\n💬 Nội dung: \`${message}\``, DISCORD_COLORS.warning);
    }

    // Phát hiện hack/cheat khác
    if (msgLower.includes('hack') || msgLower.includes('cheat') || msgLower.includes('fly') || msgLower.includes('killaura') || msgLower.includes('speed hack')) {
      sendDiscord(`🚨 **CẢNH BÁO CHEAT!**\n👤 Tin nhắn từ: \`${username}\`\n💬 Nội dung: \`${message}\``, DISCORD_COLORS.warning);
    }
  });

  // === MESSAGE EVENT — Bắt cả system messages từ plugin (không chỉ chat) ===
  bot.on('message', (jsonMsg) => {
    if (!CONFIG.loginSecurityEnabled || !CONFIG.botPassword) return;
    const rawText = jsonMsg.toString();
    if (!rawText || rawText.trim() === '') return;
    // Chỉ log nếu có liên quan đến login/register
    const lower = rawText.toLowerCase();
    if (lower.includes('login') || lower.includes('register') || lower.includes('password') ||
        lower.includes('đăng nhập') || lower.includes('đăng ký') || lower.includes('mật khẩu')) {
      console.log(`[MSG] 📨 ${rawText}`);
      handleLoginSecurity(rawText, lower);
    }
  });

  // Player join/leave — thông báo lên Discord
  bot.on('playerJoined', (player) => {
    if (player.username === CONFIG.username) return;
    console.log(`[SERVER] ➡️ ${player.username} đã vào server`);
    sendDiscord(`➡️ **${player.username}** đã vào server`, DISCORD_COLORS.info);
  });

  bot.on('playerLeft', (player) => {
    if (player.username === CONFIG.username) return;
    console.log(`[SERVER] ⬅️ ${player.username} đã rời server`);
    sendDiscord(`⬅️ **${player.username}** đã rời server`, DISCORD_COLORS.offline);
  });

  // Disconnect events
  bot.on('kicked', (reason) => {
    let text = typeof reason === 'string' ? reason : JSON.stringify(reason);
    try {
      const parsed = JSON.parse(reason);
      if (parsed.text) text = parsed.text;
      else if (parsed.extra) text = parsed.extra.map(e => e.text).join('');
    } catch (_) { }
    onDisconnect(`Kicked: ${text}`);
  });

  bot.on('error', (err) => {
    console.log(`[BOT] ❌ Lỗi: ${err.message}`);
    onDisconnect(`Error: ${err.message}`);
  });

  bot.on('end', (reason) => {
    onDisconnect(`End: ${reason || 'unknown'}`);
  });
}

// ============================================================
//  LOGINSECURITY PLUGIN AUTO-HANDLER
//  Phát hiện yêu cầu /register hoặc /login từ plugin
// ============================================================
let loginSecurityCooldown = 0; // Tránh gửi lệnh liên tục

function handleLoginSecurity(rawMessage, msgLower) {
  if (!bot || !CONFIG.loginSecurityEnabled || !CONFIG.botPassword) return;

  const now = Date.now();
  // Cooldown 5 giây — tránh spam
  if (now - loginSecurityCooldown < 5000) return;

  const pass = CONFIG.botPassword;

  // --- Phát hiện yêu cầu REGISTER ---
  // LoginSecurity thường gửi: "/register <password> <password>" hoặc "Please register..."
  const registerPatterns = [
    /\/register/i,
    /please register/i,
    /please.*\/register/i,
    /type.*\/register/i,
    /use.*\/register/i,
    /đăng ký/i,
    /hãy đăng ký/i,
    /you must register/i,
    /not registered/i,
  ];

  for (const pattern of registerPatterns) {
    if (pattern.test(msgLower) && !loginSecurityRegistered) {
      loginSecurityCooldown = now;
      const cmd = `/register ${pass} ${pass}`;
      const delay = 1000 + Math.random() * 1500; // 1-2.5s delay
      console.log(`[LOGIN-SEC] 📝 Phát hiện yêu cầu register → gửi "${cmd}" sau ${(delay/1000).toFixed(1)}s`);
      setTimeout(() => {
        try {
          if (bot) {
            bot.chat(cmd);
            loginSecurityRegistered = true;
            sendDiscord(`🔐 **LoginSecurity:** Đã tự động đăng ký tài khoản`, DISCORD_COLORS.info);
            console.log('[LOGIN-SEC] ✅ Đã gửi lệnh register');
            // Sau khi register thành công → setup prison
            setTimeout(() => {
              if (bot && !prisonBuilt) {
                console.log('[LOGIN-SEC] 🏗️ Register xong, setup prison...');
                setupCreativePrison();
              }
            }, 2000);
          }
        } catch (_) { }
      }, delay);
      return; // Đã xử lý
    }
  }

  // --- Phát hiện yêu cầu LOGIN ---
  const loginPatterns = [
    /\/login/i,
    /please login/i,
    /please.*\/login/i,
    /type.*\/login/i,
    /use.*\/login/i,
    /đăng nhập/i,
    /hãy đăng nhập/i,
    /you must login/i,
    /please authenticate/i,
  ];

  for (const pattern of loginPatterns) {
    if (pattern.test(msgLower)) {
      loginSecurityCooldown = now;
      const cmd = `/login ${pass}`;
      const delay = 1000 + Math.random() * 1500;
      console.log(`[LOGIN-SEC] 🔑 Phát hiện yêu cầu login → gửi "${cmd}" sau ${(delay/1000).toFixed(1)}s`);
      setTimeout(() => {
        try {
          if (bot) {
            bot.chat(cmd);
            loginSecurityRegistered = true; // Đã login = đã có tài khoản
            sendDiscord(`🔑 **LoginSecurity:** Đã tự động đăng nhập`, DISCORD_COLORS.info);
            console.log('[LOGIN-SEC] ✅ Đã gửi lệnh login');
            // Sau khi login thành công → setup prison
            setTimeout(() => {
              if (bot && !prisonBuilt) {
                console.log('[LOGIN-SEC] 🏗️ Login xong, setup prison...');
                setupCreativePrison();
              }
            }, 2000);
          }
        } catch (_) { }
      }, delay);
      return; // Đã xử lý
    }
  }

  // --- Phát hiện login/register THÀNH CÔNG ---
  const successPatterns = [
    /successfully registered/i,
    /successfully logged in/i,
    /đăng ký thành công/i,
    /đăng nhập thành công/i,
    /you are now logged in/i,
    /logged in successfully/i,
    /registered successfully/i,
  ];

  for (const pattern of successPatterns) {
    if (pattern.test(msgLower)) {
      loginSecurityRegistered = true;
      console.log('[LOGIN-SEC] 🎉 Login/Register thành công!');
      sendDiscord(`✅ **LoginSecurity:** Đăng nhập/đăng ký thành công!`, DISCORD_COLORS.success);
      // Setup prison nếu chưa
      setTimeout(() => {
        if (bot && !prisonBuilt) {
          setupCreativePrison();
        }
      }, 1500);
      return;
    }
  }
}

// ============================================================
//  CREATIVE + NHÀ TÙ BEDROCK (1 lệnh /fill hollow)
// ============================================================
function setupCreativePrison() {
  if (!bot || prisonBuilt) return;

  console.log('[SETUP] 🎮 /gamemode creative');
  bot.chat('/gamemode creative');

  setTimeout(() => {
    if (!bot || !bot.entity) return;
    const p = bot.entity.position;
    const cx = Math.floor(p.x);
    const cz = Math.floor(p.z);
    prisonCenter = { x: cx, y: PRISON.centerY, z: cz };

    console.log(`[SETUP] 🚀 TP lên Y=${PRISON.centerY}`);
    bot.chat(`/tp ${CONFIG.username} ${cx} ${PRISON.centerY} ${cz}`);

    setTimeout(() => buildPrison(cx, PRISON.centerY, cz), 400);
  }, 400);
}

function buildPrison(cx, cy, cz) {
  if (!bot) return;
  const h = Math.floor(PRISON.innerSize / 2);
  const height = PRISON.innerSize;

  // Xây nhà tù bedrock rỗng bằng lệnh /fill hollow duy nhất
  // → 1 lệnh thay vì 2 (fill bedrock + fill air), ít delay hơn, ít risk lỗi hơn
  const cmd = `/fill ${cx - h - 1} ${cy - 1} ${cz - h - 1} ${cx + h + 1} ${cy + height} ${cz + h + 1} minecraft:bedrock hollow`;
  console.log(`[SETUP] 🧱 ${cmd}`);
  bot.chat(cmd);

  setTimeout(() => {
    if (!bot) return;
    bot.chat(`/tp ${CONFIG.username} ${cx} ${cy} ${cz}`);
    prisonBuilt = true;
    botStatus.position = `(${cx}, ${cy}, ${cz})`;
    console.log(`[SETUP] ✅ Nhà tù bedrock hoàn thành tại (${cx}, ${cy}, ${cz})`);

    // Chỉ bắt đầu Anti-AFK nếu được bật
    if (CONFIG.antiAfkEnabled) {
      startAntiAfk();
      startHumanSimulation();
    } else {
      console.log('[AFK] ⏸️ Anti-AFK đã tắt trong cấu hình');
    }
  }, 500);
}

// ============================================================
//  ANTI-AFK NÂNG CAO V3 – Di chuyển + hành vi đa dạng + giả lập thật
//  Mục tiêu: Giả lập player thật hoàn toàn, qua mặt Aternos anti-bot
// ============================================================
let tick = 0;
let chatTick = 0;
let walkingState = false; // đang đi hay không

// Gaussian random — phân phối tự nhiên hơn uniform random
function gaussianRandom(mean, stdDev) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const normal = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + stdDev * normal;
}

// Clamp value trong range
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// Danh sách chat đa dạng, tự nhiên hơn — tránh bị detect pattern
const CHAT_MESSAGES = [
  'oke', 'hmm', 'a', 'hello', ':)', 'hi', 'xin chào',
  'lag gì vậy', 'ê', 'có ai không', 'đang chơi', 'ok ok',
  'brb', 'nice', 'lol', 'gg', 'what', 'wow', 'haha',
  'waiting...', 'anyone here?', 'test', '...', 'yo',
  'back', 'afk?', 'nah', 'cool', 'lets go',
  'hmm ok', 'ừ', 'k', 'đợi xíu', 'lag quá', 'ok fine',
  'đang build', 'mấy giờ rồi', 'server lag', 'zzz',
];

function startAntiAfk() {
  stopAntiAfk();
  tick = 0;
  chatTick = 0;
  console.log('[AFK] 🏃 Anti-AFK V2 đã bật — di chuyển + nhảy + sneak + chat');

  function antiAfkLoop() {
    if (!bot || !bot.entity) return;
    tick++;
    chatTick++;

    try {
      // Nếu đang trong giai đoạn idle — chỉ nhìn xung quanh nhẹ nhàng
      if (isIdlePeriod) {
        if (Math.random() < 0.3) doLookAround(); // 30% nhìn xung quanh, 70% đứng yên
      } else {
        // Mỗi tick chọn ngẫu nhiên 1-2 hành động từ pool
        const actionRoll = Math.random();

        if (actionRoll < 0.20) {
          // 20%: Đi bộ ngẫu nhiên trong nhà tù (giảm từ 30%)
          doRandomWalk();
        } else if (actionRoll < 0.30) {
          // 10%: Đi bộ + sprint
          doRandomWalkSprint();
        } else if (actionRoll < 0.42) {
          // 12%: Nhảy
          doJump();
        } else if (actionRoll < 0.55) {
          // 13%: Xoay đầu nhìn xung quanh
          doLookAround();
        } else if (actionRoll < 0.62) {
          // 7%: Nhìn xuống (check inventory/chat)
          doLookDown();
        } else if (actionRoll < 0.72) {
          // 10%: Vung tay
          doSwingArm();
        } else if (actionRoll < 0.80) {
          // 8%: Sneak toggle (shift)
          doSneakToggle();
        } else if (actionRoll < 0.88) {
          // 8%: Đi lùi
          doWalkBack();
        } else if (actionRoll < 0.95) {
          // 7%: Đứng yên (pause tự nhiên)
          // Không làm gì — player thật có lúc đứng yên
          console.log('[AFK] ⏸️ Pause tự nhiên');
        } else {
          // 5%: Kết hợp nhảy + xoay đầu
          doJump();
          setTimeout(() => doLookAround(), 300 + Math.random() * 400);
        }
      }

      // Chat mỗi ~5-10 phút (khoảng 60-120 ticks × ~5-10s ≈ 5-20 phút)
      // GIẢM tần suất chat để tránh anti-spam
      const chatInterval = 60 + Math.floor(Math.random() * 60); // random 60-120 ticks
      if (chatTick >= chatInterval && !isIdlePeriod) {
        chatTick = 0;
        // Chỉ chat nếu đã join > 60 giây
        const timeSinceSpawn = Date.now() - spawnTime;
        if (timeSinceSpawn > 60_000) {
          try {
            const msg = CHAT_MESSAGES[Math.floor(Math.random() * CHAT_MESSAGES.length)];
            bot.chat(msg);
          } catch (_) { }
        }
      }

      // Heartbeat log mỗi ~2 phút (40 ticks × ~3-5s ≈ 2-3 phút)
      if (tick % 40 === 0 && bot.entity) {
        const p = bot.entity.position;
        botStatus.position = `(${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)})`;
        console.log(`[AFK] 💓 #${tick} - ${botStatus.position} | RAM: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}MB`);
      }
    } catch (e) {
      console.log('[AFK] Lỗi:', e.message);
    }

    // Gaussian delay mỗi tick: trung bình 7.5s, stddev 2s → tự nhiên hơn uniform
    const gaussDelay = clamp(
      Math.floor(gaussianRandom(CONFIG.antiAfkInterval + CONFIG.antiAfkJitter / 2, 2000)),
      CONFIG.antiAfkInterval,
      CONFIG.antiAfkInterval + CONFIG.antiAfkJitter
    );
    antiAfkTimer = setTimeout(antiAfkLoop, gaussDelay);
  }

  // Kick-off vòng lặp đầu tiên
  antiAfkTimer = setTimeout(antiAfkLoop, 1000);
}

// --- Di chuyển ngẫu nhiên trong nhà tù ---
function doRandomWalk() {
  if (!bot || !bot.entity) return;
  try {
    const h = Math.floor(PRISON.innerSize / 2) - 1; // Giữ khoảng cách với tường
    const targetX = prisonCenter.x + (Math.random() * 2 - 1) * h;
    const targetZ = prisonCenter.z + (Math.random() * 2 - 1) * h;

    // Nhìn về hướng sẽ đi — thêm chút sai số (player thật không aim chính xác)
    const dx = targetX - bot.entity.position.x;
    const dz = targetZ - bot.entity.position.z;
    const yaw = Math.atan2(-dx, dz) + (Math.random() - 0.5) * 0.3; // ±0.15 rad sai số
    bot.look(yaw, (Math.random() - 0.5) * 0.2, false); // pitch nhẹ

    // Đợi 100-300ms rồi mới bắt đầu đi (giả lập reaction time)
    const reactionDelay = 100 + Math.random() * 200;
    setTimeout(() => {
      try {
        if (!bot) return;
        bot.setControlState('forward', true);
        walkingState = true;

        // Dừng sau 0.5-2 giây (gaussian)
        const walkDuration = clamp(gaussianRandom(1000, 300), 500, 2000);
        setTimeout(() => {
          try {
            if (bot) {
              bot.setControlState('forward', false);
              walkingState = false;
            }
          } catch (_) { }
        }, walkDuration);
      } catch (_) { }
    }, reactionDelay);
  } catch (_) { }
}

// --- Nhảy ---
function doJump() {
  if (!bot || !bot.entity) return;
  try {
    bot.setControlState('jump', true);
    setTimeout(() => {
      try { if (bot) bot.setControlState('jump', false); } catch (_) { }
    }, 200 + Math.random() * 200);
  } catch (_) { }
}

// --- Vung tay ---
function doSwingArm() {
  if (!bot) return;
  try {
    const arm = Math.random() < 0.5 ? 'right' : 'left';
    bot.swingArm(arm);
    // Đôi khi vung cả 2 tay
    if (Math.random() < 0.4) {
      setTimeout(() => {
        try { if (bot) bot.swingArm(arm === 'right' ? 'left' : 'right'); } catch (_) { }
      }, 150 + Math.random() * 250);
    }
  } catch (_) { }
}

// --- Xoay đầu ---
function doLookAround() {
  if (!bot) return;
  try {
    const yaw = (Math.random() * 2 * Math.PI) - Math.PI;
    const pitch = (Math.random() - 0.5) * Math.PI * 0.6;
    bot.look(yaw, pitch, false);
  } catch (_) { }
}

// --- Toggle sneak (shift) ---
function doSneakToggle() {
  if (!bot) return;
  try {
    bot.setControlState('sneak', true);
    // Giữ sneak 0.5-2 giây rồi thả
    const sneakDuration = 500 + Math.random() * 1500;
    setTimeout(() => {
      try { if (bot) bot.setControlState('sneak', false); } catch (_) { }
    }, sneakDuration);
  } catch (_) { }
}

// --- Đi lùi ---
function doWalkBack() {
  if (!bot || !bot.entity) return;
  try {
    bot.setControlState('back', true);
    const dur = 300 + Math.random() * 700;
    setTimeout(() => {
      try { if (bot) bot.setControlState('back', false); } catch (_) { }
    }, dur);
  } catch (_) { }
}

// --- Nhìn xuống (giả lập đọc chat / check inventory) ---
function doLookDown() {
  if (!bot) return;
  try {
    const yaw = bot.entity.yaw + (Math.random() - 0.5) * 0.5;
    const pitch = 0.5 + Math.random() * 0.8; // nhìn xuống
    bot.look(yaw, pitch, false);
    // Sau 1-3 giây nhìn lại bình thường
    const dur = 1000 + Math.random() * 2000;
    setTimeout(() => {
      try {
        if (bot) bot.look(yaw, (Math.random() - 0.3) * 0.5, false);
      } catch (_) { }
    }, dur);
  } catch (_) { }
}

// --- Đi bộ + Sprint ---
function doRandomWalkSprint() {
  if (!bot || !bot.entity) return;
  try {
    const h = Math.floor(PRISON.innerSize / 2) - 1;
    const targetX = prisonCenter.x + (Math.random() * 2 - 1) * h;
    const targetZ = prisonCenter.z + (Math.random() * 2 - 1) * h;
    const dx = targetX - bot.entity.position.x;
    const dz = targetZ - bot.entity.position.z;
    const yaw = Math.atan2(-dx, dz) + (Math.random() - 0.5) * 0.2;
    bot.look(yaw, 0, false);

    setTimeout(() => {
      try {
        if (!bot) return;
        bot.setControlState('forward', true);
        bot.setControlState('sprint', true);
        walkingState = true;
        const dur = 400 + Math.random() * 800;
        setTimeout(() => {
          try {
            if (bot) {
              bot.setControlState('forward', false);
              bot.setControlState('sprint', false);
              walkingState = false;
            }
          } catch (_) { }
        }, dur);
      } catch (_) { }
    }, 100 + Math.random() * 200);
  } catch (_) { }
}

// ============================================================
//  HỆ THỐNG GIẢ LẬP PLAYER THẬT (Human Simulation)
// ============================================================

function startHumanSimulation() {
  console.log('[HUMAN-SIM] 🎭 Khởi động hệ thống giả lập player thật');
  startActivityCycle();
  startHotbarSwitching();
  startInventoryInteraction();
  startBlockInteraction();
}

function stopHumanSimulation() {
  if (idleCycleTimer) { clearTimeout(idleCycleTimer); idleCycleTimer = null; }
  if (hotbarTimer) { clearTimeout(hotbarTimer); hotbarTimer = null; }
  if (inventoryTimer) { clearTimeout(inventoryTimer); inventoryTimer = null; }
  if (blockInteractTimer) { clearTimeout(blockInteractTimer); blockInteractTimer = null; }
  isIdlePeriod = false;
}

// --- Activity Cycle: Mỗi 30-60 phút, idle 2-5 phút ---
function startActivityCycle() {
  function cycle() {
    if (!bot) return;
    // Thời gian active: 30-60 phút
    const activeTime = (30 + Math.random() * 30) * 60 * 1000;
    console.log(`[HUMAN-SIM] 🔄 Chu kỳ active: ${(activeTime/60000).toFixed(1)} phút`);

    idleCycleTimer = setTimeout(() => {
      if (!bot) return;
      // Chuyển sang idle: 2-5 phút
      isIdlePeriod = true;
      const idleTime = (2 + Math.random() * 3) * 60 * 1000;
      console.log(`[HUMAN-SIM] 😴 Chuyển sang idle ${(idleTime/60000).toFixed(1)} phút (giả lập tab out)`);
      sendDiscord(`😴 Bot chuyển sang chế độ idle (${(idleTime/60000).toFixed(1)} phút)`, DISCORD_COLORS.info);

      idleCycleTimer = setTimeout(() => {
        if (!bot) return;
        isIdlePeriod = false;
        console.log('[HUMAN-SIM] 🏃 Quay lại active!');
        cycle(); // Lặp lại chu kỳ
      }, idleTime);
    }, activeTime);
  }
  cycle();
}

// --- Hotbar Switching: Đổi slot mỗi 20-60 giây ---
function startHotbarSwitching() {
  function switchLoop() {
    if (!bot) return;
    const delay = (20 + Math.random() * 40) * 1000;
    hotbarTimer = setTimeout(() => {
      if (!bot || isIdlePeriod) { switchLoop(); return; }
      try {
        const slot = Math.floor(Math.random() * 9); // 0-8
        bot.setQuickBarSlot(slot);
        console.log(`[HUMAN-SIM] 🎰 Đổi hotbar slot → ${slot}`);
      } catch (_) { }
      switchLoop();
    }, delay);
  }
  switchLoop();
}

// --- Inventory Interaction: Mở/đóng mỗi 3-8 phút ---
function startInventoryInteraction() {
  function invLoop() {
    if (!bot) return;
    const delay = (3 + Math.random() * 5) * 60 * 1000;
    inventoryTimer = setTimeout(() => {
      if (!bot || isIdlePeriod) { invLoop(); return; }
      try {
        // Mở inventory window
        const window = bot.openWindow ? bot.openWindow(bot.inventory) : null;
        console.log('[HUMAN-SIM] 🎒 Mở inventory');

        // Đóng sau 1-3 giây
        const closeDelay = 1000 + Math.random() * 2000;
        setTimeout(() => {
          try {
            if (bot && bot.closeWindow) bot.closeWindow(bot.currentWindow || window);
            console.log('[HUMAN-SIM] 🎒 Đóng inventory');
          } catch (_) { }
        }, closeDelay);
      } catch (_) {
        console.log('[HUMAN-SIM] 🎒 Inventory interaction skipped');
      }
      invLoop();
    }, delay);
  }
  invLoop();
}

// --- Block Interaction: Đặt/phá block mỗi 5-15 phút (creative mode) ---
function startBlockInteraction() {
  function blockLoop() {
    if (!bot) return;
    const delay = (5 + Math.random() * 10) * 60 * 1000;
    blockInteractTimer = setTimeout(() => {
      if (!bot || !bot.entity || isIdlePeriod) { blockLoop(); return; }
      try {
        // Đặt 1 block dirt ở vị trí ngẫu nhiên trong tù rồi phá nó
        const h = Math.floor(PRISON.innerSize / 2) - 1;
        const bx = prisonCenter.x + Math.floor((Math.random() * 2 - 1) * h);
        const by = prisonCenter.y; // Trên sàn
        const bz = prisonCenter.z + Math.floor((Math.random() * 2 - 1) * h);

        // Đặt block
        bot.chat(`/setblock ${bx} ${by} ${bz} minecraft:dirt`);
        console.log(`[HUMAN-SIM] 🧱 Đặt dirt tại (${bx}, ${by}, ${bz})`);

        // Phá block sau 2-5 giây
        const breakDelay = 2000 + Math.random() * 3000;
        setTimeout(() => {
          try {
            if (bot) {
              bot.chat(`/setblock ${bx} ${by} ${bz} minecraft:air`);
              console.log(`[HUMAN-SIM] 💥 Phá dirt tại (${bx}, ${by}, ${bz})`);
            }
          } catch (_) { }
        }, breakDelay);
      } catch (_) {
        console.log('[HUMAN-SIM] 🧱 Block interaction skipped');
      }
      blockLoop();
    }, delay);
  }
  blockLoop();
}

function stopAntiAfk() {
  if (antiAfkTimer) {
    clearTimeout(antiAfkTimer);
    antiAfkTimer = null;
  }
  stopHumanSimulation();
  // Đảm bảo dừng mọi control state khi tắt anti-AFK
  if (bot) {
    try {
      bot.setControlState('forward', false);
      bot.setControlState('jump', false);
      bot.setControlState('sneak', false);
      bot.setControlState('back', false);
      bot.setControlState('sprint', false);
    } catch (_) { }
  }
}

// ============================================================
//  RECONNECT – Exponential Backoff
// ============================================================
function scheduleReconnect() {
  if (reconnectTimer) return;
  botStatus.reconnects++;
  // Thêm jitter ±20% vào reconnect delay → tránh pattern đều đặn
  const jitter = currentReconnectDelay * (0.8 + Math.random() * 0.4); // 80%-120% of delay
  const actualDelay = Math.floor(jitter);
  const sec = (actualDelay / 1000).toFixed(0);
  console.log(`[BOT] 🔄 Reconnect sau ${sec}s... (lần thứ ${botStatus.reconnects})`);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    createBot();
  }, actualDelay);

  // Exponential backoff: 30s → 60s → 120s → 240s → 480s → 600s (max 10 phút)
  currentReconnectDelay = Math.min(currentReconnectDelay * 2, CONFIG.maxReconnectDelay);
}

// ============================================================
//  KHỞI CHẠY
// ============================================================
console.log('=========================================');
console.log('  🤖 Minecraft AFK Bot — Control Panel');
console.log(`  Server:  ${CONFIG.host}:${CONFIG.port}`);
console.log(`  Bot:     ${CONFIG.username}`);
console.log(`  Version: ${CONFIG.version}`);
console.log('  Edition: Java | Mode: Creative Prison');
console.log(`  Discord: ${CONFIG.webhookEnabled ? '✅ Enabled' : '❌ Disabled'}`);
console.log(`  Anti-AFK: ${CONFIG.antiAfkEnabled ? '✅ Enabled' : '❌ Disabled'}`);
console.log(`  LoginSec: ${CONFIG.loginSecurityEnabled ? '✅ Enabled' : '❌ Disabled'}`);
console.log(`  Panel:   http://localhost:${PORT}`);
console.log('=========================================');

createBot();

// Tắt an toàn
process.on('SIGINT', () => {
  console.log('\n[BOT] Tắt bot...');
  sendDiscord('⛔ Bot đang tắt (SIGINT)');
  stopAntiAfk();
  destroyBot();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[BOT] SIGTERM...');
  sendDiscord('⛔ Bot đang tắt (SIGTERM)');
  stopAntiAfk();
  destroyBot();
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.log(`[BOT] ❌ Exception: ${err.message}`);
  botStatus.lastError = err.message;
  sendDiscord(`❌ Exception: ${err.message}`);
});

process.on('unhandledRejection', (err) => {
  console.log(`[BOT] ❌ Rejection: ${err}`);
});
