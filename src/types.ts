export interface Expense {
  id: string;
  user_telegram_id: string;
  description: string;
  category: string;
  total: number;
  date: string;
  created_at: string;
}

export interface ExpenseInput {
  user_telegram_id: string;
  description: string;
  category: string;
  total: number;
  date: string;
}

export interface ParseReceiptResult {
  total: number;
  date: string;
  description: string;
  category: string;
}

export interface SystemConfigStatus {
  supabaseConfigured: boolean;
  telegramConfigured: boolean;
  geminiConfigured: boolean;
  openaiConfigured: boolean;
  botUsername: string | null;
  webhookUrl: string | null;
}
