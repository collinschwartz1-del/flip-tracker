"use client";

import { useState } from "react";
import type { AppActions } from "@/components/AppShell";

export function AddPipelineDeal({
  actions,
  userEmail,
}: {
  actions: AppActions;
  userEmail: string;
}) {
  const [address, setAddress] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [source, setSource] = useState("");
  const [sourceContact, setSourceContact] = useState("");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!address.trim() || !askingPrice) {
      actions.toast("Address and asking price are required", "error");
      return;
    }
    setSaving(true);
    try {
      const { createPipelineDeal } = await import("@/lib/data");
      await createPipelineDeal({
        address: address.trim(),
        asking_price: parseFloat(askingPrice) || 0,
        source: source.trim(),
        source_contact: sourceContact.trim(),
        beds: beds ? parseInt(beds) : null,
        baths: baths ? parseInt(baths) : null,
        sqft: sqft ? parseInt(sqft) : null,
        year_built: yearBuilt ? parseInt(yearBuilt) : null,
        lot_size: null,
        estimated_arv: null,
        estimated_rehab: null,
        estimated_profit: null,
        status: "new",
        offer_amount: null,
        offer_date: null,
        decision_reason: "",
        promoted_deal_id: null,
        notes: notes.trim(),
        added_by: userEmail,
      });
      await actions.refreshData();
      actions.toast("Deal added to pipeline");
      actions.navigate("pipeline" as any);
    } catch (err: any) {
      actions.toast(err.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-24">
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-zinc-100">Add Pipeline Deal</h1>
          <button
            onClick={() => actions.navigate("pipeline" as any)}
            className="text-sm text-zinc-500"
          >
            Cancel
          </button>
        </div>

        <div className="space-y-4">
          {/* Address */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Address *
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, Omaha, NE"
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Asking Price */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Asking Price *
            </label>
            <input
              type="number"
              value={askingPrice}
              onChange={(e) => setAskingPrice(e.target.value)}
              placeholder="150000"
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Source row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Source
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Wholesaler, MLS..."
                className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Contact
              </label>
              <input
                type="text"
                value={sourceContact}
                onChange={(e) => setSourceContact(e.target.value)}
                placeholder="Name / phone"
                className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>

          {/* Property details */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Beds
              </label>
              <input
                type="number"
                value={beds}
                onChange={(e) => setBeds(e.target.value)}
                placeholder="3"
                className="w-full px-3 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Baths
              </label>
              <input
                type="number"
                value={baths}
                onChange={(e) => setBaths(e.target.value)}
                placeholder="2"
                className="w-full px-3 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                SqFt
              </label>
              <input
                type="number"
                value={sqft}
                onChange={(e) => setSqft(e.target.value)}
                placeholder="1200"
                className="w-full px-3 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Year
              </label>
              <input
                type="number"
                value={yearBuilt}
                onChange={(e) => setYearBuilt(e.target.value)}
                placeholder="1960"
                className="w-full px-3 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Initial thoughts, condition notes..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 rounded-xl bg-amber-500 text-zinc-950 font-semibold text-sm active:bg-amber-400 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add to Pipeline"}
          </button>
        </div>
      </div>
    </div>
  );
}
