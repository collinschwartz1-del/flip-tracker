"use client";

import { useState } from "react";
import { SvgIcon } from "@/components/ui";
import { fmt, shortAddr, today } from "@/lib/utils";
import { EXPENSE_CATEGORIES, type Deal, type ExpenseCategory } from "@/lib/types";
import type { AppActions } from "@/components/AppShell";

export function AddExpense({
  deals,
  preselectedDealId,
  actions,
  userEmail,
}: {
  deals: Deal[];
  preselectedDealId?: string;
  actions: AppActions;
  userEmail: string;
}) {
  const [dealId, setDealId] = useState(preselectedDealId || "");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory | "">("");
  const [vendor, setVendor] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const activeDeals = deals.filter((d) => !["sold", "closed"].includes(d.status));

  const handleSave = async () => {
    if (!dealId) { actions.toast("Select a deal", "error"); return; }
    if (!amount || parseFloat(amount) <= 0) { actions.toast("Enter an amount", "error"); return; }
    if (!category) { actions.toast("Select a category", "error"); return; }

    setSaving(true);
    try {
      await actions.saveExpense({
        deal_id: dealId,
        amount: parseFloat(amount),
        category,
        vendor: vendor.trim() || null,
        note: note.trim() || null,
        expense_date: date,
        entered_by: userEmail,
      });
      setSaved(true);
      actions.toast("Expense saved!");
    } catch {
      actions.toast("Couldn't save — check your connection", "error");
    }
    setSaving(false);
  };

  const handleAddAnother = () => {
    setAmount("");
    setCategory("");
    setVendor("");
    setNote("");
    setDate(today());
    setSaved(false);
  };

  if (saved) {
    return (
      <div className="pb-24 flex flex-col items-center justify-center min-h-[60vh] px-6">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
          <SvgIcon d="M20 6L9 17l-5-5" size={32} className="text-emerald-400" />
        </div>
        <h2 className="text-lg font-bold text-zinc-100 mb-1">Expense Saved!</h2>
        <p className="text-sm text-zinc-500 mb-6">
          {fmt(parseFloat(amount))} · {EXPENSE_CATEGORIES.find((c) => c.value === category)?.label}
        </p>
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={handleAddAnother}
            className="flex-1 py-3.5 bg-amber-500 text-zinc-950 font-bold rounded-xl text-sm active:scale-[0.98]"
          >
            + Add Another
          </button>
          <button
            onClick={() => actions.navigate("dashboard")}
            className="flex-1 py-3.5 bg-zinc-800 text-zinc-300 font-medium rounded-xl text-sm border border-zinc-700 active:scale-[0.98]"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <button
          onClick={() =>
            actions.navigate(preselectedDealId ? "deal-detail" : "dashboard", preselectedDealId ? { dealId: preselectedDealId } : {})
          }
          className="p-2 -ml-2 rounded-lg active:bg-zinc-800"
        >
          <SvgIcon d="M19 12H5 M12 19l-7-7 7-7" size={20} className="text-zinc-400" />
        </button>
        <h1 className="text-base font-bold text-zinc-100">Add Expense</h1>
      </div>

      <div className="px-4 space-y-5">
        {/* Deal selector */}
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Deal</label>
          <select
            value={dealId}
            onChange={(e) => setDealId(e.target.value)}
            className="w-full py-3.5 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50"
          >
            <option value="">Select a deal...</option>
            {activeDeals.map((d) => (
              <option key={d.id} value={d.id}>
                {shortAddr(d.address)}
              </option>
            ))}
          </select>
        </div>

        {/* Amount — BIG INPUT */}
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Amount</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-zinc-500 font-light">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              inputMode="decimal"
              className="w-full py-5 pl-10 pr-4 bg-zinc-900 border-2 border-zinc-700 rounded-2xl text-3xl font-bold text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-amber-500 text-center"
              style={{ fontSize: "2rem" }}
            />
          </div>
        </div>

        {/* Category — tap grid */}
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Category</label>
          <div className="grid grid-cols-3 gap-1.5">
            {EXPENSE_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`py-3 px-2 rounded-xl text-xs font-medium transition-all flex flex-col items-center gap-1 active:scale-[0.96] ${
                  category === cat.value
                    ? "bg-amber-500/20 text-amber-300 border-2 border-amber-500/40"
                    : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                }`}
              >
                <span className="text-base">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Vendor */}
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">
            Vendor / Payee <span className="text-zinc-700">(optional)</span>
          </label>
          <input
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="e.g. Home Depot"
            className="w-full py-3 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">
            Note <span className="text-zinc-700">(optional)</span>
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Drywall for upstairs bath"
            className="w-full py-3 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full py-3 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-2xl text-base transition-colors disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-amber-500/20"
        >
          {saving ? "Saving..." : "Save Expense"}
        </button>
      </div>
    </div>
  );
}
