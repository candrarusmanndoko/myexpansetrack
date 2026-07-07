import express from "express";

import path from "path";

import { createServer as createViteServer } from "vite";

import { db } from "./src/lib/database.js";

import { scanAndParseReceipt } from "./src/lib/ocr.js";

import {

downloadTelegramFile,

getTelegramBotInfo,

sendTelegramMessage,

setTelegramWebhook,

} from "./src/lib/telegram.js";


// Load env vars

import dotenv from "dotenv";

dotenv.config();


const app = express();

const PORT = 3000;


// Middleware penting

app.use(express.json({ limit: "50mb" }));

app.use(express.urlencoded({ limit: "50mb", extended: true }));


/**

* Endpoint Utama API

*/


// 1. Get Expenses

app.get("/api/expenses", async (req, res) => {

try {

const userTelegramId = req.query.user_telegram_id as string | undefined;

const data = await db.getExpenses(userTelegramId);

res.json({ success: true, data });

} catch (err: any) {

res.status(500).json({ success: false, error: err.message });

}

});


// 2. Add Expense Manually (dari Dashboard)

app.post("/api/expenses", async (req, res) => {

try {

const { description, category, total, date, user_telegram_id } = req.body;

if (!description || !category || total === undefined) {

return res.status(400).json({ success: false, error: "Deskripsi, Kategori, dan Total wajib diisi." });

}

const newExpense = await db.addExpense({

description,

category,

total: Number(total),

date: date || new Date().toISOString().split("T")[0],

user_telegram_id: user_telegram_id || "web-manual",

});

res.json({ success: true, data: newExpense });

} catch (err: any) {

res.status(500).json({ success: false, error: err.message });

}

});


// 3. Delete Expense

app.delete("/api/expenses/:id", async (req, res) => {

try {

const { id } = req.params;

const deleted = await db.deleteExpense(id);

if (deleted) {

res.json({ success: true, message: "Pengeluaran berhasil dihapus." });

} else {

res.status(404).json({ success: false, error: "Data pengeluaran tidak ditemukan." });

}

} catch (err: any) {

res.status(500).json({ success: false, error: err.message });

}

});


// 4. Get System Status & Configuration

app.get("/api/config", async (req, res) => {

const isSupabase = db.isUsingSupabase();

const isTelegram = !!process.env.TELEGRAM_BOT_TOKEN;

const isGemini = !!process.env.GEMINI_API_KEY;

const isOpenAI = !!process.env.OPENAI_API_KEY;


let botUsername: string | null = null;

let botName: string | null = null;


if (isTelegram) {

const botInfo = await getTelegramBotInfo();

if (botInfo) {

botUsername = botInfo.username;

botName = botInfo.firstName;

}

}


res.json({

success: true,

supabaseConfigured: isSupabase,

telegramConfigured: isTelegram,

geminiConfigured: isGemini,

openaiConfigured: isOpenAI,

botUsername,

botName,

webhookUrl: process.env.APP_URL ? `${process.env.APP_URL}/api/bot` : null,

});

});


// 5. Trigger Webhook Registration

app.post("/api/telegram/set-webhook", async (req, res) => {

try {

const appUrl = req.body.appUrl || process.env.APP_URL;

if (!appUrl) {

return res.status(400).json({

success: false,

error: "Gagal menyetel webhook: APP_URL tidak terdefinisi di env dan tidak dikirim dari web.",

});

}


const result = await setTelegramWebhook(appUrl);

res.json(result);

} catch (err: any) {

res.status(500).json({ success: false, error: err.message });

}

});


// 6. Test Webhook Scanner (Simulasi OCR & Webhook langsung dari Web)

app.post("/api/telegram/test-webhook", async (req, res) => {

try {

const { base64Image, mimeType } = req.body;

if (!base64Image) {

return res.status(400).json({ success: false, error: "Gambar base64 wajib disertakan." });

}


console.log("OCR Simulasi: Memulai scanning struk via Dashboard...");

const parsed = await scanAndParseReceipt(base64Image, mimeType || "image/jpeg");


// Simpan ke DB dengan ID telegram simulasi

const mockTelegramId = "6739493795"; // Demo user telegram ID

const saved = await db.addExpense({

user_telegram_id: mockTelegramId,

description: parsed.description,

category: parsed.category,

total: parsed.total,

date: parsed.date,

});


res.json({

success: true,

data: saved,

parsed,

});

} catch (err: any) {

console.error("Test Webhook Error:", err);

res.status(500).json({ success: false, error: err.message });

}

});


/**

* 7. WEBHOOK BOT TELEGRAM (/api/bot)

*/

app.post("/api/bot", async (req, res) => {

// Selalu balas OK ke Telegram secepatnya agar tidak dikirim ulang (timeout)

res.status(200).send("OK");


try {

const update = req.body;

if (!update || !update.message) return;


const message = update.message;

const chatId = message.chat.id;

const userId = message.from?.id ? String(message.from.id) : "unknown";

const userFirstName = message.from?.first_name || "Pengguna";

const messageId = message.message_id;


// A. Handle Perintah Teks

if (message.text) {

const text = message.text.trim();


if (text.startsWith("/start")) {

const welcomeText = `Halo <b>${userFirstName}</b>! Selamat datang di <b>Telegram Expense Tracker Bot</b> 🧾💰\n\nSaya adalah asisten AI yang siap mencatat pengeluaran keuangan Anda secara otomatis.\n\n<b>Cara Menggunakan:</b>\n1. Ambil foto struk belanja, kuitansi, karcis parkir, atau nota pembelian Anda.\n2. Kirim fotonya langsung ke chat bot ini.\n3. AI kami akan mendeteksi nominal total, tanggal, barang, dan mengategorikannya secara otomatis!\n4. Data akan langsung terupdate di dashboard web Anda secara real-time.\n\nKetik /help untuk bantuan, atau kirim foto struk pertama Anda sekarang! 🚀`;

await sendTelegramMessage(chatId, welcomeText, messageId);

return;

}


if (text.startsWith("/help")) {

const helpText = `🧾 <b>Panduan Telegram Expense Tracker</b> 🧾\n\n• <b>Kirim Foto:</b> Kirim gambar struk belanja Anda untuk diproses oleh AI.\n• <b>Saran Foto Struk:</b> Pastikan foto cukup terang, fokus, dan teks nominal total belanja terlihat jelas.\n• <b>Database:</b> Data disimpan ke Supabase Cloud (jika diaktifkan) atau file lokal di server.\n• <b>Kategori AI:</b> Makanan, Transport, Belanja, Hiburan, Tagihan, dan Lain-lain.\n\nSilakan kirim foto nota/kuitansi/struk belanja Anda sekarang!`;

await sendTelegramMessage(chatId, helpText, messageId);

return;

}


if (text.startsWith("/status")) {

const stats = await db.getExpenses(userId);

const totalAmount = stats.reduce((acc, curr) => acc + curr.total, 0);

const statusText = `📊 <b>Status Pengeluaran Anda (User ID: ${userId})</b>\n\n• Jumlah Struk: <b>${stats.length} struk</b>\n• Total Pengeluaran: <b>Rp ${totalAmount.toLocaleString("id-ID")}</b>\n\nLihat laporan selengkapnya di dashboard web!`;

await sendTelegramMessage(chatId, statusText, messageId);

return;

}


// Jika teks biasa dikirim (bukan command)

const replyText = `Halo <b>${userFirstName}</b>, kirimkan foto struk belanja atau nota pembelian Anda agar saya dapat mendeteksi total pengeluaran dan menyimpannya secara otomatis! 📸🧾\n\nKetik /status untuk melihat ringkasan pengeluaran Anda.`;

await sendTelegramMessage(chatId, replyText, messageId);

return;

}


// B. Handle Pesan Gambar (Foto Struk)

if (message.photo && message.photo.length > 0) {

// Telegram mengirimkan beberapa resolusi, pilih yang terbesar (indeks terakhir)

const photoArray = message.photo;

const largestPhoto = photoArray[photoArray.length - 1];

const fileId = largestPhoto.file_id;


// Kirim pesan pemberitahuan sedang diproses

const processingMsgId = await new Promise<number | undefined>(async (resolve) => {

try {

const loadingText = "⚡ <i>Menghubungkan ke AI Vision... Sedang memindai struk Anda, harap tunggu sebentar...</i>";

// Kita tidak perlu replyToMessageId untuk loading agar rapi, tapi kita bisa kirim

// Kami akan mengembalikan id jika memungkinkan, tetapi Telegram sendMessage tidak langsung mengembalikan ID di wrapper kami.

// Jadi kita kirim saja pesannya terlebih dahulu.

await sendTelegramMessage(chatId, loadingText, messageId);

resolve(undefined);

} catch {

resolve(undefined);

}

});


console.log(`Telegram Bot: Menerima foto struk dari user ${userFirstName} (${userId}). Mengunduh...`);


try {

// Unduh gambar dari Telegram CDN

const { base64, mimeType } = await downloadTelegramFile(fileId);

console.log("Telegram Bot: Gambar berhasil diunduh. Mengirim ke AI Scanner...");


// Jalankan OCR & parsing AI

const parsed = await scanAndParseReceipt(base64, mimeType);

console.log("Telegram Bot: Hasil parsing AI:", parsed);


// Simpan ke DB dengan ID telegram user asli

const savedExpense = await db.addExpense({

user_telegram_id: userId,

description: parsed.description,

category: parsed.category,

total: parsed.total,

date: parsed.date,

});


// Format balasan sukses

const successText = `✅ <b>Struk Berhasil Dicatat!</b> 🧾💰\n\n• <b>Deskripsi:</b> ${savedExpense.description}\n• <b>Kategori:</b> 🏷️ ${savedExpense.category}\n• <b>Total Belanja:</b> 💵 <b>Rp ${savedExpense.total.toLocaleString("id-ID")}</b>\n• <b>Tanggal Nota:</b> 📅 ${savedExpense.date}\n\n<i>Transaksi telah berhasil disimpan ke database. Pantau grafik keuangan Anda di Dashboard Web!</i>`;


await sendTelegramMessage(chatId, successText, messageId);

} catch (scanErr: any) {

console.error("Telegram Bot OCR/Save Error:", scanErr);

const errorText = `❌ <b>Gagal Memproses Struk</b>\n\nMaaf, AI kami gagal mengekstrak informasi dari struk tersebut. Pastikan foto struk tegak, terang, teks nominal terlihat jelas, dan bukan gambar blur.\n\n<i>Detail Error: ${scanErr.message}</i>`;

await sendTelegramMessage(chatId, errorText, messageId);

}

}

} catch (error) {

console.error("Webhook Bot Telegram Error Utama:", error);

}

});


/**

* Setup Frontend: Menghubungkan ke Vite di Dev Mode, atau melayani folder static dist di Prod Mode

*/

async function startServer() {

if (process.env.NODE_ENV !== "production") {

console.log("Server: Menghubungkan ke Vite development middleware...");

const vite = await createViteServer({

server: { middlewareMode: true },

appType: "spa",

});

app.use(vite.middlewares);

} else {

console.log("Server: Menjalankan dalam mode produksi static...");

const distPath = path.join(process.cwd(), "dist");

app.use(express.static(distPath));

app.get("*", (req, res) => {

res.sendFile(path.join(distPath, "index.html"));

});

}


app.listen(PORT, "0.0.0.0", () => {

console.log(`Express Server berjalan di port ${PORT}`);

console.log(`Aplikasi dapat diakses di http://localhost:${PORT}`);

});

}


if (!process.env.VERCEL) {

startServer();

}


export default app;


