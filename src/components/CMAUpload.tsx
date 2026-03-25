"use client";

import { useState, useRef } from "react";
import type { MLSComp } from "@/lib/types";

interface CMAUploadProps {
  comps: MLSComp[];
  pdfName: string;
  uploadedAt: string | null;
  onUpload: (comps: MLSComp[], fileName: string) => Promise<void>;
}

export function CMAUpload({
  comps,
  pdfName,
  uploadedAt,
  onUpload,
}: CMAUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [expanded, setExpanded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes("pdf")) {
      alert("Please upload a PDF file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("File too large. Max 10MB.");
      return;
    }

    setUploading(true);
    setProgress("Reading PDF...");

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setProgress("Extracting comp data from CMA...");

      const res = await fetch("/api/extract-comps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf_base64: base64 }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Extraction failed");
      }

      setProgress(`Found ${result.comps.length} comps! Saving...`);
      await onUpload(result.comps, file.name);
    } catch (err: any) {
      alert("Couldn't extract comps: " + err.message);
    }

    setUploading(false);
    setProgress("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const soldComps = comps.filter(
    (c) => c.status?.toLowerCase() === "sold" || c.sale_price
  );
  const activeComps = comps.filter(
    (c) => c.status?.toLowerCase() === "active"
  );

  // Compute summary stats from sold comps
  const avgPriceSf =
    soldComps.length > 0
      ? soldComps.reduce((s, c) => s + (c.price_per_sf || 0), 0) /
        soldComps.length
      : 0;
  const avgDom =
    soldComps.length > 0
      ? soldComps.reduce((s, c) => s + (c.dom || 0), 0) / soldComps.length
      : 0;
  const medianPrice = (() => {
    const prices = soldComps
      .map((c) => c.sale_price)
      .filter((p): p is number => p != null)
      .sort((a, b) => a - b);
    if (prices.length === 0) return 0;
    const mid = Math.floor(prices.length / 2);
    return prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
  })();

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-300">
          MLS Comp Data
        </h3>
        {comps.length > 0 && (
          <span className="text-[10px] text-emerald-500 font-medium">
            {comps.length} comps loaded
          </span>
        )}
      </div>

      {/* Upload button */}
      <label
        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl cursor-pointer active:scale-[0.98] transition-all ${
          comps.length > 0
            ? "bg-zinc-900 border border-zinc-800 text-zinc-400"
            : "bg-blue-500/10 border border-blue-500/30 text-blue-400"
        }`}
      >
        {uploading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-zinc-600 border-t-blue-400 rounded-full animate-spin" />
            <span className="text-xs font-medium">{progress}</span>
          </div>
        ) : (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" />
            </svg>
            <span className="text-xs font-medium">
              {comps.length > 0 ? "Replace CMA PDF" : "Upload CMA / Comp Report (PDF)"}
            </span>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
      </label>

      {/* PDF info */}
      {pdfName && (
        <p className="text-[10px] text-zinc-600">
          {pdfName} · uploaded{" "}
          {uploadedAt
            ? new Date(uploadedAt).toLocaleDateString()
            : ""}
        </p>
      )}

      {/* Comp summary */}
      {soldComps.length > 0 && (
        <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
            MLS Comp Summary — {soldComps.length} Sold
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] text-zinc-500">Median Price</p>
              <p className="text-sm font-bold text-zinc-200">
                {fmt(medianPrice)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500">Avg $/SF</p>
              <p className="text-sm font-bold text-zinc-200">
                ${avgPriceSf.toFixed(0)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500">Avg DOM</p>
              <p className="text-sm font-bold text-zinc-200">
                {avgDom.toFixed(0)} days
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Comp list (expandable) */}
      {comps.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-amber-400 font-medium mb-2"
          >
            {expanded
              ? "Hide comp details"
              : `Show ${comps.length} comp details`}
          </button>

          {expanded && (
            <div className="space-y-1.5">
              {comps.map((comp, i) => (
                <div
                  key={i}
                  className="p-2.5 bg-zinc-900/50 border border-zinc-800/50 rounded-lg"
                >
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-zinc-300 truncate">
                        {comp.address}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {comp.beds}bd / {comp.baths}ba /{" "}
                        {comp.sqft?.toLocaleString()}sf ·{" "}
                        {comp.year_built} ·{" "}
                        {comp.dom != null ? `${comp.dom} DOM` : ""}
                        {comp.distance ? ` · ${comp.distance}` : ""}
                      </p>
                      {comp.condition && (
                        <p className="text-[10px] text-zinc-600 mt-0.5">
                          {comp.condition}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-sm font-bold text-zinc-200">
                        {comp.sale_price ? fmt(comp.sale_price) : "\u2014"}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {comp.price_per_sf
                          ? `$${comp.price_per_sf.toFixed(0)}/sf`
                          : ""}
                      </p>
                      {comp.status && (
                        <span
                          className={`text-[9px] font-medium ${
                            comp.status.toLowerCase() === "sold"
                              ? "text-emerald-500"
                              : "text-blue-400"
                          }`}
                        >
                          {comp.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active comps note */}
      {activeComps.length > 0 && (
        <p className="text-[10px] text-zinc-600">
          {activeComps.length} active listing
          {activeComps.length !== 1 ? "s" : ""} also included — AI
          will use these for competition analysis
        </p>
      )}
    </div>
  );
}
