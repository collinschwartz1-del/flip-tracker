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
  const [listingUrl, setListingUrl] = useState("");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [estimatedArv, setEstimatedArv] = useState("");
  const [estimatedRehab, setEstimatedRehab] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // --- Import state ---
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState("");

  // --- URL Import Handler ---
  const handleUrlImport = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportProgress("Fetching deal sheet...");

    try {
      const res = await fetch("/api/extract-deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Import failed");
      }

      setImportProgress("Filling in deal info...");
      const d = result.data;

      setAddress(d.address || "");
      setAskingPrice(d.asking_price?.toString() || "");
      setBeds(d.beds?.toString() || "");
      setBaths(d.baths?.toString() || "");
      setSqft(d.sqft?.toString() || "");
      setYearBuilt(d.year_built?.toString() || "");
      setEstimatedArv(d.estimated_arv?.toString() || "");
      setEstimatedRehab(d.estimated_rehab?.toString() || "");
      setSource(d.source || "");
      setSourceContact(d.source_contact || "");
      setNotes([d.description, d.notes].filter(Boolean).join("\n") || "");

      actions.toast("Deal info extracted! Review and save.");
    } catch (err: any) {
      actions.toast("Couldn't extract deal: " + err.message, "error");
    }

    setImporting(false);
    setImportProgress("");
  };

  // --- Image Upload Handler ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportProgress("Reading screenshot...");

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setImportProgress("Extracting deal info from image...");

      const res = await fetch("/api/extract-deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: base64,
          image_media_type: file.type || "image/jpeg",
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Import failed");
      }

      const d = result.data;
      setAddress(d.address || "");
      setAskingPrice(d.asking_price?.toString() || "");
      setBeds(d.beds?.toString() || "");
      setBaths(d.baths?.toString() || "");
      setSqft(d.sqft?.toString() || "");
      setYearBuilt(d.year_built?.toString() || "");
      setEstimatedArv(d.estimated_arv?.toString() || "");
      setEstimatedRehab(d.estimated_rehab?.toString() || "");
      setSource(d.source || "");
      setSourceContact(d.source_contact || "");
      setNotes([d.description, d.notes].filter(Boolean).join("\n") || "");

      actions.toast("Deal info extracted from screenshot! Review and save.");
    } catch (err: any) {
      actions.toast("Couldn't read screenshot: " + err.message, "error");
    }

    setImporting(false);
    setImportProgress("");
  };

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
        estimated_arv: estimatedArv ? parseFloat(estimatedArv) : null,
        estimated_rehab: estimatedRehab ? parseFloat(estimatedRehab) : null,
        estimated_profit: null,
        status: "new",
        offer_amount: null,
        offer_date: null,
        decision_reason: "",
        promoted_deal_id: null,
        listing_url: listingUrl.trim(),
        cma_comps: [],
        cma_pdf_name: "",
        cma_uploaded_at: null,
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
          {/* Quick Import Section */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Quick Import
            </p>

            {/* URL Import */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">
                Paste a deal sheet URL
              </label>
              <div className="flex gap-2">
                <input
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="https://launchcashdeals.com/property/..."
                  className="flex-1 py-2.5 px-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
                />
                <button
                  onClick={handleUrlImport}
                  disabled={importing || !importUrl.trim()}
                  className="px-4 py-2.5 bg-amber-500 text-zinc-950 font-bold rounded-xl text-xs disabled:opacity-50 active:bg-amber-400 whitespace-nowrap"
                >
                  Import
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-[10px] text-zinc-600 uppercase">or</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            {/* Screenshot Upload */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">
                Upload a screenshot or photo
              </label>
              <label className="flex items-center justify-center gap-2 py-3 px-4 bg-zinc-800 border border-zinc-700 border-dashed rounded-xl cursor-pointer active:bg-zinc-700">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                <span className="text-xs text-zinc-400 font-medium">
                  Tap to upload photo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            </div>

            {/* Progress */}
            {importing && (
              <div className="flex items-center gap-2 py-2">
                <div className="w-4 h-4 border-2 border-zinc-600 border-t-amber-400 rounded-full animate-spin" />
                <span className="text-xs text-amber-400">{importProgress}</span>
              </div>
            )}
          </div>

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

              {/* Listing URL */}
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1">
                  Zillow / Redfin Link
                </label>
                <input
                  type="text"
                  value={listingUrl}
                  onChange={(e) => setListingUrl(e.target.value)}
                  placeholder="https://www.zillow.com/homedetails/..."
                  className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
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

          {/* ARV + Rehab estimates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Est. ARV
              </label>
              <input
                type="number"
                value={estimatedArv}
                onChange={(e) => setEstimatedArv(e.target.value)}
                placeholder="220000"
                className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Est. Rehab
              </label>
              <input
                type="number"
                value={estimatedRehab}
                onChange={(e) => setEstimatedRehab(e.target.value)}
                placeholder="35000"
                className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
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
