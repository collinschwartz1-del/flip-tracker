"use client";

import { useState, useMemo } from "react";
import { SvgIcon, ConfirmDialog } from "@/components/ui";
import { fmt, shortAddr, exportExpensesCSV } from "@/lib/utils";
import { EXPENSE_CATEGORIES, type Deal, type Expense } from "@/lib/types";
import type { AppActions } from "@/components/AppShell";

export function ExpensesList({
  deals,
  expenses,
  filterDealId,
  actions,
}: {
  deals: Deal[];
  expenses: Expense[];
  filterDealId?: string;
  actions: AppActions;
}) {
  const [filterDeal, setFilterDeal] = useState(filterDealId || "");
  const [filterCategory, setFilterCategory] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = expenses.map((e) => ({
      ...e,
      dealAddress: deals.find((d) => d.id === e.deal_id)?.address || "",
    }));
    if (filterDeal) list = list.filter((e) => e.deal_id === filterDeal);
    if (filterCategory) list = list.filter((e) => e.category === filterCategory);
    return list.sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
  }, [expenses, deals, filterDeal, filterCategory]);

  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);

  const handleExport = () => {
    exportExpensesCSV(filtered);
    actions.toast("CSV downloaded");
  };

  const handleDelete = async () => {
    if (confirmDelete) {
      await actions.deleteExpense(confirmDelete);
      actions.toast("Expense deleted");
      setConfirmDelete(null);
    }
  };

  return (
    <div className="pb-24">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <h1 className="text-base font-bold text-zinc-100">Expenses</h1>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 font-medium active:bg-zinc-800"
        >
          <SvgIcon d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M7 10l5 5 5-5 M12 15V3" size={14} className="text-zinc-400" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="px-4 mb-3 flex gap-2">
        <select
          value={filterDeal}
          onChange={(e) => setFilterDeal(e.target.value)}
          className="flex-1 py-2 px-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none"
        >
          <option value="">All Deals</option>
          {deals.map((d) => (
            <option key={d.id} value={d.id}>
              {shortAddr(d.address)}
            </option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="flex-1 py-2 px-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none"
        >
          <option value="">All Categories</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Total */}
      <div className="px-4 mb-3">
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl px-4 py-3 flex justify-between items-center">
          <span className="text-xs text-zinc-500">
            {filtered.length} expense{filtered.length !== 1 ? "s" : ""}
          </span>
          <span className="text-base font-bold text-zinc-100">{fmt(total)}</span>
        </div>
      </div>

      {/* List */}
      <div className="px-4 space-y-1.5">
        {filtered.map((exp) => (
          <div key={exp.id} className="flex items-center justify-between py-2.5 px-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="text-sm">
                {EXPENSE_CATEGORIES.find((c) => c.value === exp.category)?.icon || "📦"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-zinc-300 truncate">
                  {exp.vendor || EXPENSE_CATEGORIES.find((c) => c.value === exp.category)?.label}
                </p>
                <p className="text-[10px] text-zinc-600 truncate">
                  {shortAddr(exp.dealAddress)} · {new Date(exp.expense_date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <span className="text-sm font-semibold text-zinc-200">{fmt(exp.amount)}</span>
              <button onClick={() => setConfirmDelete(exp.id)} className="p-1.5 rounded-lg active:bg-zinc-800">
                <SvgIcon d="M3 6h18 M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" size={13} className="text-zinc-600" />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-zinc-600 text-center py-8">No expenses found</p>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog title="Delete Expense?" message="This can't be undone." onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />
      )}
    </div>
  );
}
