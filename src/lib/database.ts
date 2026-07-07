import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { Expense, ExpenseInput } from "../types.js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let supabase: any = null;
let isSupabaseConfigured = false;

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    isSupabaseConfigured = true;
    console.log("Database: Berhasil terhubung ke Supabase Cloud.");
  } catch (err) {
    console.error("Database: Gagal menginisialisasi Supabase client:", err);
  }
} else {
  console.log("Database: Supabase tidak terkonfigurasi. Berjalan dalam mode Local File DB (expenses.json).");
}

const LOCAL_DB_PATH = path.join(process.cwd(), "expenses.json");

// Inisialisasi data bawaan agar dashboard terlihat bagus jika kosong
const DEFAULT_EXPENSES: Expense[] = [
  {
    id: "1",
    user_telegram_id: "6739493795",
    description: "Kopi Susu & Croissant - Kopi Kenangan",
    category: "Makanan",
    total: 45000,
    date: "2026-07-06",
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: "2",
    user_telegram_id: "6739493795",
    description: "Bensin Pertamax - SPBU Pertamina",
    category: "Transport",
    total: 100000,
    date: "2026-07-05",
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: "3",
    user_telegram_id: "12345678",
    description: "Belanja Bulanan Sayur & Daging - Indomaret",
    category: "Belanja",
    total: 235000,
    date: "2026-07-04",
    created_at: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: "4",
    user_telegram_id: "6739493795",
    description: "Langganan Netflix Premium",
    category: "Hiburan",
    total: 186000,
    date: "2026-07-01",
    created_at: new Date(Date.now() - 432000000).toISOString()
  }
];

function readLocalDB(): Expense[] {
  try {
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(DEFAULT_EXPENSES, null, 2), "utf8");
      return DEFAULT_EXPENSES;
    }
    const data = fs.readFileSync(LOCAL_DB_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Database: Gagal membaca database lokal:", error);
    return [];
  }
}

function writeLocalDB(data: Expense[]): void {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Database: Gagal menyimpan database lokal:", error);
  }
}

export const db = {
  isUsingSupabase: () => isSupabaseConfigured,

  async getExpenses(userTelegramId?: string): Promise<Expense[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from("expenses").select("*").order("date", { ascending: false });
        if (userTelegramId) {
          query = query.eq("user_telegram_id", userTelegramId);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (err: any) {
        if (err && err.code === "42P01") {
          console.log("Database Info: Tabel 'expenses' belum dibuat di database Supabase Anda.");
          console.log("-> Solusi: Silakan salin & jalankan script SQL migrasi di tab 'Database' pada dashboard aplikasi Anda.");
        } else {
          console.log(`Database Info: Supabase query gagal (${err?.message || String(err)}).`);
        }
        console.log("Database Status: Menggunakan Local DB (expenses.json) sebagai fallback otomatis.");
      }
    }

    // Fallback atau Local Mode
    const localData = readLocalDB();
    if (userTelegramId) {
      return localData.filter(e => e.user_telegram_id === userTelegramId);
    }
    // Urutkan berdasarkan tanggal terbaru
    return [...localData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async addExpense(input: ExpenseInput): Promise<Expense> {
    const newExpense: Expense = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      user_telegram_id: input.user_telegram_id || "web-manual",
      description: input.description || "Pengeluaran Tanpa Judul",
      category: input.category || "Lain-lain",
      total: Number(input.total) || 0,
      date: input.date || new Date().toISOString().split("T")[0],
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("expenses")
          .insert([newExpense])
          .select();
        if (error) throw error;
        if (data && data[0]) return data[0];
      } catch (err: any) {
        console.log(`Database Info: Gagal menambahkan data ke Supabase (${err?.message || String(err)}).`);
        console.log("Database Status: Menyimpan ke Local DB sebagai fallback otomatis.");
      }
    }

    // Fallback atau Local Mode
    const localData = readLocalDB();
    localData.push(newExpense);
    writeLocalDB(localData);
    return newExpense;
  },

  async deleteExpense(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from("expenses").delete().eq("id", id);
        if (error) throw error;
        return true;
      } catch (err: any) {
        console.log(`Database Info: Gagal menghapus data dari Supabase (${err?.message || String(err)}).`);
        console.log("Database Status: Menghapus dari Local DB sebagai fallback otomatis.");
      }
    }

    // Fallback atau Local Mode
    const localData = readLocalDB();
    const filteredData = localData.filter(e => e.id !== id);
    if (localData.length === filteredData.length) return false;
    writeLocalDB(filteredData);
    return true;
  }
};
