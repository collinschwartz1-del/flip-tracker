import { createClient } from "./supabase";
import type { Deal, Expense, DealNote } from "./types";

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
