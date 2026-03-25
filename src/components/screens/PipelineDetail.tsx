"use client";

import { useState, useEffect, useCallback } from "react";
import type { PipelineDeal, AIAnalysis } from "@/lib/types";
import { PIPELINE_STATUS_CONFIG } from "@/lib/types";
import type { AppActions, ScreenParams } from "@/components/AppShell";
import { Spinner } from "@/components/ui";
import * as data from "@/lib/data";

function buildAnalysisPrompt(deal: PipelineDeal): string {
  return `You are an adversarial flip deal analyzer for Acreage Brothers, an Omaha NE fix-and-flip operation. Analyze this deal and return ONLY valid JSON (no markdown, no code fences).

DEAL:
- Address: ${deal.address}
- Asking Price: $${deal.asking_price?.toLocaleString()}
${deal.beds ? `- Beds: ${deal.beds}` : ""}
${deal.baths ? `- Baths: ${deal.baths}` : ""}
${deal.sqft ? `- SqFt: ${deal.sqft}` : ""}
${deal.year_built ? `- Year Built: ${deal.year_built}` : ""}
${deal.source ? `- Source: ${deal.source}` : ""}
${deal.notes ? `- Notes: ${deal.notes}` : ""}

Return JSON with this structure:
{
  "verdict": "GO" | "MAYBE" | "NO GO",
  "summary": "2-3 sentence verdict summary",
  "estimated_arv": number,
  "rehab_estimate": { "light": number, "moderate": number, "heavy": number },
  "base_case_profit": number,
  "base_case_roi": number,
  "max_purchase_price": number,
  "risk_level": "LOW" | "MEDIUM" | "HIGH" | "EXTREME",
  "risk_tests": [{ "name": string, "rating": "PASS" | "WARN" | "FAIL", "detail": string }],
  "profit_matrix": {
    "best_light": { "profit": number, "roi": number, "color": "green" | "amber" | "red" },
    "best_moderate": { "profit": number, "roi": number, "color": "green" | "amber" | "red" },
    "best_heavy": { "profit": number, "roi": number, "color": "green" | "amber" | "red" },
    "base_light": { "profit": number, "roi": number, "color": "green" | "amber" | "red" },
    "base_moderate": { "profit": number, "roi": number, "color": "green" | "amber" | "red" },
    "base_heavy": { "profit": number, "roi": number, "color": "green" | "amber" | "red" },
    "worst_light": { "profit": number, "roi": number, "color": "green" | "amber" | "red" },
    "worst_moderate": { "profit": number, "roi": number, "color": "green" | "amber" | "red" },
    "worst_heavy": { "profit": number, "roi": number, "color": "green" | "amber" | "red" }
  },
  "kill_zones": {
    "max_purchase_for_30k": number,
    "arv_floor_breakeven": number,
    "rehab_ceiling_20k_profit": number,
    "max_hold_months": number
  },
  "conditions": [string],
  "missing_data": [string]
}

Be adversarial. Assume moderate rehab unless evidence suggests otherwise. Use Omaha NE market data. If data is thin, say so and use conservative estimates.`;
}

export function PipelineDetail({
  dealId,
  pipelineDeals,
  actions,
  userEmail,
}: {
  dealId: string;
  pipelineDeals: PipelineDeal[];
  actions: AppActions;
  userEmail: string;
}) {
  const deal = pipelineDeals.find((d) => d.id === dealId);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [listingUrl, setListingUrl] = useState(deal?.listing_url || "");
  const [loadingAnalysis, setLoadingAnalysis] = useState(true);
  const [offerAmount, setOfferAmount] = useState("");
  const [passReason, setPassReason] = useState("");
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [showPassForm, setShowPassForm] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [notes, setNotes] = useState<any[]>([]);

  const loadAnalysis = useCallback(async () => {
    if (!dealId) return;
    try {
      const a = await data.getLatestAnalysis(dealId);
      setAnalysis(a);
      if (a?.analysis_result) {
        setAnalysisResult(
          typeof a.analysis_result === "string"
            ? JSON.parse(a.analysis_result)
            : a.analysis_result
        );
      }
    } catch (err) {
      console.error("Failed to load analysis:", err);
    } finally {
      setLoadingAnalysis(false);
    }
  }, [dealId]);

  const loadNotes = useCallback(async () => {
    if (!dealId) return;
    try {
      const n = await data.getPipelineNotes(dealId);
      setNotes(n);
    } catch (err) {
      console.error("Failed to load notes:", err);
    }
  }, [dealId]);

  useEffect(() => {
    loadAnalysis();
    loadNotes();
  }, [loadAnalysis, loadNotes]);

  if (!deal) {
    return (
      <div className="p-4 text-center text-zinc-500">Deal not found</div>
    );
  }

  const status = PIPELINE_STATUS_CONFIG[deal.status];
  const fmt = (n: number | null | undefined) =>
    n != null ? `$${Math.round(n).toLocaleString()}` : "Ã¢ÂÂ";

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      // Save listing URL if provided
      if (listingUrl.trim()) {
        await data.updatePipelineDeal(dealId, { listing_url: listingUrl.trim() });
      }
      // Update status to analyzing
      await data.updatePipelineDeal(dealId, { status: "analyzing" });

      const prompt = buildAnalysisPrompt(deal);
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, listing_url: listingUrl.trim() || undefined }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const apiData = await response.json();
      const text = apiData.content?.[0]?.text || "";

      // Parse JSON from response
      let parsed;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      } catch {
        throw new Error("Failed to parse analysis result");
      }

      // Save analysis to DB
      await data.createAnalysis({
        pipeline_deal_id: dealId,
        input_data: { address: deal.address, asking_price: deal.asking_price },
        analysis_result: parsed,
        verdict: parsed.verdict || "",
        base_case_profit: parsed.base_case_profit || null,
        base_case_roi: parsed.base_case_roi || null,
        max_purchase_price: parsed.max_purchase_price || null,
        arv_validated: parsed.estimated_arv || null,
        rehab_moderate: parsed.rehab_estimate?.moderate || null,
        risk_level: parsed.risk_level || "",
        status: "completed",
        error_message: null,
        triggered_by: userEmail,
      });

      // Update deal with estimates
      await data.updatePipelineDeal(dealId, {
        status: "new",
        estimated_arv: parsed.estimated_arv || null,
        estimated_rehab: parsed.rehab_estimate?.moderate || null,
        estimated_profit: parsed.base_case_profit || null,
      });

      setAnalysisResult(parsed);
      await actions.refreshData();
      await loadAnalysis();
      actions.toast("Analysis complete");
    } catch (err: any) {
      actions.toast(err.message || "Analysis failed", "error");
      await data.updatePipelineDeal(dealId, { status: "new" });
    } finally {
      setAnalyzing(false);
    }
  };

  const makeOffer = async () => {
    if (!offerAmount) return;
    try {
      await data.updatePipelineDeal(dealId, {
        status: "offer_made",
        offer_amount: parseFloat(offerAmount),
        offer_date: new Date().toISOString().split("T")[0],
      });
      await actions.refreshData();
      setShowOfferForm(false);
      actions.toast("Offer recorded");
    } catch (err: any) {
      actions.toast(err.message, "error");
    }
  };

  const passDeal = async () => {
    try {
      await data.updatePipelineDeal(dealId, {
        status: "passed",
        decision_reason: passReason || "Passed",
      });
      await actions.refreshData();
      setShowPassForm(false);
      actions.toast("Deal passed");
    } catch (err: any) {
      actions.toast(err.message, "error");
    }
  };

  const promoteDeal = async () => {
    try {
      await data.promotePipelineDeal(dealId);
      await actions.refreshData();
      actions.toast("Deal promoted to active flips!");
      actions.navigate("dashboard" as any);
    } catch (err: any) {
      actions.toast(err.message, "error");
    }
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    try {
      await data.createPipelineNote({
        pipeline_deal_id: dealId,
        content: noteText.trim(),
        author: userEmail,
      });
      setNoteText("");
      await loadNotes();
    } catch (err: any) {
      actions.toast(err.message, "error");
    }
  };

  const verdictColors: Record<string, string> = {
    GO: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    MAYBE: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    "NO GO": "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const cellColor = (c: string) =>
    c === "green"
      ? "bg-emerald-900/40 text-emerald-300"
      : c === "amber"
      ? "bg-amber-900/40 text-amber-300"
      : "bg-red-900/40 text-red-300";

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800/80">
        <button
          onClick={() => actions.navigate("pipeline" as any)}
          className="text-xs text-zinc-500 mb-2 flex items-center gap-1"
        >
          Ã¢ÂÂ Pipeline
        </button>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-lg font-bold text-zinc-100">{deal.address}</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Ask: {fmt(deal.asking_price)} ÃÂ· Source: {deal.source || "Ã¢ÂÂ"}
            </p>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white ${status.color}`}
          >
            {status.label}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Property details */}
        {(deal.beds || deal.baths || deal.sqft || deal.year_built) && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Beds", value: deal.beds },
              { label: "Baths", value: deal.baths },
              { label: "SqFt", value: deal.sqft?.toLocaleString() },
              { label: "Year", value: deal.year_built },
            ].map(
              (item) =>
                item.value && (
                  <div
                    key={item.label}
                    className="bg-zinc-900/60 rounded-lg p-2 text-center"
                  >
                    <div className="text-[10px] text-zinc-500">{item.label}</div>
                    <div className="text-sm font-semibold text-zinc-200">
                      {item.value}
                    </div>
                  </div>
                )
            )}
          </div>
        )}

        {/* Estimates if available */}
        {(deal.estimated_arv || deal.estimated_rehab || deal.estimated_profit) && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-zinc-900/60 rounded-lg p-3">
              <div className="text-[10px] text-zinc-500">EST. ARV</div>
              <div className="text-sm font-bold text-zinc-100">
                {fmt(deal.estimated_arv)}
              </div>
            </div>
            <div className="bg-zinc-900/60 rounded-lg p-3">
              <div className="text-[10px] text-zinc-500">EST. REHAB</div>
              <div className="text-sm font-bold text-zinc-100">
                {fmt(deal.estimated_rehab)}
              </div>
            </div>
            <div className="bg-zinc-900/60 rounded-lg p-3">
              <div className="text-[10px] text-zinc-500">EST. PROFIT</div>
              <div className="text-sm font-bold text-emerald-400">
                {fmt(deal.estimated_profit)}
              </div>
            </div>
          </div>
        )}

        {/* Listing URL input */}
        <div className="px-4 mb-2">
          <label className="block text-xs text-zinc-500 mb-1">
            Zillow / Redfin Link{" "}
            <span className="text-zinc-700">(optional â improves analysis accuracy)</span>
          </label>
          <input
            value={listingUrl}
            onChange={(e) => setListingUrl(e.target.value)}
            placeholder="https://www.zillow.com/homedetails/..."
            className="w-full py-2.5 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
          />
          {listingUrl && (
            <p className="text-[10px] text-emerald-500 mt-1">
              \u2713 Listing data will be included in AI analysis
            </p>
          )}
        </div>

        {/* AI Analysis button */}
        <button
          onClick={runAnalysis}
          disabled={analyzing}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-semibold text-sm disabled:opacity-50"
        >
          {analyzing
            ? "Analyzing..."
            : analysisResult
            ? "Re-run AI Analysis"
            : "Run AI Analysis"}
        </button>

        {/* Analysis Results */}
        {loadingAnalysis ? (
          <Spinner />
        ) : analysisResult ? (
          <div className="space-y-4">
            {/* Verdict */}
            <div
              className={`p-4 rounded-xl border ${
                verdictColors[analysisResult.verdict] || verdictColors["MAYBE"]
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-black">
                  {analysisResult.verdict}
                </span>
                <span className="text-xs opacity-70">
                  Risk: {analysisResult.risk_level}
                </span>
              </div>
              <p className="text-sm opacity-90">{analysisResult.summary}</p>
            </div>

            {/* Key numbers */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-900/60 rounded-lg p-3">
                <div className="text-[10px] text-zinc-500">BASE PROFIT</div>
                <div className="text-sm font-bold text-zinc-100">
                  {fmt(analysisResult.base_case_profit)}
                </div>
              </div>
              <div className="bg-zinc-900/60 rounded-lg p-3">
                <div className="text-[10px] text-zinc-500">BASE ROI</div>
                <div className="text-sm font-bold text-zinc-100">
                  {analysisResult.base_case_roi != null
                    ? `${Math.round(analysisResult.base_case_roi)}%`
                    : "Ã¢ÂÂ"}
                </div>
              </div>
              <div className="bg-zinc-900/60 rounded-lg p-3">
                <div className="text-[10px] text-zinc-500">MAX PURCHASE</div>
                <div className="text-sm font-bold text-amber-400">
                  {fmt(analysisResult.max_purchase_price)}
                </div>
              </div>
              <div className="bg-zinc-900/60 rounded-lg p-3">
                <div className="text-[10px] text-zinc-500">AI ARV</div>
                <div className="text-sm font-bold text-zinc-100">
                  {fmt(analysisResult.estimated_arv)}
                </div>
              </div>
            </div>

            {/* 9-cell profit matrix */}
            {analysisResult.profit_matrix && (
              <div>
                <h3 className="text-xs font-semibold text-zinc-400 mb-2">
                  PROFIT MATRIX
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-zinc-500">
                        <th className="text-left p-1.5"></th>
                        <th className="p-1.5">Light</th>
                        <th className="p-1.5">Moderate</th>
                        <th className="p-1.5">Heavy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {["best", "base", "worst"].map((scenario) => (
                        <tr key={scenario}>
                          <td className="p-1.5 text-zinc-500 capitalize font-medium">
                            {scenario}
                          </td>
                          {["light", "moderate", "heavy"].map((rehab) => {
                            const key = `${scenario}_${rehab}`;
                            const cell = analysisResult.profit_matrix[key];
                            if (!cell) return <td key={key} className="p-1.5">Ã¢ÂÂ</td>;
                            return (
                              <td
                                key={key}
                                className={`p-1.5 rounded text-center font-mono ${cellColor(
                                  cell.color
                                )}`}
                              >
                                {fmt(cell.profit)}
                                <br />
                                <span className="text-[9px] opacity-70">
                                  {cell.roi}%
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Risk tests */}
            {analysisResult.risk_tests && analysisResult.risk_tests.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-zinc-400 mb-2">
                  RISK TESTS
                </h3>
                <div className="space-y-1.5">
                  {analysisResult.risk_tests.map((test: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 bg-zinc-900/40 rounded-lg p-2.5"
                    >
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          test.rating === "PASS"
                            ? "bg-emerald-900/50 text-emerald-400"
                            : test.rating === "WARN"
                            ? "bg-amber-900/50 text-amber-400"
                            : "bg-red-900/50 text-red-400"
                        }`}
                      >
                        {test.rating}
                      </span>
                      <div className="flex-1">
                        <span className="text-xs font-medium text-zinc-300">
                          {test.name}
                        </span>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          {test.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Kill zones */}
            {analysisResult.kill_zones && (
              <div>
                <h3 className="text-xs font-semibold text-zinc-400 mb-2">
                  KILL ZONES
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-red-900/20 border border-red-900/30 rounded-lg p-2.5">
                    <div className="text-[10px] text-red-400/70">
                      MAX BUY FOR $30K PROFIT
                    </div>
                    <div className="text-sm font-bold text-red-300">
                      {fmt(analysisResult.kill_zones.max_purchase_for_30k)}
                    </div>
                  </div>
                  <div className="bg-red-900/20 border border-red-900/30 rounded-lg p-2.5">
                    <div className="text-[10px] text-red-400/70">
                      ARV FLOOR (BREAKEVEN)
                    </div>
                    <div className="text-sm font-bold text-red-300">
                      {fmt(analysisResult.kill_zones.arv_floor_breakeven)}
                    </div>
                  </div>
                  <div className="bg-red-900/20 border border-red-900/30 rounded-lg p-2.5">
                    <div className="text-[10px] text-red-400/70">
                      REHAB CAP ($20K PROFIT)
                    </div>
                    <div className="text-sm font-bold text-red-300">
                      {fmt(analysisResult.kill_zones.rehab_ceiling_20k_profit)}
                    </div>
                  </div>
                  <div className="bg-red-900/20 border border-red-900/30 rounded-lg p-2.5">
                    <div className="text-[10px] text-red-400/70">
                      MAX HOLD MONTHS
                    </div>
                    <div className="text-sm font-bold text-red-300">
                      {analysisResult.kill_zones.max_hold_months || "Ã¢ÂÂ"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Conditions & Missing data */}
            {analysisResult.conditions?.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-zinc-400 mb-1">
                  CONDITIONS
                </h3>
                <ul className="text-xs text-zinc-400 space-y-0.5">
                  {analysisResult.conditions.map((c: string, i: number) => (
                    <li key={i}>Ã¢ÂÂ¢ {c}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysisResult.missing_data?.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-zinc-400 mb-1">
                  MISSING DATA
                </h3>
                <ul className="text-xs text-amber-400/70 space-y-0.5">
                  {analysisResult.missing_data.map((m: string, i: number) => (
                    <li key={i}>Ã¢ÂÂ  {m}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}

        {/* Action buttons */}
        {deal.status !== "won" && deal.status !== "passed" && deal.status !== "dead" && (
          <div className="space-y-2 pt-2">
            {!showOfferForm && !showPassForm && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowOfferForm(true)}
                  className="py-3 rounded-xl bg-purple-600 text-white font-semibold text-sm"
                >
                  Make Offer
                </button>
                <button
                  onClick={() => setShowPassForm(true)}
                  className="py-3 rounded-xl bg-zinc-800 text-zinc-300 font-semibold text-sm border border-zinc-700"
                >
                  Pass
                </button>
              </div>
            )}

            {showOfferForm && (
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
                <label className="block text-xs font-medium text-zinc-400">
                  Offer Amount
                </label>
                <input
                  type="number"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder="140000"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={makeOffer}
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-sm"
                  >
                    Submit Offer
                  </button>
                  <button
                    onClick={() => setShowOfferForm(false)}
                    className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-400 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {showPassForm && (
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
                <label className="block text-xs font-medium text-zinc-400">
                  Reason for passing
                </label>
                <textarea
                  value={passReason}
                  onChange={(e) => setPassReason(e.target.value)}
                  placeholder="Numbers don't work, too much rehab..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={passDeal}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-700 text-zinc-200 font-semibold text-sm"
                  >
                    Confirm Pass
                  </button>
                  <button
                    onClick={() => setShowPassForm(false)}
                    className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-400 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Promote to active deal */}
        {deal.status === "offer_made" && (
          <button
            onClick={promoteDeal}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm"
          >
            Won Ã¢ÂÂ Promote to Active Flips
          </button>
        )}

        {/* Notes section */}
        <div className="pt-2">
          <h3 className="text-xs font-semibold text-zinc-400 mb-2">NOTES</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note..."
              className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm"
              onKeyDown={(e) => e.key === "Enter" && addNote()}
            />
            <button
              onClick={addNote}
              className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm"
            >
              Add
            </button>
          </div>
          <div className="space-y-2">
            {notes.map((note: any) => (
              <div
                key={note.id}
                className="bg-zinc-900/40 rounded-lg p-2.5"
              >
                <p className="text-xs text-zinc-300">{note.content}</p>
                <p className="text-[10px] text-zinc-600 mt-1">
                  {note.author} ÃÂ·{" "}
                  {new Date(note.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
