# 🤖 Minecraft AFK Bot — Treo Server Aternos 24/7

[🇺🇸 English](./README.md)

Bot Minecraft tự động treo server Aternos 24/7 miễn phí, chạy trên HuggingFace Spaces. Có giao diện web panel đẹp để cấu hình, hỗ trợ chống AFK thông minh, auto-login plugin LoginSecurity, và thông báo Discord.

---

## ✨ Tính Năng

- 🎮 **Kết nối Minecraft Java Edition** — Hỗ trợ mọi phiên bản
- 🏃 **Chống AFK thông minh** — Giả lập player thật (di chuyển, nhảy, nhìn xung quanh, chat...)
- 🔐 **Auto-Login LoginSecurity** — Tự đăng ký & đăng nhập plugin LoginSecurity
- 💬 **Discord Webhook** — Thông báo trạng thái bot, player join/leave, phát hiện hack
- 🌐 **Web Panel** — Cấu hình bot qua giao diện web đẹp, dễ dùng
- ☁️ **Chạy miễn phí** — Deploy trên HuggingFace Spaces (free)

---

## 📋 Yêu Cầu

Bạn cần chuẩn bị những thứ sau trước khi bắt đầu:

| # | Yêu cầu | Ghi chú |
|---|---------|---------|
| 1 | Tài khoản [HuggingFace](https://huggingface.co/) | Miễn phí, đăng ký bằng email |
| 2 | Server [Aternos](https://aternos.org/) | Đã tạo sẵn server Minecraft |
| 3 | *(Tùy chọn)* Discord Webhook URL | Nếu muốn nhận thông báo về Discord |

---

## 🚀 Hướng Dẫn Setup Từng Bước

### Bước 1: Tạo Tài Khoản HuggingFace

1. Truy cập **[huggingface.co](https://huggingface.co/)**
2. Nhấn nút **"Sign Up"** (góc trên bên phải)
3. Đăng ký bằng **email** hoặc **Google/GitHub**
4. Xác nhận email nếu được yêu cầu
5. Đăng nhập vào tài khoản

---

### Bước 2: Tạo HuggingFace Space Mới

1. Sau khi đăng nhập, nhấn vào **avatar** của bạn (góc trên bên phải)
2. Chọn **"New Space"**
3. Điền thông tin:

   | Mục | Giá trị |
   |-----|---------|
   | **Space name** | Đặt tên tùy ý, ví dụ: `minecraft-bot` |
   | **License** | Chọn `MIT` hoặc để trống |
   | **Select the Space SDK** | ⚠️ Chọn **Docker** |
   | **Space hardware** | Chọn **CPU basic · FREE** |
   | **Visibility** | Chọn **Private** (quan trọng! để bảo mật) |

4. Nhấn **"Create Space"**

> ⚠️ **QUAN TRỌNG:** Phải chọn **Docker** chứ không phải Gradio hay Streamlit!

> ⚠️ **BẢO MẬT:** Nên chọn **Private** để không ai thấy thông tin server của bạn!

---

### Bước 3: Upload Files Lên Space

Có **2 cách** để upload files:

#### Cách 1: Upload Qua Giao Diện Web (Dễ nhất) 👈

1. Sau khi tạo Space xong, bạn sẽ thấy trang Space trống
2. Nhấn tab **"Files"** (ở thanh tab phía trên)
3. Nhấn nút **"+ Add file"** → chọn **"Upload files"**
4. Kéo thả **TẤT CẢ** các file sau vào khung upload:

   ```
   📁 Cần upload những file/thư mục này:
   ├── Dockerfile
   ├── index.js
   ├── package.json
   ├── package-lock.json
   ├── donate.png
   └── 📁 public/
       ├── index.html
       └── style.css
   ```

   > **Lưu ý:** Bạn cần upload cả thư mục `public/` với 2 file bên trong

5. **Upload thư mục `public/`:**
   - Nhấn **"+ Add file"** → **"Upload files"**
   - Kéo thả cả **thư mục `public`** vào
   - Hoặc: Nhấn **"+ Add file"** → **"Create a new file"**
     - Đặt tên: `public/index.html` → copy paste nội dung file `index.html`
     - Lặp lại với `public/style.css`

6. Điền commit message (ví dụ: `Upload bot files`) → nhấn **"Commit"**

#### Cách 2: Upload Qua Git (Cho người biết dùng Git)

1. Mở Terminal / Command Prompt
2. Clone Space về máy:
   ```bash
   git clone https://huggingface.co/spaces/TÊN-CỦA-BẠN/minecraft-bot
   cd minecraft-bot
   ```
3. Copy tất cả file bot vào thư mục đã clone
4. Push lên:
   ```bash
   git add .
   git commit -m "Upload bot files"
   git push
   ```

> 💡 **Khi nào bạn push/upload xong, HuggingFace sẽ tự động build Docker image và chạy bot!**

---

### Bước 4: Chờ Build Hoàn Tất

1. Quay lại trang Space của bạn
2. Nhấn tab **"App"** 
3. Bạn sẽ thấy trạng thái **"Building..."** — đợi khoảng **1-3 phút**
4. Khi build xong, trạng thái chuyển sang **"Running"** ✅
5. Bạn sẽ thấy **Web Panel** hiện lên — đây là trang cấu hình bot!

> Nếu bị lỗi build, nhấn vào **"Logs"** để xem chi tiết lỗi.

---

### Bước 5: Lấy Thông Tin Server Aternos

Trước khi cấu hình bot, bạn cần lấy thông tin server Aternos:

1. Đăng nhập **[aternos.org](https://aternos.org/)**
2. Nhấn vào server của bạn
3. **Bật server lên** (nhấn nút Start)
4. Khi server đang chạy, ghi lại thông tin:

   | Thông tin | Ví dụ | Nơi tìm |
   |-----------|-------|---------|
   | **Server Address** | `tênserver.aternos.me` | Trang chủ server, dòng "Address" |
   | **Port** | `44076` | Nằm sau dấu `:` trong address (VD: `tênserver.aternos.me:44076`) |
   | **Phiên bản MC** | `1.21.1` | Mục "Software" trên trang server |

   > ⚠️ **Port Aternos luôn thay đổi** mỗi khi bật server! Bạn cần cập nhật port trong panel mỗi lần server restart.

5. **⚠️ BẮT BUỘC — Bật Cracked (Bản bẻ khóa) cho server:**
   - Ở thanh menu bên trái của Aternos, chọn mục **"Options"** (Tùy chọn).
   - Tìm cài đặt mang tên **"Cracked"** (Bản bẻ khóa).
   - Bật nút gạt này lên (chuyển sang màu xanh lá cây hoặc có dấu check).
   - *Giải thích:* Bot sử dụng cơ chế đăng nhập Offline (Cracked) nên nếu server không bật tính năng này, bot sẽ bị chặn với lỗi "Not authenticated with Minecraft.net" hoặc "Disallowed connection".

---

### Bước 6: Cấu Hình Bot Qua Web Panel

1. Quay lại **HuggingFace Space** của bạn (tab "App")
2. Bạn sẽ thấy giao diện **MC Bot Control Panel**
3. Điền thông tin:

#### 🎮 Thông Tin Server

| Mục | Điền gì | Ví dụ |
|-----|---------|-------|
| **Tên Bot** | Tên hiển thị của bot trong game | `BotTreoServer` |
| **Server Host** | Địa chỉ server Aternos (KHÔNG có port) | `tênserver.aternos.me` |
| **Server Port** | Port của server | `44076` |
| **Phiên Bản MC** | Phiên bản Minecraft của server | `1.21.1` |

#### 💬 Discord Webhook (Tùy chọn)

Nếu bạn muốn nhận thông báo về Discord:

1. Bật toggle **Discord Webhook** → nút chuyển sang màu tím
2. Điền **Webhook URL**:
   - Mở Discord → vào server Discord của bạn
   - Nhấn chuột phải vào **kênh text** muốn nhận thông báo
   - Chọn **"Edit Channel"** → **"Integrations"** → **"Webhooks"**
   - Nhấn **"New Webhook"** → đặt tên → nhấn **"Copy Webhook URL"**
   - Dán URL vào ô **Webhook URL**
3. **Webhook Proxy** (tùy chọn): Nếu HuggingFace chặn gửi trực tiếp đến Discord, bạn cần tạo proxy qua Google Apps Script. Bỏ trống nếu không cần.

#### 🏃 Chống AFK

- **BẬT** (mặc định): Bot tự di chuyển, nhảy, nhìn xung quanh... giống player thật để không bị kick
- **TẮT**: Bot đứng yên sau khi join server

> 💡 Nên **BẬT** để tránh bị server kick do AFK!

#### 🔐 LoginSecurity Plugin

Nếu server có cài plugin **LoginSecurity** (yêu cầu đăng nhập khi vào game):

1. Bật toggle **LoginSecurity Plugin** → nút chuyển sang màu tím
2. Nhập **mật khẩu** cho bot vào ô "Mật Khẩu Bot"
3. Bot sẽ tự xử lý:
   - **Lần đầu** vào server: Bot tự gửi `/register mậtkhẩu mậtkhẩu` để tạo tài khoản
   - **Các lần sau**: Bot tự gửi `/login mậtkhẩu` để đăng nhập

> ⚠️ Nếu server **KHÔNG** có plugin LoginSecurity → **TẮT** toggle này!

---

### Bước 7: Lưu & Chạy Bot

1. Sau khi điền xong thông tin, nhấn nút **"💾 Lưu & Khởi Động Lại Bot"**
2. Đợi 2-3 giây, sẽ hiện thông báo **"Đã lưu cấu hình & restart bot!"**
3. Thanh trạng thái phía trên sẽ chuyển từ 🔴 **Offline** sang 🟢 **Online** khi bot join server thành công
4. **Xong!** Bot đang treo server cho bạn! 🎉

---

## ❓ Câu Hỏi Thường Gặp (FAQ)

### Bot không vào được server?

| Nguyên nhân | Cách fix |
|-------------|----------|
| Server chưa bật | Bật server Aternos trước |
| Sai host/port | Kiểm tra lại địa chỉ và port trên Aternos |
| Chưa bật Cracked | Vào Options (Tùy chọn) trên Aternos → Bật Cracked |
| Sai phiên bản MC | Kiểm tra phiên bản MC của server Aternos |
| Port thay đổi | Aternos đổi port mỗi lần restart — cập nhật lại |

### Bot vào được nhưng bị kick ngay?

- Kiểm tra server có plugin **LoginSecurity** không → bật toggle và nhập mật khẩu
- Kiểm tra server có **whitelist** không → thêm tên bot vào whitelist
- Kiểm tra **anti-bot plugin** trên server → có thể cần tắt

### Bot offline sau 1 thời gian?

- **HuggingFace free** sẽ tự sleep sau ~48h không có traffic
- Giải pháp: Dùng [UptimeRobot](https://uptimerobot.com/) (miễn phí) để ping Space mỗi 5 phút
  1. Tạo tài khoản UptimeRobot
  2. Add New Monitor → HTTP(s)
  3. URL: `https://TÊN-CỦA-BẠN-minecraft-bot.hf.space/health`
  4. Monitoring Interval: 5 minutes
  5. Nhấn Create Monitor

### Làm sao biết bot đang chạy?

- Mở Web Panel → xem thanh trạng thái (**🟢 Online** = đang chạy)
- Nếu bật Discord Webhook → bot sẽ gửi thông báo khi join/disconnect

### Port Aternos thay đổi liên tục?

Đúng vậy, **Aternos thay đổi port mỗi lần restart server**. Bạn cần:
1. Bật server Aternos → ghi lại port mới
2. Mở Web Panel → đổi port → nhấn Save

---

## 🔧 Cấu Hình Nâng Cao (Tùy Chọn)

### Dùng Environment Variables

Thay vì cấu hình qua Web Panel, bạn có thể set biến môi trường trong HuggingFace:

1. Vào **Settings** của Space
2. Kéo xuống mục **"Variables and secrets"**
3. Nhấn **"New secret"** và thêm:

| Tên biến | Ví dụ | Mô tả |
|----------|-------|-------|
| `MC_HOST` | `tênserver.aternos.me` | Địa chỉ server |
| `MC_PORT` | `44076` | Port server |
| `MC_USERNAME` | `BotCuaToi` | Tên bot |
| `MC_VERSION` | `1.21.1` | Phiên bản MC |
| `DISCORD_WEBHOOK_URL` | `https://discord.com/api/webhooks/...` | Webhook Discord |
| `WEBHOOK_PROXY` | `https://script.google.com/...` | Proxy URL |
| `BOT_PASSWORD` | `matkhau123` | Mật khẩu LoginSecurity |
| `ANTI_AFK` | `true` hoặc `false` | Bật/tắt chống AFK |

> 💡 Env vars sẽ **override** config từ Web Panel. Phù hợp nếu bạn muốn giấu thông tin nhạy cảm (webhook URL, password).

---

## 📝 Ghi Chú

- Bot chỉ hoạt động với **Minecraft Java Edition** (không hỗ trợ Bedrock)
- Bot sử dụng **offline/cracked mode** — server bắt buộc phải bật **Cracked** (Bản bẻ khóa) trong Options.
- Khi server Aternos tắt, bot sẽ tự reconnect với exponential backoff (30s → 60s → 120s... tối đa 10 phút)
- Config được lưu persistent trên HuggingFace — không mất khi container restart

---

## ☕ Ủng Hộ (Donate)

Nếu dự án này giúp ích cho bạn, bạn có thể mời mình một ly cà phê qua Viettel Money / VietQR:

![Donate QR](donate.png)

Cảm ơn sự đóng góp quý giá của bạn! ❤️

---

## 🐛 Báo Cáo Lỗi & Hỗ Trợ

Nếu bạn phát hiện lỗi hoặc cần hỗ trợ, vui lòng gửi phản hồi qua email:
📧 **dn250507@gmail.com**

---

## ⚠️ Miễn Trừ Trách Nhiệm (Disclaimer)

Dự án này được tạo ra hoàn toàn phục vụ cho **mục đích nghiên cứu và học tập cá nhân**. 
- Tác giả không chịu trách nhiệm cho bất kỳ hình thức xử phạt (ban/kick) hay mất mát nào từ phía nhà cung cấp dịch vụ server (ví dụ: Aternos, HuggingFace, v.v.) phát sinh do việc sử dụng công cụ này.
- Hãy tự chịu trách nhiệm và tuân thủ Điều khoản dịch vụ của các nền tảng liên quan khi vận hành bot.

---

## 📄 License

MIT — Thoải mái sử dụng, chỉnh sửa, và chia sẻ!
