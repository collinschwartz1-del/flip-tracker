"use client";

import { useState, useMemo } from "react";
import { StatusBadge, Spinner } from "@/components/ui";
import { fmt, shortAddr, budgetColor, budgetBg, budgetBarColor, calcDealFinancials } from "@/lib/utils";
import { STATUS_CONFIG, type Deal, type Expense } from "@/lib/types";
import type { AppActions } from "@/components/AppShell";

export function Dashboard({
  deals,
  expenses,
  loading,
  actions,
}: {
  deals: Deal[];
  expenses: Expense[];
  loading: boolean;
  actions: AppActions;
}) {
  const [sortBy, setSortBy] = useState<"status" | "profit" | "recent">("status");

  const dealCards = useMemo(() => {
    const enriched = deals.map((deal) => {
      const dealExpenses = expenses.filter((e) => e.deal_id === deal.id);
      const fin = calcDealFinancials(deal, dealExpenses);
      return { ...deal, ...fin };
    });

    if (sortBy === "status")
      enriched.sort(
        (a, b) =>
          (STATUS_CONFIG[a.status]?.order || 0) -
          (STATUS_CONFIG[b.status]?.order || 0)
      );
    else if (sortBy === "profit")
      enriched.sort((a, b) => b.estimatedProfit - a.estimatedProfit);
    else
      enriched.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

    return enriched;
  }, [deals, expenses, sortBy]);

  const totalPortfolioValue = dealCards.reduce(
    (s, d) => s + (d.estimated_arv || 0),
    0
  );
  const totalInvested = dealCards.reduce(
    (s, d) => s + (d.purchase_price || 0) + d.totalSpent,
    0
  );
  const activeDeals = dealCards.filter(
    (d) => !["sold", "closed"].includes(d.status)
  ).length;

  if (loading) return <Spinner />;

  return (
    <div className="pb-24">
      <div className="px-4 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {activeDeals} active flip{activeDeals !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Summary strip */}
      <div className="px-4 mb-4">
        <div className="flex gap-2">
          <div className="flex-1 bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">
              Portfolio ARV
            </p>
            <p className="text-base font-bold text-zinc-100">
              {fmt(totalPortfolioValue)}
            </p>
          </div>
          <div className="flex-1 bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">
              Total Invested
            </p>
            <p className="text-base font-bold text-zinc-100">
              {fmt(totalInvested)}
            </p>
          </div>
        </div>
      </div>

      {/* Sort pills */}
      <div className="px-4 mb-3 flex gap-2">
        {(
          [
            ["status", "Status"],
            ["profit", "Profit"],
            ["recent", "Recent"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              sortBy === key
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-zinc-900 text-zinc-500 border border-zinc-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Deal cards */}
      <div className="px-4 space-y-3">
        {dealCards.length === 0 && (
          <div className="text-center py-12">
            <p className="text-zinc-500 text-sm">No deals yet</p>
            <button
              onClick={() => actions.navigate("add-deal")}
              className="mt-3 text-amber-400 text-sm font-medium"
            >
              + Add your first deal
            </button>
          </div>
        )}
        {dealCards.map((deal) => (
          <button
            key={deal.id}
            onClick={() =>
              actions.navigate("deal-detail", { dealId: deal.id })
            }
            className={`w-full text-left p-4 rounded-2xl border transition-colors active:scale-[0.98] ${budgetBg(
              deal.budgetUsed
            )}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm font-semibold text-zinc-100 truncate">
                  {shortAddr(deal.address)}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {deal.beds}bd / {deal.baths}ba /{" "}
                  {deal.sqft?.toLocaleString()}sf
                </p>
              </div>
              <StatusBadge status={deal.status} small />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                  Rehab Budget
                </p>
                <p
                  className={`text-sm font-bold ${budgetColor(
                    deal.budgetUsed
                  )}`}
                >
                  {fmt(deal.rehabSpent)}{" "}
                  <span className="text-zinc-600 font-normal">
                    / {fmt(deal.rehab_budget)}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                  Total In
                </p>
                <p className="text-sm font-bold text-zinc-300">
                  {fmt((deal.purchase_price || 0) + deal.totalSpent)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                  Est. Profit
                </p>
                <p
                  className={`text-sm font-bold ${
                    deal.estimatedProfit >= 0
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {fmt(deal.estimatedProfit)}
                </p>
              </div>
            </div>
            <div className="mt-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${budgetBarColor(
                  deal.budgetUsed
                )}`}
                style={{
                  width: `${Math.min(100, deal.budgetUsed * 100)}%`,
                }}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
