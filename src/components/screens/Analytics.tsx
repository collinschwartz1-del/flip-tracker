"use client";

import { useState, useMemo } from "react";
import type { Deal, Expense } from "@/lib/types";
import type { AppActions } from "@/components/AppShell";
import {
  fmt,
  pct,
  shortAddr,
  calcDealFinancials,
  budgetColor,
  budgetBarColor,
} from "@/lib/utils";
import { EXPENSE_CATEGORIES, HOLDING_CATEGORIES } from "@/lib/types";

export function Analytics({
  deals,
  expenses,
  actions,
}: {
  deals: Deal[];
  expenses: Expense[];
  actions: AppActions;
}) {
  const [spendFilter, setSpendFilter] = useState<string>("all");

  // ---- COMPUTED METRICS ----

  const completedDeals = useMemo(
    () => deals.filter((d) => d.status === "sold" || d.status === "closed"),
    [deals]
  );

  const activeDeals = useMemo(
    () =>
      deals.filter((d) => !["sold", "closed"].includes(d.status)),
    [deals]
  );

  // Per-deal financials
  const dealMetrics = useMemo(() => {
    return deals.map((deal) => {
      const dealExpenses = expenses.filter((e) => e.deal_id === deal.id);
      const fin = calcDealFinancials(deal, dealExpenses);
      const totalInvested =
        (deal.purchase_price || 0) + fin.totalSpent;
      const holdMonths = deal.purchase_date
        ? (() => {
            const start = new Date(deal.purchase_date);
            const end = deal.sale_date
              ? new Date(deal.sale_date)
              : new Date();
            return Math.max(
              0,
              (end.getFullYear() - start.getFullYear()) * 12 +
                (end.getMonth() - start.getMonth()) +
                (end.getDate() - start.getDate()) / 30
            );
          })()
        : 0;
      const dollarsPerHour =
        fin.estimatedProfit && holdMonths > 0
          ? fin.estimatedProfit / 200 // ~200 active hours per managed flip
          : 0;

      return {
        ...deal,
        ...fin,
        totalInvested,
        holdMonths,
        dollarsPerHour,
      };
    });
  }, [deals, expenses]);

  const completedMetrics = dealMetrics.filter(
    (d) => d.status === "sold" || d.status === "closed"
  );
  const activeMetrics = dealMetrics.filter(
    (d) => !["sold", "closed"].includes(d.status)
  );

  // Portfolio summary
  const totalProfit = completedMetrics.reduce(
    (s, d) => s + d.estimatedProfit,
    0
  );
  const activeCapital = activeMetrics.reduce(
    (s, d) => s + d.totalInvested,
    0
  );
  const avgRoi =
    completedMetrics.length > 0
      ? completedMetrics.reduce((s, d) => s + d.roi, 0) /
        completedMetrics.length
      : 0;
  const avgHoldMonths =
    completedMetrics.length > 0
      ? completedMetrics.reduce((s, d) => s + d.holdMonths, 0) /
        completedMetrics.length
      : 0;

  // Spend by category
  const spendByCategory = useMemo(() => {
    const filtered =
      spendFilter === "all"
        ? expenses
        : expenses.filter((e) => e.deal_id === spendFilter);
    const cats: Record<string, number> = {};
    filtered.forEach((e) => {
      cats[e.category] = (cats[e.category] || 0) + Number(e.amount);
    });
    const total = Object.values(cats).reduce((s, v) => s + v, 0);
    return EXPENSE_CATEGORIES.map((c) => ({
      ...c,
      amount: cats[c.value] || 0,
      pct: total > 0 ? (cats[c.value] || 0) / total : 0,
    }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, spendFilter]);

  const totalSpendFiltered = spendByCategory.reduce(
    (s, c) => s + c.amount,
    0
  );

  // Monthly spend trend (last 12 months)
  const monthlySpend = useMemo(() => {
    const now = new Date();
    const months: { label: string; amount: number; cumulative: number }[] =
      [];
    let cumulative = 0;

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toISOString().slice(0, 7); // "2026-03"
      const label = d.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
      const monthTotal = expenses
        .filter((e) => e.expense_date?.startsWith(monthStr))
        .reduce((s, e) => s + Number(e.amount), 0);
      cumulative += monthTotal;
      months.push({ label, amount: monthTotal, cumulative });
    }
    return months;
  }, [expenses]);

  const maxMonthlySpend = Math.max(
    ...monthlySpend.map((m) => m.amount),
    1
  );

  // Sorted completed deals for performance table
  const sortedCompleted = [...completedMetrics].sort(
    (a, b) => b.estimatedProfit - a.estimatedProfit
  );

  // ---- RENDER ----

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
          Analytics
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          {completedDeals.length} completed ·{" "}
          {activeDeals.length} active
        </p>
      </div>

      {/* Section 1: Portfolio Summary */}
      <div className="px-4 mb-5">
        <div className="grid grid-cols-2 gap-2">
          <SummaryCard
            label="Total Profit"
            value={fmt(totalProfit)}
            valueColor={
              totalProfit >= 0 ? "text-emerald-400" : "text-red-400"
            }
            sub={`${completedDeals.length} completed deal${completedDeals.length !== 1 ? "s" : ""}`}
          />
          <SummaryCard
            label="Active Capital"
            value={fmt(activeCapital)}
            valueColor="text-zinc-100"
            sub={`${activeDeals.length} deal${activeDeals.length !== 1 ? "s" : ""} in progress`}
          />
          <SummaryCard
            label="Avg ROI"
            value={pct(avgRoi)}
            valueColor={
              avgRoi >= 0.15
                ? "text-emerald-400"
                : avgRoi >= 0.05
                ? "text-amber-400"
                : "text-red-400"
            }
            sub="on completed deals"
          />
          <SummaryCard
            label="Avg Hold Time"
            value={`${avgHoldMonths.toFixed(1)} mo`}
            valueColor="text-zinc-100"
            sub="purchase to sale"
          />
        </div>
      </div>

      {/* Section 2: Profit by Deal */}
      {sortedCompleted.length > 0 && (
        <div className="px-4 mb-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">
            Profit by Deal
          </h3>
          <div className="space-y-2">
            {sortedCompleted.map((deal) => {
              const maxProfit = Math.max(
                ...sortedCompleted.map((d) =>
                  Math.abs(d.estimatedProfit)
                ),
                1
              );
              const width =
                (Math.abs(deal.estimatedProfit) / maxProfit) * 100;
              const isPositive = deal.estimatedProfit >= 0;
              return (
                <button
                  key={deal.id}
                  onClick={() =>
                    actions.navigate("deal-detail", {
                      dealId: deal.id,
                    })
                  }
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-400 truncate max-w-[60%]">
                      {shortAddr(deal.address)}
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        isPositive
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {fmt(deal.estimatedProfit)}
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isPositive ? "bg-emerald-500" : "bg-red-500"
                      }`}
                      style={{ width: `${Math.max(3, width)}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 3: Spend Breakdown */}
      <div className="px-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-300">
            Spend Breakdown
          </h3>
          <select
            value={spendFilter}
            onChange={(e) => setSpendFilter(e.target.value)}
            className="py-1 px-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] text-zinc-400 focus:outline-none"
          >
            <option value="all">All Deals</option>
            {deals.map((d) => (
              <option key={d.id} value={d.id}>
                {shortAddr(d.address)}
              </option>
            ))}
          </select>
        </div>
        {spendByCategory.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-4">
            No expenses recorded
          </p>
        ) : (
          <div className="space-y-2">
            {spendByCategory.map((cat) => (
              <div key={cat.value}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-400">
                    {cat.icon} {cat.label}
                  </span>
                  <span className="text-xs font-semibold text-zinc-300">
                    {fmt(cat.amount)}{" "}
                    <span className="text-zinc-600 font-normal">
                      ({(cat.pct * 100).toFixed(0)}%)
                    </span>
                  </span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500/70"
                    style={{
                      width: `${Math.max(2, cat.pct * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t border-zinc-800">
              <span className="text-xs font-medium text-zinc-400">
                Total
              </span>
              <span className="text-sm font-bold text-zinc-200">
                {fmt(totalSpendFiltered)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Monthly Spend Trend */}
      <div className="px-4 mb-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">
          Monthly Spend (12 months)
        </h3>
        <div className="flex items-end gap-1 h-32">
          {monthlySpend.map((m, i) => (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end"
            >
              <div
                className="w-full bg-amber-500/60 rounded-t"
                style={{
                  height: `${Math.max(
                    2,
                    (m.amount / maxMonthlySpend) * 100
                  )}%`,
                }}
                title={`${m.label}: ${fmt(m.amount)}`}
              />
              <p className="text-[8px] text-zinc-600 mt-1 truncate w-full text-center">
                {m.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 5: Deal Performance Table */}
      {sortedCompleted.length > 0 && (
        <div className="px-4 mb-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">
            Completed Deal Performance
          </h3>
          <div className="space-y-1.5">
            {sortedCompleted.map((deal) => {
              const profitTier =
                deal.estimatedProfit >= 30000
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : deal.estimatedProfit >= 10000
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-red-500/30 bg-red-500/5";
              return (
                <button
                  key={deal.id}
                  onClick={() =>
                    actions.navigate("deal-detail", {
                      dealId: deal.id,
                    })
                  }
                  className={`w-full text-left p-3 rounded-xl border ${profitTier} active:scale-[0.98]`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <p className="text-xs font-medium text-zinc-200 truncate max-w-[65%]">
                      {shortAddr(deal.address)}
                    </p>
                    <span
                      className={`text-sm font-bold ${
                        deal.estimatedProfit >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {fmt(deal.estimatedProfit)}
                    </span>
                  </div>
                  <div className="flex gap-4 text-[10px] text-zinc-500">
                    <span>
                      Buy {fmt(deal.purchase_price)}
                    </span>
                    <span>
                      Sell {fmt(deal.sale_price)}
                    </span>
                    <span>
                      ROI {pct(deal.roi)}
                    </span>
                    <span>
                      {deal.holdMonths.toFixed(1)}mo
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 6: Active Deals Health */}
      {activeMetrics.length > 0 && (
        <div className="px-4 mb-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">
            Active Deals Health
          </h3>
          <div className="space-y-2">
            {activeMetrics.map((deal) => {
              const healthStatus =
                deal.budgetUsed >= 1
                  ? { label: "Over Budget", color: "text-red-400" }
                  : deal.budgetUsed >= 0.8
                  ? { label: "Watch", color: "text-amber-400" }
                  : { label: "On Track", color: "text-emerald-400" };
              return (
                <button
                  key={deal.id}
                  onClick={() =>
                    actions.navigate("deal-detail", {
                      dealId: deal.id,
                    })
                  }
                  className="w-full text-left p-3 bg-zinc-900/80 border border-zinc-800/80 rounded-xl active:bg-zinc-800"
                >
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-medium text-zinc-200 truncate max-w-[65%]">
                      {shortAddr(deal.address)}
                    </p>
                    <span
                      className={`text-[10px] font-bold ${healthStatus.color}`}
                    >
                      {healthStatus.label}
                    </span>
                  </div>
                  <div className="flex gap-3 text-[10px] text-zinc-500 mb-2">
                    <span>
                      Budget:{" "}
                      <span className={budgetColor(deal.budgetUsed)}>
                        {(deal.budgetUsed * 100).toFixed(0)}%
                      </span>
                    </span>
                    <span>{deal.holdMonths.toFixed(1)}mo held</span>
                    <span>
                      Est. profit:{" "}
                      <span
                        className={
                          deal.estimatedProfit >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }
                      >
                        {fmt(deal.estimatedProfit)}
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${budgetBarColor(
                        deal.budgetUsed
                      )}`}
                      style={{
                        width: `${Math.min(
                          100,
                          deal.budgetUsed * 100
                        )}%`,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {deals.length === 0 && (
        <div className="text-center py-12 px-4">
          <p className="text-zinc-500 text-sm">
            No deals yet. Analytics will populate as you add deals
            and log expenses.
          </p>
        </div>
      )}
    </div>
  );
}

// ---- HELPER COMPONENTS ----

function SummaryCard({
  label,
  value,
  valueColor,
  sub,
}: {
  label: string;
  value: string;
  valueColor: string;
  sub: string;
}) {
  return (
    <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-3">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">
        {label}
      </p>
      <p className={`text-lg font-bold ${valueColor}`}>{value}</p>
      <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>
    </div>
  );
}
