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
// DEAL PHOTOS (Phase 2.2)
// ============================================================

export type PhotoType = "before" | "after";

export interface DealPhoto {
  id: string;
  created_at: string;
  deal_id: string;
  storage_path: string;
  public_url: string;
  photo_type: PhotoType;
  caption: string;
  uploaded_by: string;
  original_name: string;
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
  { value: "materials", label: "Materials", icon: "\u{1fab5}" },
  { value: "labor", label: "Labor", icon: "\u{1f528}" },
  { value: "permits", label: "Permits", icon: "\u{1f4cb}" },
  { value: "utilities", label: "Utilities", icon: "\u{1f4a1}" },
  { value: "insurance", label: "Insurance", icon: "\u{1f6e1}" },
  { value: "taxes", label: "Taxes", icon: "\u{1f4c4}" },
  { value: "loan_payments", label: "Loan Payments", icon: "\u{1f3e6}" },
  { value: "closing_costs", label: "Closing Costs", icon: "\u{1f4dd}" },
  { value: "other", label: "Other", icon: "\u{1f4e6}" },
];

export const HOLDING_CATEGORIES: ExpenseCategory[] = [
  "loan_payments",
  "insurance",
  "taxes",
  "utilities",
];

// ============================================================
// MLS COMP DATA (Phase 2.5)
// ============================================================

export interface MLSComp {
  address: string;
  sale_price: number | null;
  list_price: number | null;
  sqft: number | null;
  price_per_sf: number | null;
  beds: number | null;
  baths: number | null;
  year_built: number | null;
  sale_date: string | null;
  list_date: string | null;
  dom: number | null;
  lot_size: string | null;
  condition: string | null;
  status: string | null;
  garage: string | null;
  basement: string | null;
  style: string | null;
  distance: string | null;
  mls_number: string | null;
  notes: string | null;
}

// ============================================================
// PIPELINE TYPES (Phase 2)
// ============================================================

export type PipelineStatus =
  | "new"
  | "analyzing"
  | "offer_made"
  | "won"
  | "passed"
  | "dead";

export interface PipelineDeal {
  id: string;
  created_at: string;
  updated_at: string;
  address: string;
  asking_price: number;
  source: string;
  source_contact: string;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  year_built: number | null;
  lot_size: string | null;
  estimated_arv: number | null;
  estimated_rehab: number | null;
  estimated_profit: number | null;
  status: PipelineStatus;
  status_changed_at: string;
  offer_amount: number | null;
  offer_date: string | null;
  decision_reason: string;
  promoted_deal_id: string | null;
  listing_url: string;
  cma_comps: MLSComp[];
  cma_pdf_name: string;
  cma_uploaded_at: string | null;
  notes: string;
  added_by: string;
}

export interface AIAnalysis {
  id: string;
  created_at: string;
  pipeline_deal_id: string;
  input_data: Record<string, any>;
  analysis_result: Record<string, any>;
  verdict: string;
  base_case_profit: number | null;
  base_case_roi: number | null;
  max_purchase_price: number | null;
  arv_validated: number | null;
  rehab_moderate: number | null;
  risk_level: string;
  status: string;
  error_message: string | null;
  triggered_by: string;
}

export const PIPELINE_STATUS_CONFIG: Record<
  PipelineStatus,
  { label: string; color: string; order: number }
> = {
  new: { label: "New", color: "bg-blue-500", order: 0 },
  analyzing: { label: "Analyzing", color: "bg-amber-500", order: 1 },
  offer_made: { label: "Offer Made", color: "bg-purple-500", order: 2 },
  won: { label: "Won", color: "bg-emerald-500", order: 3 },
  passed: { label: "Passed", color: "bg-zinc-500", order: 4 },
  dead: { label: "Dead", color: "bg-red-500", order: 5 },
};
