// ============================================================
// DATABASE TYPES (mirrors Supabase schema)
// ============================================================

export type DealStatus =
  | "looking"
  | "under_contract"
  | "in_rehab"
  | "listed"
  | "sold"
  | "closed";

export type ExpenseCategory =
  | "materials"
  | "labor"
  | "permits"
  | "utilities"
  | "insurance"
  | "taxes"
  | "loan_payments"
  | "closing_costs"
  | "other";

export interface Deal {
  id: string;
  created_at: string;
  updated_at: string;
  address: string;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  year_built: number | null;
  purchase_price: number;
  purchase_date: string | null;
  rehab_budget: number;
  estimated_arv: number;
  status: DealStatus;
  monthly_holding_cost: number;
  financing_notes: string;
  sale_price: number | null;
  sale_date: string | null;
  actual_closing_costs: number | null;
  notes: string;
}

export interface Expense {
  id: string;
  created_at: string;
  deal_id: string;
  amount: number;
  category: ExpenseCategory;
  vendor: string | null;
  note: string | null;
  expense_date: string;
  entered_by: string;
}

export interface ExpenseWithDeal extends Expense {
  deals?: { address: string };
}

export interface DealNote {
  id: string;
  created_at: string;
  deal_id: string;
  content: string;
  author: string;
}

// ============================================================
// CALCULATED FINANCIALS
// ============================================================

export interface DealFinancials {
  rehabSpent: number;
  holdingSpent: number;
  totalSpent: number;
  months: number;
  sellingCosts: number;
  budgetUsed: number;
  budgetRemaining: number;
  estimatedProfit: number;
  actualProfit?: number;
  roi: number;
}

// ============================================================
// SUPABASE DATABASE TYPE (for typed client)
// ============================================================

export interface Database {
  public: {
    Tables: {
      deals: {
        Row: Deal;
        Insert: Omit<Deal, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Deal, "id" | "created_at">>;
      };
      expenses: {
        Row: Expense;
        Insert: Omit<Expense, "id" | "created_at">;
        Update: Partial<Omit<Expense, "id" | "created_at">>;
      };
      deal_notes: {
        Row: DealNote;
        Insert: Omit<DealNote, "id" | "created_at">;
        Update: Partial<Omit<DealNote, "id" | "created_at">>;
      };
    };
  };
}

// ============================================================
// CONSTANTS
// ============================================================

export const STATUS_CONFIG: Record<
  DealStatus,
  { label: string; color: string; order: number }
> = {
  looking: { label: "Looking", color: "bg-slate-500", order: 0 },
  under_contract: { label: "Under Contract", color: "bg-blue-500", order: 1 },
  in_rehab: { label: "In Rehab", color: "bg-amber-500", order: 2 },
  listed: { label: "Listed", color: "bg-purple-500", order: 3 },
  sold: { label: "Sold", color: "bg-emerald-500", order: 4 },
  closed: { label: "Closed", color: "bg-gray-600", order: 5 },
};

export const EXPENSE_CATEGORIES: {
  value: ExpenseCategory;
  label: string;
  icon: string;
}[] = [
  { value: "materials", label: "Materials", icon: "🪵" },
  { value: "labor", label: "Labor", icon: "🔨" },
  { value: "permits", label: "Permits", icon: "📋" },
  { value: "utilities", label: "Utilities", icon: "💡" },
  { value: "insurance", label: "Insurance", icon: "🛡" },
  { value: "taxes", label: "Taxes", icon: "🏛" },
  { value: "loan_payments", label: "Loan Payments", icon: "🏦" },
  { value: "closing_costs", label: "Closing Costs", icon: "📝" },
  { value: "other", label: "Other", icon: "📦" },
];

export const HOLDING_CATEGORIES: ExpenseCategory[] = [
  "loan_payments",
  "insurance",
  "taxes",
  "utilities",
];
