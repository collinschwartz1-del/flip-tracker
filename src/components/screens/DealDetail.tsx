"use client";

import { useState, useEffect, useCallback } from "react";
import { StatusBadge, SvgIcon } from "@/components/ui";
import { fmt, pct, shortAddr, budgetColor, budgetBarColor, calcDealFinancials } from "@/lib/utils";
import { EXPENSE_CATEGORIES, type Deal, type Expense, type DealNote, type DealPhoto, type PhotoType } from "@/lib/types";
import * as data from "@/lib/data";
import { PhotoGallery } from "@/components/PhotoGallery";
import type { AppActions } from "@/components/AppShell";

export function DealDetail({
  dealId,
  deals,
  expenses,
  actions,
  userEmail,
}: {
  dealId: string;
  deals: Deal[];
  expenses: Expense[];
  actions: AppActions;
  userEmail: string;
}) {
  const deal = deals.find((d) => d.id === dealId);
  const [notes, setNotes] = useState<DealNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [photos, setPhotos] = useState<DealPhoto[]>([]);
  const [uploading, setUploading] = useState(false);

  const loadNotes = useCallback(async () => {
    if (!dealId) return;
    try {
      const [n, p] = await Promise.all([
        data.getNotes(dealId),
        data.getDealPhotos(dealId),
      ]);
      setNotes(n);
      setPhotos(p);
    } catch (e) {
      console.error(e);
    }
    setLoadingNotes(false);
  }, [dealId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleUploadPhoto = async (file: File, type: PhotoType) => {
    setUploading(true);
    try {
      await data.uploadDealPhoto(dealId, file, type, userEmail);
      const updated = await data.getDealPhotos(dealId);
      setPhotos(updated);
      actions.toast("Photo uploaded!");
    } catch (err: any) {
      actions.toast("Upload failed: " + err.message, "error");
    }
    setUploading(false);
  };

  const handleDeletePhoto = async (photo: DealPhoto) => {
    try {
      await data.deleteDealPhoto(photo);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      actions.toast("Photo deleted");
    } catch (err: any) {
      actions.toast("Delete failed: " + err.message, "error");
    }
  };

  if (!deal) {
    return (
      <div className="p-4 text-zinc-400">
        Deal not found.{" "}
        <button onClick={() => actions.navigate("dashboard")} className="text-amber-400 underline">
          Back to dashboard
        </button>
      </div>
    );
  }

  const dealExpenses = expenses.filter((e) => e.deal_id === dealId);
  const fin = calcDealFinancials(deal, dealExpenses);
  const isSold = deal.status === "sold" || deal.status === "closed";

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      await data.createNote({ deal_id: dealId, content: newNote.trim(), author: userEmail });
      setNewNote("");
      await loadNotes();
      actions.toast("Note added");
    } catch {
      actions.toast("Couldn't save note", "error");
    }
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <button onClick={() => actions.navigate("dashboard")} className="p-2 -ml-2 rounded-lg active:bg-zinc-800">
          <SvgIcon d="M19 12H5 M12 19l-7-7 7-7" size={20} className="text-zinc-400" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-zinc-100 truncate">{shortAddr(deal.address)}</p>
          <p className="text-xs text-zinc-500">
            {deal.beds}bd / {deal.baths}ba / {deal.sqft?.toLocaleString()}sf &middot; Built {deal.year_built}
          </p>
        </div>
        <button
          onClick={() => actions.navigate("edit-deal", { dealId: deal.id })}
          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800"
        >
          <SvgIcon d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" size={16} className="text-zinc-400" />
        </button>
      </div>

      <div className="px-4 mb-3 flex items-center gap-2">
        <StatusBadge status={deal.status} />
        {deal.purchase_date && (
          <span className="text-xs text-zinc-500">
            Purchased {new Date(deal.purchase_date).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Financial summary */}
      <div className="px-4 mb-4">
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
          <Row label="Purchase Price" value={fmt(deal.purchase_price)} />
          <Row label="Rehab Budget" value={fmt(deal.rehab_budget)} />
          <Row label="Rehab Spent" value={fmt(fin.rehabSpent)} valueClass={budgetColor(fin.budgetUsed)} labelClass={budgetColor(fin.budgetUsed)} />
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${budgetBarColor(fin.budgetUsed)}`} style={{ width: `${Math.min(100, fin.budgetUsed * 100)}%` }} />
          </div>
          <Row label="Holding Costs" value={fmt(fin.holdingSpent)} />
          <Row label="Selling Costs (8%)" value={fmt(fin.sellingCosts)} />
          <div className="border-t border-zinc-800 my-2" />
          <Row label={isSold ? "Sale Price" : "Estimated ARV"} value={fmt(isSold ? deal.sale_price : deal.estimated_arv)} valueClass="text-zinc-100 font-bold" />
          <div className="flex justify-between items-center bg-zinc-800/50 -mx-4 px-4 py-3 rounded-xl">
            <div>
              <span className="text-sm font-bold text-zinc-200">{isSold ? "Actual Profit" : "Proj. Profit"}</span>
              {!isSold && deal.rehab_budget > 0 && deal.rehab_budget > fin.rehabSpent && (
                <p className="text-[9px] text-zinc-600 mt-0.5">Based on full {fmt(deal.rehab_budget)} budget</p>
              )}
            </div>
            <div className="text-right">
              <span className={`text-lg font-bold ${fin.estimatedProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {fmt(fin.estimatedProfit)}
              </span>
              <span className="text-xs text-zinc-500 ml-2">({pct(fin.roi)} ROI)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Expense button */}
      <div className="px-4 mb-4">
        <button
          onClick={() => actions.navigate("add-expense", { dealId: deal.id })}
          className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <SvgIcon d="M12 5v14 M5 12h14" size={18} className="text-zinc-950" />
          Add Expense
        </button>
      </div>

      {/* Photo Gallery */}
      <div className="px-4 mb-4">
        <PhotoGallery
          dealId={dealId}
          photos={photos}
          onUpload={handleUploadPhoto}
          onDelete={handleDeletePhoto}
          uploading={uploading}
        />
      </div>

      {/* Recent Expenses */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-zinc-300">Recent Expenses</h3>
          {dealExpenses.length > 5 && (
            <button onClick={() => actions.navigate("expenses", { filterDeal: deal.id })} className="text-xs text-amber-400">
              See all &rarr;
            </button>
          )}
        </div>
        {dealExpenses.length === 0 ? (
          <p className="text-xs text-zinc-600 py-4 text-center">No expenses logged yet</p>
        ) : (
          <div className="space-y-1.5">
            {dealExpenses.slice(0, 5).map((exp) => (
              <div key={exp.id} className="flex items-center justify-between py-2 px-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-sm">{EXPENSE_CATEGORIES.find((c) => c.value === exp.category)?.icon || "\u{1f4e6}"}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-300 truncate">
                      {exp.vendor || EXPENSE_CATEGORIES.find((c) => c.value === exp.category)?.label}
                    </p>
                    <p className="text-[10px] text-zinc-600">{new Date(exp.expense_date).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-zinc-200 ml-2">{fmt(exp.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="px-4 mb-4">
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">Notes</h3>
        <div className="flex gap-2 mb-3">
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note..."
            className="flex-1 px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
            onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
          />
          <button onClick={handleAddNote} className="px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-300 text-sm font-medium active:bg-zinc-700">
            Add
          </button>
        </div>
        <div className="space-y-2">
          {notes.map((n) => (
            <div key={n.id} className="p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl">
              <p className="text-xs text-zinc-300">{n.content}</p>
              <p className="text-[10px] text-zinc-600 mt-1">
                {n.author?.split("@")[0]} &middot; {new Date(n.created_at).toLocaleString()}
              </p>
            </div>
          ))}
          {notes.length === 0 && !loadingNotes && (
            <p className="text-xs text-zinc-600 text-center py-3">No notes yet</p>
          )}
        </div>
      </div>

      {/* Financing */}
      {deal.financing_notes && (
        <div className="px-4 mb-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-2">Financing</h3>
          <p className="text-xs text-zinc-400 bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-3">
            {deal.financing_notes}
          </p>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  valueClass = "text-zinc-200",
  labelClass = "text-zinc-500",
}: {
  label: string;
  value: string;
  valueClass?: string;
  labelClass?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-xs ${labelClass}`}>{label}</span>
      <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}
