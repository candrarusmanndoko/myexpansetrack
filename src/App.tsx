import React, { useState, useEffect, useRef } from "react";

import {

TrendingUp,

Receipt,

Plus,

Trash2,

Settings,

HelpCircle,

Database,

Bot,

Sparkles,

Search,

Filter,

RefreshCw,

Upload,

AlertCircle,

CheckCircle2,

Terminal,

FileText,

Calendar,

Wallet,

ArrowRight,

User,

Info,

} from "lucide-react";

import { Expense, SystemConfigStatus } from "./types.js";


export default function App() {

// States

const [expenses, setExpenses] = useState<Expense[]>([]);

const [loading, setLoading] = useState<boolean>(true);

const [isClientOnly, setIsClientOnly] = useState<boolean>(false);

const [config, setConfig] = useState<SystemConfigStatus>({

supabaseConfigured: false,

telegramConfigured: false,

geminiConfigured: false,

openaiConfigured: false,

botUsername: null,

webhookUrl: null,

});


// Filter States

const [searchQuery, setSearchQuery] = useState<string>("");

const [categoryFilter, setCategoryFilter] = useState<string>("Semua");


// Form States (Manual Add)

const [showManualModal, setShowManualModal] = useState<boolean>(false);

const [manualDesc, setManualDesc] = useState<string>("");

const [manualCategory, setManualCategory] = useState<string>("Makanan");

const [manualTotal, setManualTotal] = useState<string>("");

const [manualDate, setManualDate] = useState<string>(

new Date().toISOString().split("T")[0]

);

const [manualTelegramId, setManualTelegramId] = useState<string>("web-manual");

const [submittingManual, setSubmittingManual] = useState<boolean>(false);


// Simulation State (Dashboard Scanner)

const [simFile, setSimFile] = useState<File | null>(null);

const [simPreviewUrl, setSimPreviewUrl] = useState<string | null>(null);

const [simulating, setSimulating] = useState<boolean>(false);

const [simResult, setSimResult] = useState<any>(null);

const fileInputRef = useRef<HTMLInputElement>(null);


// Status Alerts

const [alertMsg, setAlertMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);


// Active Tab

const [activeTab, setActiveTab] = useState<"dashboard" | "database" | "telegram">("dashboard");


// Default mock data for local storage

const DEFAULT_LOCAL_EXPENSES: Expense[] = [

{

id: "local-1",

user_telegram_id: "web-manual",

description: "Kopi Susu & Croissant - Kopi Kenangan",

category: "Makanan",

total: 45000,

date: "2026-07-06",

created_at: new Date(Date.now() - 3600000).toISOString()

},

{

id: "local-2",

user_telegram_id: "web-manual",

description: "Bensin Pertamax - SPBU Pertamina",

category: "Transport",

total: 100000,

date: "2026-07-05",

created_at: new Date(Date.now() - 86400000).toISOString()

},

{

id: "local-3",

user_telegram_id: "12345678",

description: "Belanja Bulanan Sayur & Daging - Indomaret",

category: "Belanja",

total: 235000,

date: "2026-07-04",

created_at: new Date(Date.now() - 172800000).toISOString()

}

];


const getLocalExpenses = (): Expense[] => {

const saved = localStorage.getItem("local_expenses");

if (saved) {

try {

return JSON.parse(saved);

} catch (e) {

return DEFAULT_LOCAL_EXPENSES;

}

}

localStorage.setItem("local_expenses", JSON.stringify(DEFAULT_LOCAL_EXPENSES));

return DEFAULT_LOCAL_EXPENSES;

};


const saveLocalExpenses = (data: Expense[]) => {

localStorage.setItem("local_expenses", JSON.stringify(data));

setExpenses(data);

};


// Fetch Data

const fetchData = async () => {

setLoading(true);

try {

const expRes = await fetch("/api/expenses");

if (!expRes.ok) throw new Error("Gagal mengambil data dari server");

const expData = await expRes.json();

if (expData.success) {

setExpenses(expData.data);

}


const confRes = await fetch("/api/config");

const confData = await confRes.json();

if (confData.success) {

setConfig(confData);

}

setIsClientOnly(false);

} catch (err) {

console.warn("Backend server tidak terdeteksi. Berjalan dalam mode Client-Only (LocalStorage).", err);

setIsClientOnly(true);

setExpenses(getLocalExpenses());

setConfig({

supabaseConfigured: false,

telegramConfigured: false,

geminiConfigured: false,

openaiConfigured: false,

botUsername: "ClientOnlyBot",

webhookUrl: null,

});

} finally {

setLoading(false);

}

};


useEffect(() => {

fetchData();

}, []);


const showAlert = (type: "success" | "error", text: string) => {

setAlertMsg({ type, text });

setTimeout(() => {

setAlertMsg(null);

}, 5000);

};


// Register Webhook

const handleSetWebhook = async () => {

if (isClientOnly) {

showAlert("error", "Pendaftaran Telegram Webhook membutuhkan backend server yang berjalan.");

return;

}

try {

const response = await fetch("/api/telegram/set-webhook", {

method: "POST",

headers: { "Content-Type": "application/json" },

body: JSON.stringify({ appUrl: window.location.origin }),

});

const data = await response.json();

if (data.success) {

showAlert("success", data.message);

fetchData();

} else {

showAlert("error", data.error || data.message);

}

} catch (err: any) {

showAlert("error", "Gagal mendaftarkan webhook: " + err.message);

}

};


// Delete Expense

const handleDeleteExpense = async (id: string) => {

if (!confirm("Apakah Anda yakin ingin menghapus catatan pengeluaran ini?")) return;

if (isClientOnly) {

const updated = expenses.filter((e) => e.id !== id);

saveLocalExpenses(updated);

showAlert("success", "Pengeluaran berhasil dihapus dari browser (LocalStorage).");

return;

}


try {

const response = await fetch(`/api/expenses/${id}`, {

method: "DELETE",

});

const data = await response.json();

if (data.success) {

showAlert("success", "Pengeluaran berhasil dihapus.");

setExpenses(expenses.filter((e) => e.id !== id));

} else {

showAlert("error", data.error || "Gagal menghapus.");

}

} catch (err: any) {

showAlert("error", "Terjadi kesalahan: " + err.message);

}

};


// Handle Manual Submit

const handleManualSubmit = async (e: React.FormEvent) => {

e.preventDefault();

if (!manualDesc || !manualTotal) {

showAlert("error", "Deskripsi dan nominal total wajib diisi!");

return;

}


const newExpense: Expense = {

id: "local-" + Math.random().toString(36).substring(2, 9),

description: manualDesc,

category: manualCategory,

total: Number(manualTotal),

date: manualDate,

user_telegram_id: manualTelegramId || "web-manual",

created_at: new Date().toISOString()

};


if (isClientOnly) {

const updated = [newExpense, ...expenses];

saveLocalExpenses(updated);

showAlert("success", "Catatan pengeluaran berhasil disimpan secara lokal!");

setShowManualModal(false);

// Reset form

setManualDesc("");

setManualTotal("");

setManualCategory("Makanan");

setManualDate(new Date().toISOString().split("T")[0]);

return;

}


setSubmittingManual(true);

try {

const response = await fetch("/api/expenses", {

method: "POST",

headers: { "Content-Type": "application/json" },

body: JSON.stringify({

description: manualDesc,

category: manualCategory,

total: Number(manualTotal),

date: manualDate,

user_telegram_id: manualTelegramId || "web-manual",

}),

});

const data = await response.json();

if (data.success) {

showAlert("success", "Catatan pengeluaran manual berhasil ditambahkan!");

setExpenses([data.data, ...expenses]);

setShowManualModal(false);

// Reset form

setManualDesc("");

setManualTotal("");

setManualCategory("Makanan");

setManualDate(new Date().toISOString().split("T")[0]);

} else {

showAlert("error", data.error || "Gagal menambahkan data.");

}

} catch (err: any) {

showAlert("error", "Kesalahan server: " + err.message);

} finally {

setSubmittingManual(false);

}

};


// Handle OCR Simulation File Selection

const handleSimFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {

if (e.target.files && e.target.files[0]) {

const file = e.target.files[0];

setSimFile(file);

const reader = new FileReader();

reader.onloadend = () => {

setSimPreviewUrl(reader.result as string);

};

reader.readAsDataURL(file);

}

};


// Trigger Sim OCR pipeline

const handleTriggerSimOCR = async () => {

if (!simPreviewUrl) return;


if (isClientOnly) {

showAlert("error", "Fitur OCR AI Vision membutuhkan backend server aktif. Di Vercel statis, silakan masukkan data pengeluaran secara manual.");

return;

}


setSimulating(true);

setSimResult(null);


try {

// Ekstrak base64 murni tanpa header metadata uri

const base64Data = simPreviewUrl.split(",")[1];

const mimeType = simPreviewUrl.split(";")[0].split(":")[1] || "image/jpeg";


const response = await fetch("/api/telegram/test-webhook", {

method: "POST",

headers: { "Content-Type": "application/json" },

body: JSON.stringify({

base64Image: base64Data,

mimeType,

}),

});


const resData = await response.json();

if (resData.success) {

setSimResult(resData.parsed);

showAlert("success", "Gambar struk berhasil dipindai dan disimpan oleh AI!");

setExpenses([resData.data, ...expenses]);

} else {

showAlert("error", resData.error || "AI gagal menganalisis struk.");

}

} catch (err: any) {

showAlert("error", "Gagal memproses AI Vision: " + err.message);

} finally {

setSimulating(false);

}

};


// Clear Sim

const handleClearSim = () => {

setSimFile(null);

setSimPreviewUrl(null);

setSimResult(null);

if (fileInputRef.current) fileInputRef.current.value = "";

};


// Filtered Expenses

const filteredExpenses = expenses.filter((e) => {

const matchesSearch =

e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||

e.category.toLowerCase().includes(searchQuery.toLowerCase()) ||

e.user_telegram_id.includes(searchQuery);

const matchesCategory = categoryFilter === "Semua" || e.category === categoryFilter;

return matchesSearch && matchesCategory;

});


// Total Expenditures Calculated

const totalExpenditure = filteredExpenses.reduce((sum, item) => sum + item.total, 0);


// Category Breakdown for visual progress bars

const categoryTotals: Record<string, number> = {};

expenses.forEach((e) => {

categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.total;

});

const overallTotal = expenses.reduce((sum, item) => sum + item.total, 0) || 1;


const categoriesList = ["Makanan", "Transport", "Belanja", "Hiburan", "Tagihan", "Lain-lain"];

const categoryColors: Record<string, string> = {

Makanan: "bg-emerald-500",

Transport: "bg-blue-500",

Belanja: "bg-indigo-500",

Hiburan: "bg-amber-500",

Tagihan: "bg-rose-500",

"Lain-lain": "bg-slate-500",

};


const categoryTextColors: Record<string, string> = {

Makanan: "text-emerald-500 bg-emerald-50 border-emerald-200",

Transport: "text-blue-500 bg-blue-50 border-blue-200",

Belanja: "text-indigo-500 bg-indigo-50 border-indigo-200",

Hiburan: "text-amber-500 bg-amber-50 border-amber-200",

Tagihan: "text-rose-500 bg-rose-50 border-rose-200",

"Lain-lain": "text-slate-500 bg-slate-50 border-slate-200",

};


// SQL Script for user setup

const sqlScript = `-- 1. Buat Tabel Expenses di Supabase

CREATE TABLE expenses (

id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

user_telegram_id VARCHAR(255) NOT NULL,

description TEXT NOT NULL,

category VARCHAR(100) NOT NULL,

total DOUBLE PRECISION NOT NULL,

date DATE NOT NULL DEFAULT CURRENT_DATE,

created_at TIMESTAMPTZ DEFAULT NOW()

);


-- 2. Aktifkan Row Level Security (RLS)

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;


-- 3. Buat Policy agar pengguna hanya dapat mengakses data mereka sendiri

-- (Gunakan telegram ID sebagai otentikasi filter jika menggunakan custom user)

CREATE POLICY "Allow select for owner" 

ON expenses FOR SELECT 

USING (true); -- Membolehkan read global, atau ganti sesuai integrasi auth Anda.


CREATE POLICY "Allow insert for telegram bot" 

ON expenses FOR INSERT 

WITH CHECK (true); -- Membolehkan bot melakukan insert data.`;


return (

<div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">

{/* Sidebar Navigation */}

<aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0">

<div className="p-6 flex items-center space-x-3 text-white mb-4">

<div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg">

<Receipt className="w-5 h-5 text-white" />

</div>

<span className="text-xl font-semibold tracking-tight">BotScanned</span>

</div>


<nav className="flex-1 px-4 space-y-1">

<div className="p-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Menu</div>

<button

onClick={() => setActiveTab("dashboard")}

className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left cursor-pointer ${

activeTab === "dashboard"

? "bg-slate-800 text-white font-medium"

: "text-slate-400 hover:bg-slate-800 hover:text-white"

}`}

>

<TrendingUp className="w-5 h-5" />

<span className="font-medium">Dashboard</span>

</button>


<div className="p-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mt-6 mb-2">Configuration</div>


<button

onClick={() => setActiveTab("telegram")}

className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left cursor-pointer ${

activeTab === "telegram"

? "bg-slate-800 text-white font-medium"

: "text-slate-400 hover:bg-slate-800 hover:text-white"

}`}

>

<Bot className="w-5 h-5" />

<span className="font-medium">Bot Webhook</span>

</button>


<button

onClick={() => setActiveTab("database")}

className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left cursor-pointer ${

activeTab === "database"

? "bg-slate-800 text-white font-medium"

: "text-slate-400 hover:bg-slate-800 hover:text-white"

}`}

>

<Database className="w-5 h-5" />

<span className="font-medium">Supabase SQL</span>

</button>

</nav>


{/* Sidebar Footer Status Panel */}

<div className="p-6 border-t border-slate-800">

<div className="bg-slate-800/50 rounded-lg p-3 text-xs space-y-2">

<div className="flex justify-between items-center">

<span>App Mode:</span>

{isClientOnly ? (

<span className="text-amber-400 font-bold uppercase text-[10px]">Client-Only</span>

) : (

<span className="text-emerald-400 font-bold uppercase text-[10px]">Full-Stack</span>

)}

</div>

<div className="flex justify-between items-center">

<span>Bot Status:</span>

{config.telegramConfigured && !isClientOnly ? (

<span className="text-emerald-400 font-bold uppercase text-[10px]">Active</span>

) : (

<span className="text-rose-400 font-bold uppercase text-[10px]">Offline</span>

)}

</div>

<div className="flex justify-between items-center">

<span>Supabase:</span>

{config.supabaseConfigured && !isClientOnly ? (

<span className="text-emerald-400 font-bold uppercase text-[10px]">Cloud</span>

) : (

<span className="text-amber-400 font-bold uppercase text-[10px]">Local DB</span>

)}

</div>

</div>

</div>

</aside>


{/* Main Content Pane */}

<main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50">

{/* Top Header Bar */}

<header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-10">

<h1 className="text-lg font-bold text-slate-800">

{activeTab === "dashboard" && "Expense Analytics Overview"}

{activeTab === "database" && "Supabase SQL Script"}

{activeTab === "telegram" && "Telegram Bot Configuration"}

</h1>

<div className="flex items-center space-x-4">

<div className="text-right mr-4 hidden md:block">

<div className="text-xs text-slate-500">Active Telegram Bot</div>

<div className="text-sm font-mono font-medium text-slate-700">

{isClientOnly ? "@ClientOnlyBot" : config.botUsername ? `@${config.botUsername}` : "@not_configured"}

</div>

</div>

<div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-semibold uppercase">

{isClientOnly ? "CO" : config.botUsername ? config.botUsername.substring(0, 2) : "TG"}

</div>

</div>

</header>


{/* View Content Area (Scrollable) */}

<div className="flex-1 overflow-y-auto p-8 space-y-6">

{/* Client-Only (Vercel Fallback) Banner */}

{isClientOnly && (

<div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 flex gap-3 text-sm shadow-sm animate-fade-in">

<Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />

<div className="space-y-1">

<p className="font-semibold text-amber-950">Menjalankan dalam Mode Client-Only (Penyimpanan Lokal)</p>

<p className="text-xs text-amber-800 leading-relaxed">

Kami mendeteksi aplikasi Anda berjalan tanpa koneksi ke backend server (seperti pada static hosting Vercel). 

Semua fitur input pengeluaran manual, pencarian, filter, grafik, dan tabel <strong>tetap berfungsi penuh</strong> menggunakan penyimpanan lokal browser Anda!

</p>

<p className="text-[11px] text-amber-700/90 leading-relaxed mt-1">

<em>Catatan: Fitur pendaftaran Telegram Bot Webhook, pemindaian OCR AI Vision dari gambar struk, dan sinkronisasi cloud Supabase membutuhkan server backend Node.js yang aktif.</em>

</p>

</div>

</div>

)}


{/* Dynamic Alert Banner */}

{alertMsg && (

<div className="fixed top-20 right-8 z-50 animate-fade-in max-w-md">

<div

className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg ${

alertMsg.type === "success"

? "bg-emerald-50 text-emerald-800 border-emerald-200"

: "bg-rose-50 text-rose-800 border-rose-200"

}`}

>

{alertMsg.type === "success" ? (

<CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />

) : (

<AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />

)}

<div>

<p className="font-semibold text-sm">

{alertMsg.type === "success" ? "Berhasil" : "Kesalahan"}

</p>

<p className="text-xs mt-0.5 opacity-90">{alertMsg.text}</p>

</div>

</div>

</div>

)}


{/* Tab 1: Dashboard */}

{activeTab === "dashboard" && (

<div className="space-y-6 animate-fade-in">

{/* Stat Cards Row */}

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">

{/* Stat 1: Total Spent */}

<div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">

<div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Total Spent (Monthly)</div>

<div className="text-2xl font-bold text-slate-900">

Rp {totalExpenditure.toLocaleString("id-ID")}

</div>

<div className="text-emerald-500 text-xs mt-1">Active filter balance</div>

</div>


{/* Stat 2: Receipts Processed */}

<div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">

<div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Receipts Processed</div>

<div className="text-2xl font-bold text-slate-900">{expenses.length}</div>

<div className="text-slate-400 text-xs mt-1">Total registered receipts</div>

</div>


{/* Stat 3: Largest Category / DB Status */}

<div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">

<div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Database Mode</div>

<div className="text-2xl font-bold text-slate-900 truncate">

{config.supabaseConfigured ? "Supabase" : "Local fallback"}

</div>

<div className="text-blue-500 text-xs mt-1">

{config.supabaseConfigured ? "Cloud live sync" : "Storage fallback"}

</div>

</div>


{/* Stat 4: AI Model cost/usage representation */}

<div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">

<div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">AI Vision Engine</div>

<div className="text-2xl font-bold text-slate-900 truncate">

{config.geminiConfigured ? "Gemini 3.5" : config.openaiConfigured ? "GPT-4o-mini" : "No Engine"}

</div>

<div className="text-slate-400 text-xs mt-1">Auto OCR parser</div>

</div>

</div>


{/* Grid Section for Simulation and Table */}

<div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

{/* Left side widgets */}

<div className="xl:col-span-1 space-y-6">

{/* Category proportions */}

<div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">

<h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">

<TrendingUp className="w-4 h-4 text-slate-400" />

Category Breakdown

</h3>

<div className="space-y-4">

{categoriesList.map((cat) => {

const amount = categoryTotals[cat] || 0;

const percentage = Math.round((amount / overallTotal) * 100) || 0;

return (

<div key={cat} className="space-y-1">

<div className="flex justify-between text-xs font-semibold">

<span className="text-slate-600">{cat}</span>

<span className="text-slate-900 font-mono">

Rp {amount.toLocaleString("id-ID")} ({percentage}%)

</span>

</div>

<div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">

<div

className={`${categoryColors[cat] || "bg-indigo-600"} h-full rounded-full transition-all duration-500`}

style={{ width: `${percentage}%` }}

></div>

</div>

</div>

);

})}

</div>

</div>


{/* Simulator card */}

<div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">

<div>

<h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">

<Sparkles className="w-4 h-4 text-violet-500" />

Simulasi AI Vision OCR

</h3>

<p className="text-[11px] text-slate-400 mt-1">

Coba scan foto struk langsung di sini untuk menguji integrasi OCR AI (Gemini/OpenAI) tanpa Telegram.

</p>

</div>


{!simPreviewUrl ? (

<div

onClick={() => fileInputRef.current?.click()}

className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/20 rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 min-h-[160px]"

>

<div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-400 shadow-sm">

<Upload className="w-5 h-5" />

</div>

<div>

<p className="text-xs font-semibold text-slate-700">Pilih atau Seret Foto Struk</p>

<p className="text-[10px] text-slate-400 mt-0.5">JPEG, PNG, WEBP</p>

</div>

</div>

) : (

<div className="space-y-3">

<div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 max-h-[180px] flex justify-center items-center">

<img

src={simPreviewUrl}

alt="Struk Simulasi"

className="max-h-[170px] object-contain rounded-lg"

/>

<button

onClick={handleClearSim}

disabled={simulating}

className="absolute top-2 right-2 bg-slate-900/80 text-white hover:bg-slate-900 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold backdrop-blur-sm transition-all"

>

Ganti Foto

</button>

</div>


{simulating ? (

<div className="p-4 bg-indigo-50 text-indigo-800 rounded-xl border border-indigo-100 flex flex-col items-center justify-center space-y-2">

<RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />

<div className="text-center">

<p className="text-xs font-bold">Sedang Menganalisis...</p>

<p className="text-[10px] opacity-80">AI sedang mengekstrak teks OCR & nominal</p>

</div>

</div>

) : (

<button

onClick={handleTriggerSimOCR}

className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm"

>

<Sparkles className="w-3.5 h-3.5" />

Mulai Analisis AI

</button>

)}

</div>

)}


<input

type="file"

ref={fileInputRef}

onChange={handleSimFileChange}

accept="image/*"

className="hidden"

/>


{simResult && (

<div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-[11px] animate-fade-in">

<p className="font-bold text-slate-800 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">

<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />

Hasil Ekstraksi AI Vision

</p>

<div className="space-y-1">

<div className="flex justify-between"><span className="text-slate-400">Merchant/Toko:</span><span className="font-semibold text-slate-800">{simResult.description}</span></div>

<div className="flex justify-between"><span className="text-slate-400">Kategori:</span><span className="font-semibold text-slate-800">{simResult.category}</span></div>

<div className="flex justify-between"><span className="text-slate-400">Total Nominal:</span><span className="font-bold text-emerald-600">Rp {simResult.total.toLocaleString("id-ID")}</span></div>

<div className="flex justify-between"><span className="text-slate-400">Tanggal Struk:</span><span className="font-semibold text-slate-800">{simResult.date}</span></div>

</div>

</div>

)}

</div>

</div>


{/* Right side transactions table */}

<div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden min-h-[480px]">

<div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

<div>

<h2 className="font-bold text-slate-800 text-base">Recent Receipts History</h2>

<p className="text-xs text-slate-400 mt-0.5">Total {filteredExpenses.length} entries found</p>

</div>

<div className="flex items-center gap-2 w-full sm:w-auto font-sans">

<button

onClick={() => setShowManualModal(true)}

className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm whitespace-nowrap cursor-pointer"

>

<Plus className="w-4 h-4" />

Tambah Manual

</button>

<button

onClick={fetchData}

className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition-all cursor-pointer"

title="Segarkan Data"

>

<RefreshCw className="w-4 h-4" />

</button>

</div>

</div>


{/* Filters Bar */}

<div className="p-4 bg-slate-50/50 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">

<div className="relative sm:col-span-2">

<Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />

<input

type="text"

placeholder="Cari deskripsi, kategori, atau telegram ID..."

value={searchQuery}

onChange={(e) => setSearchQuery(e.target.value)}

className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-800"

/>

</div>

<div className="relative">

<Filter className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />

<select

value={categoryFilter}

onChange={(e) => setCategoryFilter(e.target.value)}

className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer font-medium text-slate-700"

>

<option value="Semua">Semua Kategori</option>

{categoriesList.map((cat) => (

<option key={cat} value={cat}>

{cat}

</option>

))}

</select>

</div>

</div>


{/* Table List */}

<div className="flex-1 overflow-auto">

{loading ? (

<div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">

<RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />

<p className="text-sm font-medium text-slate-500">Sedang menyinkronkan data...</p>

</div>

) : filteredExpenses.length === 0 ? (

<div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center p-6 max-w-sm mx-auto">

<div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-400 mb-3 shadow-inner">

<Receipt className="w-8 h-8 mx-auto" />

</div>

<p className="text-slate-800 font-bold text-sm">Tidak Ada Transaksi</p>

<p className="text-xs text-slate-400 mt-1">

Belum ada transaksi pengeluaran. Gunakan bot Telegram atau simulasi untuk mencatat.

</p>

</div>

) : (

<table className="w-full text-left border-collapse">

<thead className="bg-slate-50 sticky top-0 z-10">

<tr className="text-slate-500 text-[11px] font-bold uppercase border-b border-slate-100">

<th className="px-6 py-3.5">Date</th>

<th className="px-6 py-3.5">Description</th>

<th className="px-6 py-3.5 text-center">Category</th>

<th className="px-6 py-3.5 text-right">Amount</th>

<th className="px-6 py-3.5 text-center">Status</th>

<th className="px-6 py-3.5 text-center">Actions</th>

</tr>

</thead>

<tbody className="divide-y divide-slate-100 text-xs text-slate-700">

{filteredExpenses.map((expense) => (

<tr key={expense.id} className="hover:bg-slate-50/50 transition-colors">

<td className="px-6 py-4 text-slate-500 whitespace-nowrap">

<div className="flex items-center gap-1.5">

<Calendar className="w-3.5 h-3.5 text-slate-400" />

{expense.date}

</div>

</td>

<td className="px-6 py-4 font-medium text-slate-900 max-w-[180px] truncate">

{expense.description}

</td>

<td className="px-6 py-4 text-center whitespace-nowrap">

<span

className={`inline-block px-2 py-1 text-[10px] font-bold rounded-md uppercase border ${

categoryTextColors[expense.category] || "text-slate-500 bg-slate-50 border-slate-200"

}`}

>

{expense.category}

</span>

</td>

<td className="px-6 py-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">

Rp {expense.total.toLocaleString("id-ID")}

</td>

<td className="px-6 py-4 text-center whitespace-nowrap">

{expense.user_telegram_id.startsWith("web-") ? (

<span className="inline-flex items-center gap-1 text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-semibold">

🌐 Web

</span>

) : (

<span className="inline-flex items-center gap-1 text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 font-semibold">

🤖 TG: {expense.user_telegram_id}

</span>

)}

</td>

<td className="px-6 py-4 text-center whitespace-nowrap">

<button

onClick={() => handleDeleteExpense(expense.id)}

className="p-1.5 text-rose-500 hover:text-white hover:bg-rose-500 rounded-md transition-all inline-flex items-center justify-center cursor-pointer"

title="Hapus Data"

>

<Trash2 className="w-3.5 h-3.5" />

</button>

</td>

</tr>

))}

</tbody>

</table>

)}

</div>

</div>


</div>

</div>

)}


{/* Tab 2: Database Configuration */}

{activeTab === "database" && (

<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 animate-fade-in">

<div className="border-b border-slate-100 pb-4">

<h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">

<Database className="w-6 h-6 text-indigo-500" />

Script Migrasi Database Supabase (PostgreSQL)

</h2>

<p className="text-xs text-slate-500 mt-1">

Jalankan script SQL di bawah ini di dalam **SQL Editor** pada Dashboard Supabase Anda untuk membuat tabel dan kebijakan keamanan (RLS).

</p>

</div>


<div className="space-y-4">

<div className="flex justify-between items-center bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-indigo-900 text-xs">

<div className="flex gap-2">

<Info className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5" />

<div>

<p className="font-bold">Informasi Database:</p>

<p className="mt-1 leading-relaxed">

Tabel ini menyimpan data transaksi, user ID telegram unik dari bot Telegram Anda, kategori, total nominal, dan tanggal belanja. RLS diaktifkan agar aman saat production.

</p>

</div>

</div>

</div>


<div className="relative">

<pre className="bg-slate-950 text-slate-100 rounded-2xl p-6 overflow-x-auto font-mono text-xs leading-relaxed shadow-lg max-h-[400px]">

<code>{sqlScript}</code>

</pre>

<button

onClick={() => {

navigator.clipboard.writeText(sqlScript);

showAlert("success", "Script SQL berhasil disalin ke clipboard!");

}}

className="absolute top-4 right-4 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"

>

Salin SQL

</button>

</div>

</div>


<div className="border-t border-slate-100 pt-6 space-y-3 text-xs">

<p className="font-bold text-slate-800">Langkah Pengaturan Supabase:</p>

<ol className="list-decimal list-inside space-y-2 text-slate-600 leading-relaxed pl-2">

<li>Buka akun <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-semibold">Supabase</a> dan buat proyek baru.</li>

<li>Pilih menu <b>SQL Editor</b> di panel samping kiri dashboard Supabase Anda.</li>

<li>Klik <b>New query</b>, paste script SQL di atas, lalu klik tombol <b>Run</b> di kanan bawah.</li>

<li>Masuk ke menu <b>Project Settings (ikon gir) &gt; API</b>, salin <code>Project URL</code> dan <code>service_role</code> (atau <code>anon public</code>) API Key.</li>

<li>Di AI Studio Build ini, buka menu <b>Settings (ikon gir) &gt; Secrets</b> di sisi kanan atas, lalu tambahkan variabel lingkungan <code>SUPABASE_URL</code> dan <code>SUPABASE_SERVICE_ROLE_KEY</code> Anda.</li>

</ol>

</div>

</div>

)}


{/* Tab 3: Telegram Webhook Configuration */}

{activeTab === "telegram" && (

<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-8 animate-fade-in">

<div className="border-b border-slate-100 pb-4">

<h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">

<Bot className="w-6 h-6 text-indigo-500" />

Registrasi Webhook Telegram Bot

</h2>

<p className="text-xs text-slate-500 mt-1">

Telegram membutuhkan registrasi Webhook agar serverless API kita dapat menerima kiriman foto dari bot Telegram.

</p>

</div>


{/* Panel Registrasi Cepat */}

<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

<div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">

<h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">

<Sparkles className="w-4 h-4 text-indigo-500" />

Registrasi Instan via Web

</h3>

<p className="text-xs text-slate-600 leading-relaxed">

Kami telah menyediakan tombol otomatis di bawah untuk mendaftarkan URL webhook bot Anda secara langsung. Klik tombol di bawah untuk menautkan server aplikasi Anda ke Telegram.

</p>


<div className="bg-white border border-slate-200 rounded-xl p-4 text-xs space-y-2">

<div className="flex justify-between">

<span className="text-slate-500">URL Server Anda:</span>

<span className="font-semibold text-slate-800">{window.location.origin}</span>

</div>

<div className="flex justify-between">

<span className="text-slate-500">Diregistrasikan Ke Webhook:</span>

<span className="font-semibold text-indigo-600 font-mono">{window.location.origin}/api/bot</span>

</div>

</div>


<div className="flex items-center gap-4">

<button

onClick={handleSetWebhook}

className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all flex items-center gap-2 cursor-pointer"

>

<RefreshCw className="w-4 h-4" />

Hubungkan Webhook Sekarang

</button>

</div>

</div>


{/* Panduan Manual CURL */}

<div className="bg-slate-900 text-slate-100 rounded-2xl p-6 space-y-4 shadow-lg text-xs flex flex-col justify-between h-full">

<div>

<h3 className="font-bold text-white text-sm flex items-center gap-2">

<Terminal className="w-4 h-4 text-indigo-400" />

Registrasi Webhook Manual (CURL)

</h3>

<p className="text-slate-400 leading-relaxed mt-2 text-[11px]">

Jika pendaftaran otomatis gagal atau Anda ingin mendaftarkannya secara manual lewat komputer Anda sendiri, jalankan perintah CURL berikut di terminal:

</p>


<pre className="bg-slate-950 text-indigo-300 rounded-xl p-3.5 mt-3 overflow-x-auto font-mono text-[10px] leading-relaxed select-all border border-slate-800">

{`curl -X POST "https://api.telegram.org/bot<TOKEN_BOT_ANDA>/setWebhook?url=${window.location.origin}/api/bot"`}

</pre>

</div>


<p className="text-slate-500 text-[10px] mt-4">

*Ganti <code>&lt;TOKEN_BOT_ANDA&gt;</code> dengan token bot riil yang Anda dapatkan dari @BotFather.

</p>

</div>

</div>


{/* Panduan Pembuatan Bot */}

<div className="border-t border-slate-100 pt-8 space-y-4">

<h3 className="font-bold text-slate-900 text-sm">

Cara Membuat Bot Telegram & Mendapatkan Token (100% Gratis):

</h3>


<div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">

<div className="bg-slate-50 rounded-xl p-4 border border-slate-100 relative">

<div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 font-bold text-xs flex items-center justify-center">

1

</div>

<p className="font-bold text-slate-800">Cari @BotFather</p>

<p className="text-slate-500 mt-2 leading-relaxed">

Buka Telegram dan cari akun resmi <b>@BotFather</b> (memiliki lencana centang biru terverifikasi).

</p>

</div>


<div className="bg-slate-50 rounded-xl p-4 border border-slate-100 relative">

<div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 font-bold text-xs flex items-center justify-center">

2

</div>

<p className="font-bold text-slate-800">Ketik /newbot</p>

<p className="text-slate-500 mt-2 leading-relaxed">

Kirim perintah <code>/newbot</code>. Masukkan nama bot Anda dan username unik bot yang diakhiri dengan kata "bot" (contoh: <code>my_belanja_bot</code>).

</p>

</div>


<div className="bg-slate-50 rounded-xl p-4 border border-slate-100 relative">

<div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 font-bold text-xs flex items-center justify-center">

3

</div>

<p className="font-bold text-slate-800">Salin API Token</p>

<p className="text-slate-500 mt-2 leading-relaxed">

@BotFather akan mengirimkan HTTP API Token berupa string panjang. Salin token tersebut dan masukkan ke dalam Secrets aplikasi ini.

</p>

</div>

</div>

</div>

</div>

)}

</div>

</main>


{/* MODAL TAMBAH MANUAL */}

{showManualModal && (

<div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">

<div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-fade-in duration-200">

<div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">

<h3 className="font-bold text-slate-900 text-base flex items-center gap-2">

<Plus className="w-5 h-5 text-indigo-600" />

Tambah Pengeluaran Baru

</h3>

<button

onClick={() => setShowManualModal(false)}

className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"

>

Tutup

</button>

</div>


<form onSubmit={handleManualSubmit} className="p-6 space-y-4 text-xs">

<div className="space-y-1.5">

<label className="font-semibold text-slate-700 block">Deskripsi Transaksi / Nama Toko</label>

<input

type="text"

required

placeholder="Contoh: Makan Siang Nasi Padang Sederhana"

value={manualDesc}

onChange={(e) => setManualDesc(e.target.value)}

className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"

/>

</div>


<div className="grid grid-cols-2 gap-4">

<div className="space-y-1.5">

<label className="font-semibold text-slate-700 block">Kategori</label>

<select

value={manualCategory}

onChange={(e) => setManualCategory(e.target.value)}

className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 cursor-pointer"

>

{categoriesList.map((c) => (

<option key={c} value={c}>

{c}

</option>

))}

</select>

</div>


<div className="space-y-1.5">

<label className="font-semibold text-slate-700 block">Tanggal Nota</label>

<input

type="date"

required

value={manualDate}

onChange={(e) => setManualDate(e.target.value)}

className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 cursor-pointer"

/>

</div>

</div>


<div className="space-y-1.5">

<label className="font-semibold text-slate-700 block">Total Nominal (Rp)</label>

<input

type="number"

required

min="0"

placeholder="Contoh: 35000"

value={manualTotal}

onChange={(e) => setManualTotal(e.target.value)}

className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-sm text-slate-800"

/>

</div>


<div className="space-y-1.5">

<label className="font-semibold text-slate-700 block">Telegram User ID (Opsional)</label>

<input

type="text"

placeholder="Default: web-manual"

value={manualTelegramId}

onChange={(e) => setManualTelegramId(e.target.value)}

className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"

/>

<p className="text-[10px] text-slate-400">

Digunakan untuk mengelompokkan data berdasarkan Telegram ID Anda jika diuji secara simultan.

</p>

</div>


<div className="pt-4 border-t border-slate-100 flex gap-3 justify-end font-sans">

<button

type="button"

onClick={() => setShowManualModal(false)}

className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer"

>

Batal

</button>

<button

type="submit"

disabled={submittingManual}

className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1 shadow-md shadow-indigo-100 cursor-pointer"

>

{submittingManual ? "Menyimpan..." : "Simpan Transaksi"}

</button>

</div>

</form>

</div>

</div>

)}

</div>

);

}


