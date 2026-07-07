import { GoogleGenAI, Type } from "@google/genai";
import { ParseReceiptResult } from "../types.js";

// Ambil kunci API
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

let ai: GoogleGenAI | null = null;
if (GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

/**
 * Melakukan OCR dan Parsing Struk menggunakan Gemini 3.5 Flash Vision secara utama,
 * atau fallback ke OpenAI Vision jika Gemini tidak tersedia atau terjadi error.
 */
export async function scanAndParseReceipt(
  base64Image: string,
  mimeType: string = "image/jpeg"
): Promise<ParseReceiptResult> {
  const todayStr = new Date().toISOString().split("T")[0];

  const promptText = `Lakukan analisis mendalam pada gambar struk belanja / kuitansi berikut. 
Ekstrak informasi transaksi belanja dengan akurat.
Anda harus mengekstrak data berikut dalam bentuk format JSON:
1. total: Total nominal belanja/pengeluaran dalam angka murni (Integer/Float, tanpa mata uang Rp, tanpa simbol titik atau koma, contoh: 125000). Jika ada diskon atau kembalian, pastikan yang diambil adalah NILAI NETT AKHIR YANG DIBAYAR (GRAND TOTAL).
2. date: Tanggal transaksi dalam format YYYY-MM-DD. Jika tahun tidak tertera jelas atau rusak, asumsikan tahun saat ini (2026). Jika tanggal tidak ditemukan sama sekali di struk, gunakan tanggal hari ini: ${todayStr}.
3. description: Nama toko, restoran, merchant, atau deskripsi singkat barang yang dibeli (contoh: "Kopi Kenangan Kemang", "SPBU Pertamina", "Superindo Bulanan"). Maksimal 5-7 kata.
4. category: Pilih kategori yang paling cocok dari daftar berikut saja: "Makanan" (untuk resto/kafe/cemilan), "Transport" (bensin/parkir/tol/ojek), "Belanja" (supermarket/minimarket/baju/keperluan rumah), "Hiburan" (nonton/game/wisata), "Tagihan" (listrik/wifi/pulsa/kos), atau "Lain-lain".

Pastikan mengembalikan data dengan format JSON murni.`;

  // 1. Gunakan Gemini secara utama jika tersedia
  if (ai) {
    console.log("OCR: Menggunakan Gemini 3.5-flash Vision...");
    try {
      const imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: base64Image,
        },
      };

      const textPart = {
        text: promptText,
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, textPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              total: {
                type: Type.NUMBER,
                description: "Total nominal pengeluaran akhir dalam Rupiah (tanpa simbol Rp, titik, atau koma).",
              },
              date: {
                type: Type.STRING,
                description: "Tanggal transaksi dalam format YYYY-MM-DD.",
              },
              description: {
                type: Type.STRING,
                description: "Nama toko/merchant dan deskripsi singkat belanja.",
              },
              category: {
                type: Type.STRING,
                description: "Kategori pengeluaran. Harus salah satu dari: Makanan, Transport, Belanja, Hiburan, Tagihan, Lain-lain.",
              },
            },
            required: ["total", "date", "description", "category"],
          },
        },
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("Gemini mengembalikan respon kosong");
      }

      const parsed = JSON.parse(resultText);
      return {
        total: Number(parsed.total) || 0,
        date: parsed.date || todayStr,
        description: parsed.description || "Struk Belanja",
        category: parsed.category || "Lain-lain",
      };
    } catch (err) {
      console.error("OCR Error (Gemini):", err);
      console.log("OCR: Gagal dengan Gemini, mencoba fallback ke OpenAI jika tersedia...");
    }
  }

  // 2. Fallback ke OpenAI jika API Key diisi
  if (OPENAI_API_KEY) {
    console.log("OCR: Menggunakan OpenAI GPT-4o-mini Vision...");
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: promptText,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI HTTP Error: ${response.status} ${response.statusText}`);
      }

      const resJson = await response.json();
      const content = resJson.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return {
          total: Number(parsed.total) || 0,
          date: parsed.date || todayStr,
          description: parsed.description || "Struk Belanja",
          category: parsed.category || "Lain-lain",
        };
      }
    } catch (err) {
      console.error("OCR Error (OpenAI):", err);
    }
  }

  throw new Error("OCR Error: Tidak ada API Key yang terkonfigurasi (GEMINI_API_KEY atau OPENAI_API_KEY tidak ditemukan) atau semua AI mengalami error.");
}
