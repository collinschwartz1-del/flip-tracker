"use client";

import { useState, useEffect, useCallback } from "react";
import type { PipelineDeal, AIAnalysis, MLSComp, AnalysisResultV2 } from "@/lib/types";
import { PIPELINE_STATUS_CONFIG } from "@/lib/types";
import type { AppActions, ScreenParams } from "@/components/AppShell";
import { Spinner } from "@/components/ui";
import { CMAUpload } from "@/components/CMAUpload";
import { AnalysisViewer } from "@/components/AnalysisViewer";
import { buildScreeningPrompt } from "@/lib/screening-prompt";
import { QuickScreenCard, type QuickScreenResult } from "@/components/QuickScreen";
import { ImportAnalysis } from "@/components/ImportAnalysis";
import { FullAnalysisBridge } from "@/components/FullAnalysisBridge";
import {
  buildDefaultInputs, calcFullMatrix, calcKillZones,
  calcCashComparison, calcOpportunityCost,
  type MatrixResult, type KillZones as KillZonesType, type CellResult,
  type OpportunityCost as OpportunityCostType, type FlipCalculatorInputs,
} from "@/lib/flip-calculator";
import * as data from "@/lib/data";

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
  const [progress, setProgress] = useState("");

  // Quick Screen state
  const [quickScreen, setQuickScreen] = useState<QuickScreenResult | null>(null);

  // Full Analysis (imported) state
  const [fullAnalysis, setFullAnalysis] = useState<any>(null);

  // V2 analysis state (for imported full analyses)
  const [aiData, setAiData] = useState<AnalysisResultV2 | null>(null);
  const [matrix, setMatrix] = useState<MatrixResult | null>(null);
  const [killZonesData, setKillZonesData] = useState<KillZonesType | null>(null);
  const [financingData, setFinancingData] = useState<{ hardMoney: CellResult; allCash: CellResult } | null>(null);
  const [oppCost, setOppCost] = useState<OpportunityCostType | null>(null);
  const [calcInputs, setCalcInputs] = useState<FlipCalculatorInputs | null>(null);

  const hydrateV2 = useCallback((aiResult: AnalysisResultV2, savedInputs?: Record<string, any>) => {
    setAiData(aiResult);
    const inputs = savedInputs && (savedInputs as any).purchasePrice
      ? savedInputs as FlipCalculatorInputs
      : buildDefaultInputs(deal?.asking_price || 0, {
          rehabLight: aiResult.rehab_assessment.light.cost,
          rehabModerate: aiResult.rehab_assessment.moderate.cost,
          rehabHeavy: aiResult.rehab_assessment.heavy.cost,
          rehabLightWeeks: aiResult.rehab_assessment.light.timeline_weeks,
          rehabModerateWeeks: aiResult.rehab_assessment.moderate.timeline_weeks,
          rehabHeavyWeeks: aiResult.rehab_assessment.heavy.timeline_weeks,
          rehabLightScope: aiResult.rehab_assessment.light.scope,
          rehabModerateScope: aiResult.rehab_assessment.moderate.scope,
          rehabHeavyScope: aiResult.rehab_assessment.heavy.scope,
          arvBest: aiResult.arv_validation.independent_arv_high,
          arvBase: aiResult.arv_validation.independent_arv_base,
          arvWorst: aiResult.arv_validation.independent_arv_low,
          monthlyTaxes: aiResult.holding_costs.monthly_taxes,
          monthlyInsurance: aiResult.holding_costs.monthly_insurance,
          monthlyUtilities: aiResult.holding_costs.monthly_utilities,
          monthlyLawnSnow: aiResult.holding_costs.monthly_lawn_snow,
        });
    const m = calcFullMatrix(inputs);
    const kz = calcKillZones(inputs, m.baseCase);
    const fin = calcCashComparison(inputs);
    const oc = calcOpportunityCost(m.baseCase.cashInvested, m.baseCase.totalMonths, m.baseCase.grossProfit);
    setCalcInputs(inputs);
    setMatrix(m);
    setKillZonesData(kz);
    setFinancingData(fin);
    setOppCost(oc);
  }, [deal?.asking_price]);

  const loadAnalysis = useCallback(async () => {
    if (!dealId) return;
    try {
      const a = await data.getLatestAnalysis(dealId);
      setAnalysis(a);
      if (a?.analysis_result) {
        const parsed = typeof a.analysis_result === "string"
          ? JSON.parse(a.analysis_result)
          : a.analysis_result;
        setAnalysisResult(parsed);

        // Check if this is a saved quick screen result
        if (parsed._type === "quick_screen" && parsed.screen_verdict) {
          setQuickScreen(parsed as QuickScreenResult);
        }
        // Check if V2/V3 full analysis (imported or legacy V2)
        else if (parsed._version >= 2 || parsed.rehab_assessment) {
          const isV2 = parsed._version >= 2 || ((a as any).analysis_version >= 2);
          if (isV2 && parsed.rehab_assessment) {
            hydrateV2(parsed as AnalysisResultV2, parsed._calculator_inputs || (a as any).calculator_inputs);
          }
        }
        // Check if imported full analysis (v3)
        else if (parsed._version >= 3 && parsed._imported_data) {
          setFullAnalysis(parsed._imported_data);
        }
      }
    } catch (err) {
      console.error("Failed to load analysis:", err);
    } finally {
      setLoadingAnalysis(false);
    }
  }, [dealId, hydrateV2]);

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
    n != null ? `$${Math.round(n).toLocaleString()}` : "\u2014";

  // --- TIER 1: Quick Screen ---
  const handleQuickScreen = async () => {
    setAnalyzing(true);
    setProgress("Running quick screen...");
    try {
      // Save listing URL if provided
      if (listingUrl.trim()) {
        await data.updatePipelineDeal(dealId, { listing_url: listingUrl.trim() });
      }

      const prompt = buildScreeningPrompt(deal);
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Screen failed");
      }

      const respData = await res.json();
      const text = respData.content || "";
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      if (jsonStart === -1) throw new Error("No results returned");
      const result: QuickScreenResult = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
      setQuickScreen(result);

      // Save to database
      const screenWithMeta = { ...result, _type: "quick_screen", _version: 1 };
      await data.createAnalysis({
        pipeline_deal_id: dealId,
        input_data: { address: deal.address, asking_price: deal.asking_price },
        analysis_result: screenWithMeta as any,
        verdict: result.screen_verdict,
        base_case_profit: result.estimated_profit_range?.base_case || 0,
        base_case_roi: 0,
        max_purchase_price: 0,
        arv_validated: result.estimated_arv_range?.mid || 0,
        rehab_moderate: result.estimated_rehab_range?.moderate || 0,
        risk_level: result.confidence === "LOW" ? "HIGH" : result.confidence === "HIGH" ? "LOW" : "MEDIUM",
        status: "completed",
        error_message: null,
        triggered_by: userEmail,
      } as any);

      // Update deal estimates from screen
      await data.updatePipelineDeal(dealId, {
        estimated_arv: result.estimated_arv_range?.mid || deal.estimated_arv,
        estimated_rehab: result.estimated_rehab_range?.moderate || deal.estimated_rehab,
        estimated_profit: result.estimated_profit_range?.base_case || deal.estimated_profit,
      });

      await actions.refreshData();
      actions.toast("Quick screen complete!");
    } catch (err: any) {
      actions.toast(err.message || "Screen failed \u2014 try again", "error");
    }
    setAnalyzing(false);
    setProgress("");
  };

  // --- TIER 2: Full Analysis bridge is rendered as a component (FullAnalysisBridge) ---

  // --- Import Full Analysis from Claude ---
  const handleImportAnalysis = async (importedData: any) => {
    try {
      // Convert imported data to calculator inputs
      const inputs = buildDefaultInputs(deal.asking_price || 0, {
        rehabLight: importedData.rehab?.light?.cost,
        rehabModerate: importedData.rehab?.moderate?.cost,
        rehabHeavy: importedData.rehab?.heavy?.cost,
        rehabLightWeeks: importedData.rehab?.light?.weeks,
        rehabModerateWeeks: importedData.rehab?.moderate?.weeks,
        rehabHeavyWeeks: importedData.rehab?.heavy?.weeks,
        rehabLightScope: importedData.rehab?.light?.scope,
        rehabModerateScope: importedData.rehab?.moderate?.scope,
        rehabHeavyScope: importedData.rehab?.heavy?.scope,
        arvBest: importedData.arv?.independent_high || importedData.exit?.best?.arv,
        arvBase: importedData.arv?.independent_base || importedData.exit?.base?.arv,
        arvWorst: importedData.arv?.independent_low || importedData.exit?.worst?.arv,
        monthlyTaxes: importedData.holding?.monthly_taxes,
        monthlyInsurance: importedData.holding?.monthly_insurance,
        monthlyUtilities: importedData.holding?.monthly_utilities,
        monthlyLawnSnow: importedData.holding?.monthly_lawn_snow,
      });

      // Run calculator
      const m = calcFullMatrix(inputs);
      const kz = calcKillZones(inputs, m.baseCase);
      const fin = calcCashComparison(inputs);
      const oc = calcOpportunityCost(m.baseCase.cashInvested, m.baseCase.totalMonths, m.baseCase.grossProfit);

      // Save to database
      const analysisPayload = {
        ...importedData,
        _imported_data: importedData,
        _calculator_inputs: inputs,
        _version: 3,
        _type: "full_import",
      };

      await data.createAnalysis({
        pipeline_deal_id: dealId,
        input_data: { address: deal.address, asking_price: deal.asking_price },
        analysis_result: analysisPayload as any,
        verdict: importedData.verdict?.decision || "IMPORTED",
        base_case_profit: m.baseCase.grossProfit,
        base_case_roi: m.baseCase.roi / 100,
        max_purchase_price: kz.maxPurchaseFor30kProfit,
        arv_validated: importedData.arv?.independent_base || 0,
        rehab_moderate: importedData.rehab?.moderate?.cost || 0,
        risk_level: (importedData.risks || []).filter((r: any) => r.rating === "HIGH" || r.rating === "CRITICAL").length >= 3 ? "HIGH" : "MEDIUM",
        status: "completed",
        error_message: null,
        triggered_by: userEmail,
      } as any);

      // Update deal
      await data.updatePipelineDeal(dealId, {
        estimated_arv: importedData.arv?.independent_base || deal.estimated_arv,
        estimated_rehab: importedData.rehab?.moderate?.cost || deal.estimated_rehab,
        estimated_profit: m.baseCase.grossProfit,
      });

      // If imported data has rehab_assessment shape, hydrate V2 viewer
      if (importedData.rehab?.moderate?.cost && importedData.arv?.independent_base) {
        // Convert import format to V2 format for the AnalysisViewer
        const v2Shape: any = {
          rehab_assessment: {
            light: { cost: importedData.rehab.light.cost, timeline_weeks: importedData.rehab.light.weeks, scope: importedData.rehab.light.scope },
            moderate: { cost: importedData.rehab.moderate.cost, timeline_weeks: importedData.rehab.moderate.weeks, scope: importedData.rehab.moderate.scope },
            heavy: { cost: importedData.rehab.heavy.cost, timeline_weeks: importedData.rehab.heavy.weeks, scope: importedData.rehab.heavy.scope },
          },
          arv_validation: {
            independent_arv_low: importedData.arv.independent_low,
            independent_arv_base: importedData.arv.independent_base,
            independent_arv_high: importedData.arv.independent_high,
            median_psf: importedData.arv.median_psf,
          },
          holding_costs: importedData.holding || {},
          risk_tests: (importedData.risks || []).map((r: any) => ({ name: r.name, rating: r.rating, detail: r.detail })),
          verdict: importedData.verdict || {},
          comps: importedData.comps || [],
          market_snapshot: importedData.market || {},
          property_profile: importedData.deal || {},
        };
        setAiData(v2Shape as AnalysisResultV2);
        setCalcInputs(inputs);
        setMatrix(m);
        setKillZonesData(kz);
        setFinancingData(fin);
        setOppCost(oc);
      }

      setFullAnalysis({ data: importedData, calcInputs: inputs, matrix: m, killZones: kz });
      await actions.refreshData();
    } catch (err: any) {
      throw err; // Let ImportAnalysis component handle the error
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

  // Determine what analysis view to show
  const hasFullV2 = aiData && matrix && killZonesData && financingData && oppCost && calcInputs;
  const hasQuickScreen = quickScreen != null;

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800/80">
        <button
          onClick={() => actions.navigate("pipeline" as any)}
          className="text-xs text-zinc-500 mb-2 flex items-center gap-1"
        >
          \u2190 Pipeline
        </button>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-lg font-bold text-zinc-100">{deal.address}</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Ask: {fmt(deal.asking_price)} \u00b7 Source: {deal.source || "\u2014"}
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
        <div className="mb-2">
          <label className="block text-xs text-zinc-500 mb-1">
            Zillow / Redfin Link{" "}
            <span className="text-zinc-700">(optional \u2014 improves analysis accuracy)</span>
          </label>
          <input
            value={listingUrl}
            onChange={(e) => setListingUrl(e.target.value)}
            placeholder="https://www.zillow.com/homedetails/..."
            className="w-full py-2.5 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
          />
          {listingUrl && (
            <p className="text-[10px] text-emerald-500 mt-1">
              \u2713 Listing URL will be included in Claude prompt
            </p>
          )}
        </div>

        {/* CMA Comp Upload */}
        <div className="mb-3">
          <CMAUpload
            comps={deal?.cma_comps || []}
            pdfName={deal?.cma_pdf_name || ""}
            uploadedAt={deal?.cma_uploaded_at ?? null}
            onUpload={async (comps: MLSComp[], fileName: string) => {
              await data.updatePipelineDeal(dealId, {
                cma_comps: comps,
                cma_pdf_name: fileName,
                cma_uploaded_at: new Date().toISOString(),
              });
              await actions.refreshData();
              actions.toast(`${comps.length} comps extracted from CMA`);
            }}
          />
        </div>

        {/* === ANALYSIS SECTION === */}
        <div className="space-y-3">
          {/* Show Quick Screen button if no analysis yet */}
          {!hasQuickScreen && !hasFullV2 && !analyzing && (
            <button
              onClick={handleQuickScreen}
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              Quick Screen
            </button>
          )}

          {/* Loading state */}
          {analyzing && (
            <div className="w-full py-4 bg-zinc-900 border border-amber-500/30 rounded-xl text-center">
              <div className="w-6 h-6 border-2 border-zinc-600 border-t-amber-400 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-amber-400 font-medium">{progress}</p>
            </div>
          )}

          {loadingAnalysis ? (
            <Spinner />
          ) : hasFullV2 ? (
            /* Show Full Analysis (9-tab viewer) if imported or V2 hydrated */
            <AnalysisViewer
              aiData={aiData!}
              matrix={matrix!}
              killZones={killZonesData!}
              financing={financingData!}
              oppCost={oppCost!}
              calcInputs={calcInputs!}
              deal={deal}
            />
          ) : hasQuickScreen ? (
            /* Show Quick Screen results + Full Analysis bridge below */
            <>
              <QuickScreenCard
                result={quickScreen!}
                onRunFull={() => {}} // Bridge component handles this below
                onRerun={handleQuickScreen}
              />
              <FullAnalysisBridge deal={deal} toast={actions.toast} />
            </>
          ) : null}
        </div>

        {/* Import Analysis section \u2014 always visible below */}
        <div className="mb-4">
          <ImportAnalysis
            dealId={dealId}
            onImport={handleImportAnalysis}
            toast={actions.toast}
          />
        </div>

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
            Won \u2014 Promote to Active Flips
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
                  {note.author} \u00b7{" "}
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
