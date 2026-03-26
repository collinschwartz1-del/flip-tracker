import { Deal, Expense, DealFinancials, HOLDING_CATEGORIES } from "./types";

// ============================================================
// FORMATTING
// ============================================================

export function fmt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtFull(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export function pct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "0%";
  return `${(n * 100).toFixed(1)}%`;
}

export function shortAddr(addr: string): string {
  if (!addr) return "";
  return addr.split(",")[0]?.trim() || addr;
}

export function today(): string {
  return new Date().toISOString().split("T")[0];
}

// ============================================================
// FINANCIAL CALCULATIONS
// ============================================================

function monthsBetween(start: string | null, end: string | null): number {
  if (!start) return 0;
  const s = new Date(start);
  const e = end ? new Date(end) : new Date();
  const months =
    (e.getFullYear() - s.getFullYear()) * 12 +
    (e.getMonth() - s.getMonth());
  const dayFraction = (e.getDate() - s.getDate()) / 30;
  return Math.max(0, months + dayFraction);
}

export function calcDealFinancials(
  deal: Deal,
  expenses: Expense[]
): DealFinancials {
  const rehabSpent = expenses
    .filter((e) => !HOLDING_CATEGORIES.includes(e.category))
    .reduce((s, e) => s + Number(e.amount), 0);

  const holdingSpent = expenses
    .filter((e) => HOLDING_CATEGORIES.includes(e.category))
    .reduce((s, e) => s + Number(e.amount), 0);

  const totalSpent = rehabSpent + holdingSpent;
  const months = monthsBetween(deal.purchase_date, deal.sale_date);
  const sellingCosts = (deal.estimated_arv || 0) * 0.08;
  const budgetUsed =
    deal.rehab_budget > 0 ? rehabSpent / deal.rehab_budget : 0;

  const isSold = deal.status === "sold" || deal.status === "closed";
  let estimatedProfit: number;
  let actualProfit: number | undefined;
  let roi: number;

  // For active deals: use the GREATER of rehab budget or actual spent
  // This prevents inflated profit projections when spending is under budget
  // For sold deals: use actual spent (deal is done)
  const projectedRehabTotal = isSold
    ? rehabSpent
    : Math.max(deal.rehab_budget || 0, rehabSpent);

  if (isSold && deal.sale_price) {
    const allExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    actualProfit =
      deal.sale_price -
      (deal.purchase_price || 0) -
      allExpenses -
      (deal.actual_closing_costs || 0);
    estimatedProfit = actualProfit;
    roi =
      deal.purchase_price + allExpenses > 0
        ? actualProfit / (deal.purchase_price + allExpenses)
        : 0;
  } else {
    // Use projectedRehabTotal (full budget) instead of just rehabSpent
    const projectedTotalSpent = projectedRehabTotal + holdingSpent;
    estimatedProfit =
      (deal.estimated_arv || 0) -
      (deal.purchase_price || 0) -
      projectedTotalSpent -
      sellingCosts;
    roi =
      (deal.purchase_price || 0) + projectedTotalSpent > 0
        ? estimatedProfit / ((deal.purchase_price || 0) + projectedTotalSpent)
        : 0;
  }

  return {
    rehabSpent,
    holdingSpent,
    totalSpent,
    months,
    sellingCosts,
    budgetUsed,
    budgetRemaining: (deal.rehab_budget || 0) - rehabSpent,
    projectedRehabTotal,
    estimatedProfit,
    actualProfit,
    roi,
  };
}

// ============================================================
// BUDGET COLORS
// ============================================================

export function budgetColor(ratio: number): string {
  if (ratio >= 1) return "text-red-400";
  if (ratio >= 0.8) return "text-amber-400";
  return "text-emerald-400";
}

export function budgetBg(ratio: number): string {
  if (ratio >= 1) return "border-red-500/40 bg-red-500/5";
  if (ratio >= 0.8) return "border-amber-500/40 bg-amber-500/5";
  return "border-emerald-500/20 bg-emerald-500/5";
}

export function budgetBarColor(ratio: number): string {
  if (ratio >= 1) return "bg-red-500";
  if (ratio >= 0.8) return "bg-amber-500";
  return "bg-emerald-500";
}

// ============================================================
// CSV EXPORT
// ============================================================

export function exportExpensesCSV(
  expenses: Array<{
    expense_date: string;
    dealAddress: string;
    category: string;
    amount: number;
    vendor: string | null;
    note: string | null;
    entered_by: string;
  }>
) {
  const rows = [
    ["Date", "Deal", "Category", "Amount", "Vendor", "Note", "Entered By"],
  ];
  expenses.forEach((e) => {
    rows.push([
      e.expense_date,
      e.dealAddress,
      e.category,
      String(e.amount),
      e.vendor || "",
      e.note || "",
      e.entered_by || "",
    ]);
  });
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `acreage_expenses_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
