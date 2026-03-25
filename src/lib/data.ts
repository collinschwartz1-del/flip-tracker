import { createClient } from "./supabase";
import type { Deal, Expense, DealNote, PipelineDeal, AIAnalysis } from "./types";

const supabase = createClient();

// ============================================================
// AUTH
// ============================================================

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export function onAuthStateChange(
  callback: (event: string, session: any) => void
) {
  return supabase.auth.onAuthStateChange(callback);
}

// ============================================================
// DEALS
// ============================================================

export async function getDeals(): Promise<Deal[]> {
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getDeal(id: string): Promise<Deal | null> {
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createDeal(
  deal: Omit<Deal, "id" | "created_at" | "updated_at">
): Promise<Deal> {
  const { data, error } = await supabase
    .from("deals")
    .insert(deal)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDeal(
  id: string,
  updates: Partial<Deal>
): Promise<Deal> {
  const { data, error } = await supabase
    .from("deals")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDeal(id: string): Promise<void> {
  // Cascade delete handled by DB, but let's be explicit
  await supabase.from("expenses").delete().eq("deal_id", id);
  await supabase.from("deal_notes").delete().eq("deal_id", id);
  const { error } = await supabase.from("deals").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================
// EXPENSES
// ============================================================

export async function getExpenses(dealId?: string): Promise<Expense[]> {
  let query = supabase
    .from("expenses")
    .select("*, deals(address)")
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (dealId) {
    query = query.eq("deal_id", dealId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getRecentExpenses(
  dealId: string,
  limit = 10
): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("deal_id", dealId)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function createExpense(
  expense: Omit<Expense, "id" | "created_at">
): Promise<Expense> {
  const { data, error } = await supabase
    .from("expenses")
    .insert(expense)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================
// NOTES
// ============================================================

export async function getNotes(dealId: string): Promise<DealNote[]> {
  const { data, error } = await supabase
    .from("deal_notes")
    .select("*")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createNote(
  note: Omit<DealNote, "id" | "created_at">
): Promise<DealNote> {
  const { data, error } = await supabase
    .from("deal_notes")
    .insert(note)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================
// PIPELINE DEALS
// ============================================================

export async function getPipelineDeals(): Promise<PipelineDeal[]> {
  const { data, error } = await supabase
    .from("pipeline_deals")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createPipelineDeal(
  deal: Omit<PipelineDeal, "id" | "created_at" | "updated_at" | "status_changed_at">
): Promise<PipelineDeal> {
  const { data, error } = await supabase
    .from("pipeline_deals")
    .insert(deal)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePipelineDeal(
  id: string,
  updates: Partial<PipelineDeal>
): Promise<PipelineDeal> {
  const { data, error } = await supabase
    .from("pipeline_deals")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePipelineDeal(id: string): Promise<void> {
  await supabase.from("ai_analyses").delete().eq("pipeline_deal_id", id);
  await supabase.from("pipeline_notes").delete().eq("pipeline_deal_id", id);
  const { error } = await supabase.from("pipeline_deals").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================
// AI ANALYSES
// ============================================================

export async function getLatestAnalysis(
  pipelineDealId: string
): Promise<AIAnalysis | null> {
  const { data, error } = await supabase
    .from("ai_analyses")
    .select("*")
    .eq("pipeline_deal_id", pipelineDealId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

export async function createAnalysis(
  analysis: Omit<AIAnalysis, "id" | "created_at">
): Promise<AIAnalysis> {
  const { data, error } = await supabase
    .from("ai_analyses")
    .insert(analysis)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================
// PIPELINE NOTES
// ============================================================

export async function getPipelineNotes(pipelineDealId: string) {
  const { data, error } = await supabase
    .from("pipeline_notes")
    .select("*")
    .eq("pipeline_deal_id", pipelineDealId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createPipelineNote(note: {
  pipeline_deal_id: string;
  content: string;
  author: string;
}) {
  const { data, error } = await supabase
    .from("pipeline_notes")
    .insert(note)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================
// PROMOTE PIPELINE DEAL TO ACTIVE DEAL
// ============================================================

export async function promotePipelineDeal(
  pipelineDealId: string
): Promise<Deal> {
  const pd = await supabase
    .from("pipeline_deals")
    .select("*")
    .eq("id", pipelineDealId)
    .single();
  if (pd.error) throw pd.error;
  const deal = pd.data;

  const newDeal = await createDeal({
    address: deal.address,
    beds: deal.beds,
    baths: deal.baths,
    sqft: deal.sqft,
    year_built: deal.year_built,
    purchase_price: deal.offer_amount || deal.asking_price,
    purchase_date: new Date().toISOString().split("T")[0],
    rehab_budget: deal.estimated_rehab || 0,
    estimated_arv: deal.estimated_arv || 0,
    status: "under_contract",
    monthly_holding_cost: 1500,
    financing_notes: "",
    notes: `Promoted from pipeline. Source: ${deal.source}`,
    sale_price: null,
    sale_date: null,
    actual_closing_costs: null,
  });

  await updatePipelineDeal(pipelineDealId, {
    status: "won",
    promoted_deal_id: newDeal.id,
    decision_reason: "Won — promoted to active deals",
  });

  return newDeal;
}
