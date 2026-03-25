"use client";

import { useState, useEffect } from "react";
import { SvgIcon, ConfirmDialog } from "@/components/ui";
import { shortAddr } from "@/lib/utils";
import { STATUS_CONFIG, type Deal, type DealStatus } from "@/lib/types";
import type { AppActions } from "@/components/AppShell";

export function DealForm({
  deals,
  dealId,
  actions,
}: {
  deals: Deal[];
  dealId: string | null;
  actions: AppActions;
}) {
  const existing = dealId ? deals.find((d) => d.id === dealId) : null;
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    address: "",
    beds: "",
    baths: "",
    sqft: "",
    year_built: "",
    purchase_price: "",
    purchase_date: "",
    rehab_budget: "",
    estimated_arv: "",
    status: "looking" as DealStatus,
    monthly_holding_cost: "1500",
    financing_notes: "",
    notes: "",
    sale_price: "",
    sale_date: "",
    actual_closing_costs: "",
  });

  useEffect(() => {
    if (existing) {
      setForm({
        address: existing.address || "",
        beds: existing.beds?.toString() ?? "",
        baths: existing.baths?.toString() ?? "",
        sqft: existing.sqft?.toString() ?? "",
        year_built: existing.year_built?.toString() ?? "",
        purchase_price: existing.purchase_price?.toString() ?? "",
        purchase_date: existing.purchase_date || "",
        rehab_budget: existing.rehab_budget?.toString() ?? "",
        estimated_arv: existing.estimated_arv?.toString() ?? "",
        status: existing.status || "looking",
        monthly_holding_cost: existing.monthly_holding_cost?.toString() ?? "1500",
        financing_notes: existing.financing_notes || "",
        notes: existing.notes || "",
        sale_price: existing.sale_price?.toString() ?? "",
        sale_date: existing.sale_date || "",
        actual_closing_costs: existing.actual_closing_costs?.toString() ?? "",
      });
    }
  }, [existing]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.address.trim()) {
      actions.toast("Address is required", "error");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        address: form.address.trim(),
        beds: form.beds ? parseInt(form.beds) : null,
        baths: form.baths ? parseFloat(form.baths) : null,
        sqft: form.sqft ? parseInt(form.sqft) : null,
        year_built: form.year_built ? parseInt(form.year_built) : null,
        purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : 0,
        purchase_date: form.purchase_date || null,
        rehab_budget: form.rehab_budget ? parseFloat(form.rehab_budget) : 0,
        estimated_arv: form.estimated_arv ? parseFloat(form.estimated_arv) : 0,
        status: form.status,
        monthly_holding_cost: form.monthly_holding_cost ? parseFloat(form.monthly_holding_cost) : 1500,
        financing_notes: form.financing_notes,
        notes: form.notes,
        sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
        sale_date: form.sale_date || null,
        actual_closing_costs: form.actual_closing_costs ? parseFloat(form.actual_closing_costs) : null,
      };
      await actions.saveDeal(dealId, payload);
      actions.toast(dealId ? "Deal updated" : "Deal created");
      actions.navigate("dashboard");
    } catch {
      actions.toast("Couldn't save — check your connection", "error");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!dealId) return;
    await actions.deleteDeal(dealId);
    actions.toast("Deal deleted");
    actions.navigate("dashboard");
  };

  const isSold = form.status === "sold" || form.status === "closed";

  return (
    <div className="pb-24">
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <button
          onClick={() => actions.navigate(dealId ? "deal-detail" : "dashboard", dealId ? { dealId } : {})}
          className="p-2 -ml-2 rounded-lg active:bg-zinc-800"
        >
          <SvgIcon d="M19 12H5 M12 19l-7-7 7-7" size={20} className="text-zinc-400" />
        </button>
        <h1 className="text-base font-bold text-zinc-100">{dealId ? "Edit Deal" : "New Deal"}</h1>
      </div>

      <div className="px-4 space-y-4">
        <Field label="Address *" value={form.address} onChange={(v) => set("address", v)} placeholder="123 Main St, Omaha, NE" />

        <div className="grid grid-cols-4 gap-2">
          <Field label="Beds" value={form.beds} onChange={(v) => set("beds", v)} type="number" placeholder="3" />
          <Field label="Baths" value={form.baths} onChange={(v) => set("baths", v)} type="number" placeholder="2" />
          <Field label="SqFt" value={form.sqft} onChange={(v) => set("sqft", v)} type="number" placeholder="1500" />
          <Field label="Year" value={form.year_built} onChange={(v) => set("year_built", v)} type="number" placeholder="1960" />
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1">Status</label>
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.entries(STATUS_CONFIG) as [DealStatus, typeof STATUS_CONFIG[DealStatus]][]).map(([key, val]) => (
              <button
                key={key}
                onClick={() => set("status", key)}
                className={`py-2.5 rounded-xl text-xs font-medium transition-colors ${
                  form.status === key
                    ? `${val.color} text-white`
                    : "bg-zinc-900 text-zinc-500 border border-zinc-800"
                }`}
              >
                {val.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Purchase Price" value={form.purchase_price} onChange={(v) => set("purchase_price", v)} type="number" prefix />
          <Field label="Purchase Date" value={form.purchase_date} onChange={(v) => set("purchase_date", v)} type="date" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Rehab Budget" value={form.rehab_budget} onChange={(v) => set("rehab_budget", v)} type="number" prefix />
          <Field label="Estimated ARV" value={form.estimated_arv} onChange={(v) => set("estimated_arv", v)} type="number" prefix />
        </div>

        <Field label="Monthly Holding Cost" value={form.monthly_holding_cost} onChange={(v) => set("monthly_holding_cost", v)} type="number" prefix />
        <Field label="Financing Notes" value={form.financing_notes} onChange={(v) => set("financing_notes", v)} placeholder="Hard money, private lender, etc." />

        {isSold && (
          <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Sale Details</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sale Price" value={form.sale_price} onChange={(v) => set("sale_price", v)} type="number" prefix />
              <Field label="Sale Date" value={form.sale_date} onChange={(v) => set("sale_date", v)} type="date" />
            </div>
            <Field label="Actual Closing Costs" value={form.actual_closing_costs} onChange={(v) => set("actual_closing_costs", v)} type="number" prefix />
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-sm transition-colors disabled:opacity-50 active:scale-[0.98]"
        >
          {saving ? "Saving..." : dealId ? "Save Changes" : "Create Deal"}
        </button>

        {dealId && (
          <button onClick={() => setConfirm(true)} className="w-full py-3 text-red-400 text-sm font-medium">
            Delete this deal
          </button>
        )}
      </div>

      {confirm && (
        <ConfirmDialog
          title="Delete Deal?"
          message={`This will permanently delete "${shortAddr(form.address)}" and all its expenses.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirm(false)}
        />
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  prefix = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  prefix?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 ${
            prefix ? "pl-7 pr-3" : "px-3"
          }`}
        />
      </div>
    </div>
  );
}
