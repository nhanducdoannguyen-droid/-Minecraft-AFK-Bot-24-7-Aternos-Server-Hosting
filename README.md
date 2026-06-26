# 🤖 Minecraft AFK Bot — 24/7 Aternos Server Hosting

[🇻🇳 Tiếng Việt](./README_VI.md)

A free Minecraft bot to keep your Aternos server online 24/7, running on HuggingFace Spaces. Includes a beautiful Web Control Panel, smart Anti-AFK simulation, LoginSecurity plugin auto-login, and Discord Webhook notifications.

---

## ✨ Features

- 🎮 **Minecraft Java Edition Connection** — Supports all versions.
- 🏃 **Smart Anti-AFK** — Simulates real player behaviors (walking, jumping, looking around, chat, etc.) to prevent AFK kicks.
- 🔐 **LoginSecurity Auto-Login** — Automatically registers and logs in on servers using the LoginSecurity plugin.
- 💬 **Discord Webhook** — Sends instant alerts to Discord for bot status, player join/leave events, and cheat/hack detection.
- 🌐 **Web Panel** — Configure and manage the bot on the fly using a gorgeous, dark-themed responsive web interface.
- ☁️ **100% Free** — Easily deploy on HuggingFace Spaces.

---

## 📋 Requirements

Before starting, make sure you have:

| # | Requirement | Notes |
|---|-------------|-------|
| 1 | [HuggingFace](https://huggingface.co/) Account | Free registration with email |
| 2 | [Aternos](https://aternos.org/) Server | An existing Minecraft server |
| 3 | *(Optional)* Discord Webhook URL | For Discord notifications |

---

## 🚀 Step-by-Step Setup Guide

### Step 1: Create a HuggingFace Account

1. Visit **[huggingface.co](https://huggingface.co/)**
2. Click **"Sign Up"** (top right corner)
3. Register using **email** or **Google/GitHub**
4. Verify your email if prompted and log in.

---

### Step 2: Create a New Space on HuggingFace

1. Click on your **avatar** (top right) → select **"New Space"**
2. Fill in the options:

   | Field | Value |
   |-------|-------|
   | **Space name** | Choose any name, e.g., `minecraft-bot` |
   | **License** | Select `MIT` or leave blank |
   | **Select the Space SDK** | ⚠️ Choose **Docker** |
   | **Space hardware** | Select **CPU basic · FREE** |
   | **Visibility** | Select **Private** (recommended for security!) |

3. Click **"Create Space"**

> ⚠️ **IMPORTANT:** You must select **Docker** as the SDK.

> ⚠️ **SECURITY:** Use **Private** visibility to protect your server details and passwords.

---

### Step 3: Upload Files to the Space

There are **two ways** to upload files:

#### Option 1: Via Web Interface (Easiest) 👈

1. In your newly created Space, click the **"Files"** tab (top menu bar).
2. Click **"+ Add file"** → select **"Upload files"**.
3. Drag and drop **ALL** of the following files into the upload area:

   ```
   📁 Files to upload:
   ├── Dockerfile
   ├── index.js
   ├── package.json
   ├── package-lock.json
   ├── donate.png
   └── 📁 public/
       ├── index.html
       └── style.css
   ```

   > **Note:** Make sure to upload the `public/` directory with both of its files.
   
4. Write a commit message (e.g., `Upload bot files`) and click **"Commit changes"**.

#### Option 2: Via Git

1. Open your terminal or Command Prompt.
2. Clone your Space:
   ```bash
   git clone https://huggingface.co/spaces/YOUR-USERNAME/minecraft-bot
   cd minecraft-bot
   ```
3. Copy all project files into the cloned folder.
4. Add, commit, and push:
   ```bash
   git add .
   git commit -m "Upload bot files"
   git push
   ```

> 💡 **Once uploaded, HuggingFace will automatically build the Docker image and start the bot.**

---

### Step 4: Wait for the Build to Complete

1. Go back to your Space and click the **"App"** tab.
2. You will see a **"Building..."** status. Wait for **1-3 minutes**.
3. Once built, the status turns to **"Running"** ✅.
4. The **Web Panel** will appear on the screen!

> If the build fails, check the **"Logs"** tab for errors.

---

### Step 5: Get Aternos Server Details

1. Log in to **[aternos.org](https://aternos.org/)** and select your server.
2. **Start the server** (Click Start).
3. Once running, note down the following information:

   | Detail | Example | Location |
   |--------|---------|----------|
   | **Server Address** | `myserver.aternos.me` | Dòng "Address" trên trang chủ |
   | **Port** | `44076` | The number after `:` in the address (e.g. `myserver.aternos.me:44076`) |
   | **MC Version** | `1.21.1` | The "Software" version of your server |

   > ⚠️ **Aternos ports change every time the server restarts!** You will need to update the port in your Web Panel whenever your server is restarted.

4. **⚠️ REQUIRED — Enable Cracked (Offline Mode) on Aternos:**
   - In the left sidebar of Aternos, click **"Options"** (Tùy chọn).
   - Find the setting called **"Cracked"** (Bản bẻ khóa).
   - Switch the toggle **ON** (so it turns green or has a checkmark).
   - *Explanation:* The bot uses offline (Cracked) authentication. If Cracked is disabled on Aternos, the bot will fail to connect and throw a "Not authenticated with Minecraft.net" or "Disallowed connection" error.

---

### Step 6: Configure the Bot via the Web Panel

1. Open the **App** tab on your HuggingFace Space.
2. Under **Server Info**, fill in:
   - **Bot Username**: Display name in the game (e.g., `BotTreoServer`).
   - **Server Host**: The address of your server (DO NOT include the port here).
   - **Server Port**: The port number.
   - **MC Version**: Your server's Minecraft version.

3. Configure optional features:
   - **Discord Webhook**: Turn ON and enter your Discord Webhook URL to get status alerts. Use Webhook Proxy if HuggingFace blocks direct calls to Discord.
   - **Anti-AFK**: Turn ON (enabled by default) to keep the bot moving so it doesn't get kicked.
   - **LoginSecurity**: Turn ON and enter a password if your server uses the LoginSecurity plugin. The bot automatically registers/logs in for you.

---

### Step 7: Save & Start

1. Click **"💾 Save & Restart Bot"**.
2. Wait 2-3 seconds until you see the success notification.
3. The top status bar will transition from 🔴 **Offline** to 🟢 **Online** once the bot joins successfully.
4. Your server is now hosted 24/7! 🎉

---

## ❓ FAQ

### The bot fails to join my server?

| Cause | Solution |
|-------|----------|
| Server is offline | Start your Aternos server first |
| Invalid Host/Port | Verify details on Aternos |
| Cracked is disabled | Go to Options on Aternos → Enable Cracked |
| Version mismatch | Double check server's MC version |
| Port changed | Update the port in the Web Panel with the new Aternos port |

### The bot joins but gets kicked instantly?

- Check if your server has **LoginSecurity** plugin enabled → turn ON the toggle and input your bot password in the panel.
- Check if your server has a **whitelist** → add the bot username to the whitelist.
- Check for **anti-bot plugins** on your server → disable them if necessary.

### The bot goes offline after some time?

- **HuggingFace free tier Spaces** automatically go to sleep after ~48h of inactivity.
- Solution: Use [UptimeRobot](https://uptimerobot.com/) (free) to ping your space every 5 minutes:
  1. Create an UptimeRobot account.
  2. Add New Monitor → HTTP(s).
  3. URL: `https://YOUR-USERNAME-minecraft-bot.hf.space/health`
  4. Monitoring Interval: 5 minutes.
  5. Save monitor.

---

## 🔧 Advanced Configuration (Optional)

### Using Environment Variables

Instead of the Web Panel, you can configure the bot using HuggingFace Space Secrets:

1. Open your Space **Settings**.
2. Scroll to **"Variables and secrets"**.
3. Add the following secrets:

| Secret Name | Example | Description |
|-------------|---------|-------------|
| `MC_HOST` | `myserver.aternos.me` | Server Host |
| `MC_PORT` | `44076` | Server Port |
| `MC_USERNAME` | `MyBot` | Bot username |
| `MC_VERSION` | `1.21.1` | MC version |
| `DISCORD_WEBHOOK_URL` | `https://discord.com/api/webhooks/...` | Discord webhook URL |
| `WEBHOOK_PROXY` | `https://script.google.com/...` | Proxy URL |
| `BOT_PASSWORD` | `mypassword` | LoginSecurity password |
| `ANTI_AFK` | `true` or `false` | Enable/disable Anti-AFK |

> 💡 Environment variables take **highest priority** and override configs saved via the Web Panel. Excellent for hiding credentials.

---

## 📝 Important Notes

- Works only with **Minecraft Java Edition** (Bedrock is not supported).
- Reconnects automatically with exponential backoff if the server goes offline or restarts.
- Config is saved persistently on HuggingFace Space storage.

---

## ☕ Support the Project (Donate)

If this bot has helped you keep your server alive, you can buy me a coffee via Viettel Money / VietQR:

![Donate QR](donate.png)

Thank you for your support! ❤️

---

## 🐛 Bug Reports & Support

If you encounter issues or find bugs, feel free to report them via email:
📧 **dn250507@gmail.com**

---

## ⚠️ Disclaimer

This project is created solely for **educational and research purposes**.
- The author is not responsible for any service suspensions, bans, kicks, or losses from third-party hosting providers (e.g., Aternos, HuggingFace, etc.) resulting from the use of this tool.
- Please use this tool at your own responsibility and in compliance with the Terms of Service of the respective platforms.

---

## 📄 License

MIT — Feel free to use, modify, and share!

