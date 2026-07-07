const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

/**
 * Mengirim pesan teks balik ke pengguna Telegram.
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  replyToMessageId?: number
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("Telegram: TELEGRAM_BOT_TOKEN belum diset.");
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
        reply_to_message_id: replyToMessageId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Telegram: Gagal mengirim pesan. Status: ${response.status}`, errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Telegram: Terjadi error saat mengirim pesan:", error);
    return false;
  }
}

/**
 * Mengunduh file foto dari Telegram berdasarkan fileId, mengembalikan data dalam format base64 dan mimetype.
 */
export async function downloadTelegramFile(
  fileId: string
): Promise<{ base64: string; mimeType: string }> {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error("Telegram: TELEGRAM_BOT_TOKEN belum diset.");
  }

  try {
    // 1. Dapatkan file path dari Telegram API
    const getFileUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`;
    const fileResponse = await fetch(getFileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Telegram getFile gagal dengan status ${fileResponse.status}`);
    }

    const fileData = (await fileResponse.json()) as {
      ok: boolean;
      result?: { file_path: string };
    };

    if (!fileData.ok || !fileData.result?.file_path) {
      throw new Error("Telegram: Gagal mendapatkan file path.");
    }

    const filePath = fileData.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

    // 2. Unduh file sebagai arrayBuffer
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Gagal mengunduh file dari Telegram CDN. Status: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    // Deteksi mimetype dari ekstensi file
    let mimeType = "image/jpeg";
    if (filePath.endsWith(".png")) {
      mimeType = "image/png";
    } else if (filePath.endsWith(".webp")) {
      mimeType = "image/webp";
    }

    return {
      base64,
      mimeType,
    };
  } catch (error) {
    console.error("Telegram: Gagal mengunduh file:", error);
    throw error;
  }
}

/**
 * Mengambil informasi dasar bot Telegram (username) untuk validasi.
 */
export async function getTelegramBotInfo(): Promise<{ username: string; firstName: string } | null> {
  if (!TELEGRAM_BOT_TOKEN) return null;

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = (await response.json()) as {
      ok: boolean;
      result?: { username: string; first_name: string };
    };

    if (data.ok && data.result) {
      return {
        username: data.result.username,
        firstName: data.result.first_name,
      };
    }
    return null;
  } catch (error) {
    console.error("Telegram: Gagal mengambil info Bot:", error);
    return null;
  }
}

/**
 * Menyetel URL webhook Telegram bot.
 */
export async function setTelegramWebhook(
  appUrl: string
): Promise<{ success: boolean; message: string }> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { success: false, message: "TELEGRAM_BOT_TOKEN belum diset di server." };
  }

  // Bersihkan URL dan tambahkan endpoint webhook
  let formattedUrl = appUrl.trim();
  if (formattedUrl.endsWith("/")) {
    formattedUrl = formattedUrl.slice(0, -1);
  }
  const webhookUrl = `${formattedUrl}/api/bot`;

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(
      webhookUrl
    )}`;
    const response = await fetch(url);
    const data = (await response.json()) as { ok: boolean; description?: string };

    if (data.ok) {
      return {
        success: true,
        message: `Webhook berhasil diset ke: ${webhookUrl}`,
      };
    } else {
      return {
        success: false,
        message: `Gagal menyetel webhook Telegram: ${data.description || "Unknown error"}`,
      };
    }
  } catch (error) {
    console.error("Telegram: Gagal menyetel webhook:", error);
    return {
      success: false,
      message: `Terjadi kesalahan saat menyetel webhook: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
