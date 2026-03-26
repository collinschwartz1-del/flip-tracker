"use client";

import { useState } from "react";
import type { AnalysisResultV2, ConfidenceLevel, PipelineDeal } from "@/lib/types";
import type {
  MatrixResult, KillZones, CellResult, OpportunityCost, FlipCalculatorInputs,
} from "@/lib/flip-calculator";
import { ConfidenceTag, DataGapBadge } from "@/components/ConfidenceTag";
import { getEnrichmentContext, getEffectiveConfidence, getEffectiveTier } from "@/lib/confidence-engine";

// ---- Props ----
interface AnalysisViewerProps {
  aiData: AnalysisResultV2;
  matrix: MatrixResult;
  killZones: KillZones;
  financing: { hardMoney: CellResult; allCash: CellResult };
  oppCost: OpportunityCost;
  calcInputs: FlipCalculatorInputs;
  deal: PipelineDeal;
}

// ---- Shared Sub-Components ----

function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-zinc-900/80 border border-zinc-800/60 rounded-xl p-4 mb-3 ${className}`}>
      {title && <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2.5">{title}</p>}
      {children}
    </div>
  );
}

function Mono({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-mono ${className}`}>{children}</span>;
}

function Badge({ text, variant }: { text: string; variant: "green" | "amber" | "red" | "blue" | "gray" }) {
  const colors = {
    green: "bg-emerald-500/12 text-emerald-400",
    amber: "bg-amber-500/12 text-amber-400",
    red: "bg-red-500/12 text-red-400",
    blue: "bg-blue-500/12 text-blue-400",
    gray: "bg-zinc-500/12 text-zinc-400",
  };
  return <span className={`px-2.5 py-0.5 rounded text-xs font-semibold tracking-wide ${colors[variant]}`}>{text}</span>;
}

const fmt = (n: number | null | undefined) =>
  n != null ? `$${Math.round(n).toLocaleString()}` : "—";
const pct = (n: number | null | undefined) =>
  n != null ? `${Math.round(n * 10) / 10}%` : "—";

function severityVariant(s: string): "green" | "amber" | "red" | "gray" {
  if (s === "LOW") return "green";
  if (s === "MEDIUM") return "amber";
  if (s === "HIGH" || s === "CRITICAL") return "red";
  return "gray";
}

function profitColor(p: number): string {
  if (p > 30000) return "text-emerald-400";
  if (p > 10000) return "text-amber-400";
  return "text-red-400";
}

function cellBg(color: string): string {
  if (color === "green") return "bg-emerald-900/30 border-emerald-800/40";
  if (color === "amber") return "bg-amber-900/30 border-amber-800/40";
  return "bg-red-900/30 border-red-800/40";
}

// ---- Tab 1: Overview ----
function TabOverview({ aiData, deal }: AnalysisViewerProps) {
  const ctx = getEnrichmentContext(deal, 0);
  const { tier, upgrades } = getEffectiveTier(aiData.data_tier.tier, ctx);
  const pp = aiData.property_profile;
  const tierColor = tier === "Tier 3" ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5";

  return (
    <div className="space-y-3">
      {upgrades.length > 0 && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">Data Upgraded Since Analysis</p>
          {upgrades.map((u, i) => <p key={i} className="text-[11px] text-zinc-400">✓ {u}</p>)}
        </div>
      )}
      <Card title="Property Profile">
        <p className="text-sm font-semibold text-zinc-100 mb-1">{pp.address}</p>
        <div className="grid grid-cols-4 gap-2 mb-2">
          {pp.beds != null && <div className="text-center"><div className="text-[10px] text-zinc-500">Beds</div><div className="text-sm font-bold text-zinc-200">{pp.beds}</div></div>}
          {pp.baths != null && <div className="text-center"><div className="text-[10px] text-zinc-500">Baths</div><div className="text-sm font-bold text-zinc-200">{pp.baths}</div></div>}
          {pp.sqft != null && <div className="text-center"><div className="text-[10px] text-zinc-500">SqFt</div><div className="text-sm font-bold text-zinc-200">{pp.sqft.toLocaleString()}</div></div>}
          {pp.year_built != null && <div className="text-center"><div className="text-[10px] text-zinc-500">Year</div><div className="text-sm font-bold text-zinc-200">{pp.year_built}</div></div>}
        </div>
        <p className="text-xs text-zinc-400 mb-1"><span className="text-zinc-500">Type:</span> {pp.property_type} · <span className="text-zinc-500">Lot:</span> {pp.lot_size || "Unknown"}</p>
        <p className="text-xs text-zinc-400">{pp.condition_notes}</p>
        {pp.key_features.length > 0 && <p className="text-[11px] text-zinc-500 mt-1">Features: {pp.key_features.join(", ")}</p>}
        {pp.red_flags.length > 0 && (
          <div className="mt-2">{pp.red_flags.map((f, i) => <p key={i} className="text-[11px] text-red-400">⚠ {f}</p>)}</div>
        )}
      </Card>

      <Card title="Deal Numbers">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Asking Price</span>
            <span><Mono className="text-zinc-100">{fmt(deal.asking_price)}</Mono><ConfidenceTag level="USER_PROVIDED" /></span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Claimed ARV</span>
            <span><Mono className="text-zinc-100">{deal.estimated_arv ? fmt(deal.estimated_arv) : "NOT PROVIDED"}</Mono><ConfidenceTag level={deal.estimated_arv ? "USER_PROVIDED" : "ASSUMED"} /></span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Independent ARV</span>
            <span><Mono className="text-zinc-100">{fmt(aiData.arv_validation.independent_arv_base)}</Mono><ConfidenceTag level={getEffectiveConfidence("arv", aiData.arv_validation.source, ctx)} /></span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Rehab (Moderate)</span>
            <span><Mono className="text-zinc-100">{fmt(aiData.rehab_assessment.moderate.cost)}</Mono><ConfidenceTag level={getEffectiveConfidence("rehab", aiData.field_confidence.rehab as ConfidenceLevel, ctx)} /></span>
          </div>
        </div>
      </Card>

      <div className={`border rounded-xl p-3 ${tierColor}`}>
        <div className="flex items-center gap-2 mb-2">
          <Badge text={tier} variant={tier === "Tier 3" ? "green" : "amber"} />
          <Badge text={aiData.data_tier.confidence} variant={severityVariant(aiData.data_tier.confidence === "HIGH" ? "LOW" : aiData.data_tier.confidence === "LOW" ? "HIGH" : "MEDIUM")} />
        </div>
        <div className="grid grid-cols-2 gap-1">
          {aiData.data_tier.present.map((p, i) => <p key={i} className="text-[11px] text-emerald-400">✅ {p}</p>)}
        </div>
      </div>

      {aiData.data_tier.missing.length > 0 && (
        <Card title="Missing Data — Kill Gates">
          <div className="space-y-2">
            {[...aiData.data_tier.missing].sort((a, b) => {
              const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
              return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
            }).map((m, i) => (
              <div key={i} className="bg-zinc-800/50 rounded-lg p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <Badge text={m.severity} variant={m.severity === "CRITICAL" ? "red" : m.severity === "HIGH" ? "red" : "amber"} />
                  <span className="text-xs font-medium text-zinc-200">{m.item}</span>
                </div>
                <p className="text-[11px] text-zinc-500">{m.how_to_fix}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ---- Tab 2: Market & Comps ----
function TabComps({ aiData, deal }: AnalysisViewerProps) {
  const ctx = getEnrichmentContext(deal, 0);
  const compSource = aiData.comps.source;
  const isVerified = compSource === "MLS_VERIFIED";

  return (
    <div className="space-y-3">
      <div className={`rounded-xl p-2.5 text-center text-xs font-bold ${isVerified ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
        COMP SOURCE: {isVerified ? "MLS VERIFIED" : "WEB SEARCH — UNVERIFIED"}
      </div>

      <Card title="Comparable Sales">
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-[11px] min-w-[600px]">
            <thead><tr className="text-zinc-500 border-b border-zinc-800">
              <th className="text-left p-1.5 sticky left-0 bg-zinc-900/80">Address</th>
              <th className="p-1.5 text-right">Price</th>
              <th className="p-1.5 text-right">$/SF</th>
              <th className="p-1.5">Bd/Ba</th>
              <th className="p-1.5 text-right">SF</th>
              <th className="p-1.5">Cond.</th>
              <th className="p-1.5 text-right">DOM</th>
              <th className="p-1.5">Date</th>
              <th className="p-1.5">Source</th>
            </tr></thead>
            <tbody>
              {aiData.comps.entries.map((c, i) => (
                <tr key={i} className="border-b border-zinc-800/50">
                  <td className="p-1.5 text-zinc-200 sticky left-0 bg-zinc-900/80">{c.address}</td>
                  <td className="p-1.5 text-right font-mono text-zinc-200">{c.sale_price ? fmt(c.sale_price) : "—"}</td>
                  <td className="p-1.5 text-right font-mono text-zinc-300">{c.price_per_sf ? `$${c.price_per_sf}` : "—"}</td>
                  <td className="p-1.5 text-zinc-400">{c.beds || "?"}/{c.baths || "?"}</td>
                  <td className="p-1.5 text-right text-zinc-400">{c.sqft?.toLocaleString() || "?"}</td>
                  <td className="p-1.5">
                    <Badge text={c.condition || "Unknown"} variant={c.condition === "Renovated" ? "green" : c.condition === "As-Is" ? "amber" : "gray"} />
                  </td>
                  <td className="p-1.5 text-right text-zinc-400">{c.dom ?? "—"}</td>
                  <td className="p-1.5 text-zinc-500">{c.sale_date || "—"}</td>
                  <td className="p-1.5"><ConfidenceTag level={c.source} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="ARV Validation">
        <p className="text-xs text-zinc-400 mb-2">{aiData.arv_validation.methodology}</p>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="text-center bg-zinc-800/50 rounded-lg p-2">
            <div className="text-[10px] text-zinc-500">LOW</div>
            <div className="text-sm font-bold font-mono text-zinc-300">{fmt(aiData.arv_validation.independent_arv_low)}</div>
          </div>
          <div className="text-center bg-zinc-800/50 rounded-lg p-2 border border-amber-500/20">
            <div className="text-[10px] text-amber-400">BASE</div>
            <div className="text-sm font-bold font-mono text-zinc-100">{fmt(aiData.arv_validation.independent_arv_base)}</div>
          </div>
          <div className="text-center bg-zinc-800/50 rounded-lg p-2">
            <div className="text-[10px] text-zinc-500">HIGH</div>
            <div className="text-sm font-bold font-mono text-zinc-300">{fmt(aiData.arv_validation.independent_arv_high)}</div>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-zinc-500">Median Renovated $/SF</span>
          <span><Mono className="text-zinc-200">${aiData.arv_validation.median_renovated_psf}</Mono><ConfidenceTag level={getEffectiveConfidence("arv", aiData.arv_validation.source, ctx)} /></span>
        </div>
        {aiData.arv_validation.seller_arv && (
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-zinc-500">Seller ARV Assessment</span>
            <Badge text={aiData.arv_validation.seller_arv_assessment} variant={aiData.arv_validation.seller_arv_assessment === "Aligns" ? "green" : "red"} />
          </div>
        )}
        {aiData.arv_validation.constraints.length > 0 && (
          <div className="mt-2">{aiData.arv_validation.constraints.map((c, i) => <p key={i} className="text-[11px] text-amber-400/80">⚠ {c}</p>)}</div>
        )}
      </Card>

      <Card title="Market Indicators">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Median Price", value: fmt(aiData.market_snapshot.median_price) },
            { label: "$/SF", value: `$${aiData.market_snapshot.price_per_sf}` },
            { label: "Avg DOM", value: `${aiData.market_snapshot.avg_dom}` },
            { label: "YoY Change", value: `${aiData.market_snapshot.yoy_change_pct > 0 ? "+" : ""}${aiData.market_snapshot.yoy_change_pct}%` },
            { label: "Market Type", value: aiData.market_snapshot.market_type },
            { label: "Active Listings", value: `${aiData.market_snapshot.active_competition}` },
          ].map((m, i) => (
            <div key={i} className="bg-zinc-800/50 rounded-lg p-2 text-center">
              <div className="text-[10px] text-zinc-500">{m.label}</div>
              <div className="text-xs font-bold font-mono text-zinc-200">{m.value}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-zinc-400 mt-2">{aiData.market_snapshot.notes}</p>
      </Card>
    </div>
  );
}

// ---- Tab 3: Rehab ----
function TabRehab({ aiData, matrix, calcInputs }: AnalysisViewerProps) {
  const rehab = aiData.rehab_assessment;
  const scenarios = [
    { key: "light" as const, label: "LIGHT", color: "border-t-emerald-500", cell: matrix.cells["light_base"] },
    { key: "moderate" as const, label: "MODERATE", color: "border-t-amber-500", cell: matrix.cells["moderate_base"] },
    { key: "heavy" as const, label: "HEAVY", color: "border-t-red-500", cell: matrix.cells["heavy_base"] },
  ];

  return (
    <div className="space-y-3">
      {!rehab.photos_available && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 text-center text-xs font-bold text-red-400">
          NO PHOTOS — REHAB ESTIMATE UNVERIFIED
        </div>
      )}
      <div className="flex items-center gap-2 mb-1">
        <Badge text={`Confidence: ${rehab.confidence}`} variant={severityVariant(rehab.confidence === "HIGH" ? "LOW" : rehab.confidence === "LOW" ? "HIGH" : "MEDIUM")} />
      </div>
      <p className="text-[11px] text-zinc-500">{rehab.confidence_note}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {scenarios.map(({ key, label, color, cell }) => {
          const s = rehab[key];
          return (
            <div key={key} className={`bg-zinc-900/80 border border-zinc-800/60 rounded-xl overflow-hidden border-t-2 ${color}`}>
              <div className="p-3">
                <p className="text-xs font-bold text-zinc-300 mb-2">{label}</p>
                <p className="text-[11px] text-zinc-500 mb-3">{s.scope}</p>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between"><span className="text-zinc-500">Base Cost</span><Mono className="text-zinc-300">{fmt(s.cost)}</Mono></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Contingency ({Math.round(s.contingency_pct * 100)}%)</span><Mono className="text-zinc-300">{fmt(s.cost * s.contingency_pct)}</Mono></div>
                  <div className="flex justify-between border-t border-zinc-800 pt-1"><span className="text-zinc-400 font-medium">Total Rehab</span><Mono className="text-zinc-100 font-bold">{fmt(cell?.rehabTotal)}</Mono></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Timeline</span><span className="text-zinc-300">{s.timeline_weeks} weeks</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Holding Costs</span><Mono className="text-zinc-300">{fmt(cell?.totalHoldingCosts)}</Mono></div>
                  <div className="flex justify-between border-t border-zinc-800 pt-1"><span className="text-zinc-400 font-medium">Total Project</span><Mono className="text-zinc-100 font-bold">{fmt(cell?.totalInvestment)}</Mono></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Tab 4: Exit ----
function TabExit({ aiData, matrix, calcInputs }: AnalysisViewerProps) {
  const exits = [
    { label: "BEST", color: "border-t-emerald-500", cell: matrix.cells["moderate_best"] },
    { label: "BASE", color: "border-t-amber-500", cell: matrix.cells["moderate_base"] },
    { label: "WORST", color: "border-t-red-500", cell: matrix.cells["moderate_worst"] },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {exits.map(({ label, color, cell }) => (
        <div key={label} className={`bg-zinc-900/80 border border-zinc-800/60 rounded-xl overflow-hidden border-t-2 ${color}`}>
          <div className="p-3">
            <p className="text-xs font-bold text-zinc-300 mb-3">{label} EXIT</p>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between"><span className="text-zinc-500">Gross Sale (ARV)</span><Mono className="text-zinc-200">{fmt(cell.grossSalePrice)}</Mono></div>
              <div className="flex justify-between"><span className="text-zinc-500">Marketing</span><span className="text-zinc-300">{cell.marketingMonths} mo</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Sell Costs (8%)</span><Mono className="text-red-400">-{fmt(cell.sellCosts)}</Mono></div>
              <div className="flex justify-between"><span className="text-zinc-500">Concessions</span><Mono className="text-red-400">-{fmt(cell.concessions)}</Mono></div>
              <div className="flex justify-between border-t border-zinc-800 pt-1 mt-1">
                <span className="text-zinc-300 font-medium">Net Proceeds</span>
                <Mono className="text-zinc-100 font-bold">{fmt(cell.netProceeds)}</Mono>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Tab 5: 9-Cell Matrix ----
function TabMatrix({ matrix }: AnalysisViewerProps) {
  const [selectedCell, setSelectedCell] = useState<CellResult | null>(null);
  const rehabRows = ["light", "moderate", "heavy"];
  const exitCols = ["best", "base", "worst"];

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full min-w-[420px]">
          <thead><tr className="text-[10px] text-zinc-500">
            <th className="p-1.5 text-left"></th>
            <th className="p-1.5 text-center">Best Exit</th>
            <th className="p-1.5 text-center">Base Exit</th>
            <th className="p-1.5 text-center">Worst Exit</th>
          </tr></thead>
          <tbody>
            {rehabRows.map(r => (
              <tr key={r}>
                <td className="p-1.5 text-[10px] text-zinc-500 capitalize font-medium">{r}</td>
                {exitCols.map(e => {
                  const cell = matrix.cells[`${r}_${e}`];
                  if (!cell) return <td key={e} className="p-1.5">—</td>;
                  return (
                    <td key={e} className="p-1">
                      <button
                        onClick={() => setSelectedCell(cell)}
                        className={`w-full rounded-lg border p-2 text-center cursor-pointer hover:opacity-80 ${cellBg(cell.color)}`}
                      >
                        <div className={`text-sm font-bold font-mono ${profitColor(cell.grossProfit)}`}>{fmt(cell.grossProfit)}</div>
                        <div className="text-[10px] text-zinc-400 font-mono">{pct(cell.roi)} ROI</div>
                        <div className="text-[9px] text-zinc-500">{Math.round(cell.totalMonths * 10) / 10}mo · ${Math.round(cell.dollarPerHour)}/hr</div>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedCell && (
        <Card title={`${selectedCell.rehabScenario.toUpperCase()} REHAB × ${selectedCell.exitScenario.toUpperCase()} EXIT — Detail`}>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between"><span className="text-zinc-500">Purchase</span><Mono className="text-zinc-300">{fmt(selectedCell.purchasePrice)}</Mono></div>
            <div className="flex justify-between"><span className="text-zinc-500">Buy Closing</span><Mono className="text-zinc-300">{fmt(selectedCell.buyClosing)}</Mono></div>
            <div className="flex justify-between"><span className="text-zinc-500">Rehab + Contingency</span><Mono className="text-zinc-300">{fmt(selectedCell.rehabTotal)}</Mono></div>
            <div className="flex justify-between"><span className="text-zinc-500">Loan Points</span><Mono className="text-zinc-300">{fmt(selectedCell.loanPoints)}</Mono></div>
            <div className="flex justify-between"><span className="text-zinc-500">Holding ({Math.round(selectedCell.totalMonths * 10) / 10}mo)</span><Mono className="text-zinc-300">{fmt(selectedCell.totalHoldingCosts)}</Mono></div>
            <div className="flex justify-between border-t border-zinc-800 pt-1"><span className="text-zinc-400 font-medium">Total Investment</span><Mono className="text-zinc-100 font-bold">{fmt(selectedCell.totalInvestment)}</Mono></div>
            <div className="flex justify-between mt-2"><span className="text-zinc-500">Gross Sale</span><Mono className="text-zinc-300">{fmt(selectedCell.grossSalePrice)}</Mono></div>
            <div className="flex justify-between"><span className="text-zinc-500">Sell Costs + Concessions</span><Mono className="text-red-400">-{fmt(selectedCell.sellCosts + selectedCell.concessions)}</Mono></div>
            <div className="flex justify-between border-t border-zinc-800 pt-1"><span className="text-zinc-400 font-medium">Net Proceeds</span><Mono className="text-zinc-100 font-bold">{fmt(selectedCell.netProceeds)}</Mono></div>
            <div className={`flex justify-between border-t border-zinc-800 pt-1 text-sm font-bold`}>
              <span className="text-zinc-300">PROFIT</span><Mono className={profitColor(selectedCell.grossProfit)}>{fmt(selectedCell.grossProfit)}</Mono>
            </div>
            <div className="flex justify-between"><span className="text-zinc-500">Cash Invested</span><Mono className="text-zinc-300">{fmt(selectedCell.cashInvested)}</Mono></div>
            <div className="flex justify-between"><span className="text-zinc-500">ROI</span><Mono className="text-zinc-300">{pct(selectedCell.roi)}</Mono></div>
            <div className="flex justify-between"><span className="text-zinc-500">Annualized ROI</span><Mono className="text-zinc-300">{pct(selectedCell.annualizedRoi)}</Mono></div>
            <div className="flex justify-between"><span className="text-zinc-500">$/Hour (200hr)</span><Mono className="text-zinc-300">${Math.round(selectedCell.dollarPerHour)}</Mono></div>
          </div>
          <button onClick={() => setSelectedCell(null)} className="mt-3 text-xs text-zinc-500 underline">Close detail</button>
        </Card>
      )}
    </div>
  );
}

// ---- Tab 6: Financing ----
function TabFinancing({ financing }: AnalysisViewerProps) {
  const { hardMoney: hm, allCash: ac } = financing;
  const rows = [
    { label: "Capital Deployed", hm: fmt(hm.cashInvested), ac: fmt(ac.cashInvested) },
    { label: "Loan Amount", hm: fmt(hm.purchasePrice * 0.9), ac: "—" },
    { label: "Equity Required", hm: fmt(hm.purchasePrice * 0.1), ac: fmt(ac.purchasePrice) },
    { label: "Origination Points", hm: fmt(hm.loanPoints), ac: "—" },
    { label: "Monthly Interest", hm: fmt(hm.monthlyLoanInterest), ac: "—" },
    { label: "Total Interest", hm: fmt(hm.monthlyLoanInterest * hm.totalMonths), ac: "—" },
    { label: "Profit", hm: fmt(hm.grossProfit), ac: fmt(ac.grossProfit) },
    { label: "ROI on Cash", hm: pct(hm.roi), ac: pct(ac.roi) },
    { label: "Annualized ROI", hm: pct(hm.annualizedRoi), ac: pct(ac.annualizedRoi) },
  ];

  return (
    <div className="space-y-3">
      <Card title="Hard Money vs All Cash — Base Case">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="text-zinc-500 border-b border-zinc-800">
              <th className="text-left p-1.5"></th>
              <th className="p-1.5 text-right">Hard Money</th>
              <th className="p-1.5 text-right">All Cash</th>
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-zinc-800/40">
                  <td className="p-1.5 text-zinc-400">{r.label}</td>
                  <td className="p-1.5 text-right font-mono text-zinc-200">{r.hm}</td>
                  <td className="p-1.5 text-right font-mono text-zinc-200">{r.ac}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-[11px] text-zinc-600 italic">Hard money amplifies returns when the deal works, and amplifies losses when it doesn't. The question is conviction level.</p>
    </div>
  );
}

// ---- Tab 7: Risk ----
function TabRisk({ aiData, oppCost }: AnalysisViewerProps) {
  return (
    <div className="space-y-2">
      {aiData.risk_tests.map((r, i) => (
        <Card key={i}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold text-zinc-200">{r.name}</span>
            <Badge text={r.rating} variant={severityVariant(r.rating)} />
            {r.data_gap && <DataGapBadge />}
          </div>
          <p className="text-[11px] text-zinc-400 mb-1">{r.detail}</p>
          {r.cost_impact && <p className="text-[10px] text-amber-400/70">Cost impact: {r.cost_impact}</p>}
        </Card>
      ))}

      <Card title="Opportunity Cost">
        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between"><span className="text-zinc-500">Capital at Risk (HM)</span><Mono className="text-zinc-300">{fmt(oppCost.baseProfit ? (oppCost.riskFreeReturn / 0.05 * 12 / (oppCost.baseProfit > 0 ? 1 : 1)) : 0)}</Mono></div>
          <div className="flex justify-between"><span className="text-zinc-500">Risk-Free Return (5% APY)</span><Mono className="text-zinc-300">{fmt(oppCost.riskFreeReturn)}</Mono></div>
          <div className="flex justify-between"><span className="text-zinc-500">Base Case Profit</span><Mono className="text-zinc-200">{fmt(oppCost.baseProfit)}</Mono></div>
          <div className="flex justify-between"><span className="text-zinc-500">Hurdle Multiple</span><Mono className="text-zinc-200">{oppCost.hurdleMultiple}x</Mono></div>
          <div className={`text-xs font-semibold mt-2 ${oppCost.exceedsHurdle ? "text-emerald-400" : "text-amber-400"}`}>
            {oppCost.exceedsHurdle ? "✓ Exceeds 3x risk-free hurdle" : "⚠ Does not exceed 3x hurdle"}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ---- Tab 8: Kill Zones ----
function TabKillZones({ killZones, matrix, deal }: AnalysisViewerProps) {
  const baseProfit = matrix.baseCase.grossProfit;
  const marginToKill = deal.asking_price - killZones.maxPurchaseFor30kProfit;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-zinc-900/80 border border-amber-800/40 rounded-xl p-3">
          <div className="text-[10px] text-amber-400/70">MAX BUY FOR $30K PROFIT</div>
          <div className="text-lg font-bold font-mono text-amber-400">{fmt(killZones.maxPurchaseFor30kProfit)}</div>
          <p className="text-[10px] text-zinc-600">Moderate rehab, base exit</p>
        </div>
        <div className="bg-zinc-900/80 border border-red-800/40 rounded-xl p-3">
          <div className="text-[10px] text-red-400/70">ARV FLOOR (BREAKEVEN)</div>
          <div className="text-lg font-bold font-mono text-red-400">{fmt(killZones.arvFloorBreakeven)}</div>
          <p className="text-[10px] text-zinc-600">Below this = losing money</p>
        </div>
        <div className="bg-zinc-900/80 border border-amber-800/40 rounded-xl p-3">
          <div className="text-[10px] text-amber-400/70">REHAB CEILING ($20K PROFIT)</div>
          <div className="text-lg font-bold font-mono text-amber-400">{fmt(killZones.rehabCeiling20kProfit)}</div>
          <p className="text-[10px] text-zinc-600">Max rehab to keep $20K</p>
        </div>
        <div className="bg-zinc-900/80 border border-amber-800/40 rounded-xl p-3">
          <div className="text-[10px] text-amber-400/70">MAX HOLD PERIOD</div>
          <div className="text-lg font-bold font-mono text-amber-400">{killZones.maxHoldMonths} mo</div>
          <p className="text-[10px] text-zinc-600">Before profit erodes to zero</p>
        </div>
      </div>

      <Card title="Where This Deal Sits">
        <p className="text-[11px] text-zinc-400">
          {marginToKill > 0
            ? `At the asking price of ${fmt(deal.asking_price)}, you're ${fmt(marginToKill)} ABOVE the max purchase for a $30K profit. You'd need to negotiate down to ${fmt(killZones.maxPurchaseFor30kProfit)} or below to hit the target.`
            : `At the asking price of ${fmt(deal.asking_price)}, you're ${fmt(Math.abs(marginToKill))} BELOW the max purchase price — there's room for the deal to work.`
          }
          {" "}The ARV needs to hold above {fmt(killZones.arvFloorBreakeven)} to break even on moderate rehab. Max hold before profit evaporates: {killZones.maxHoldMonths} months.
        </p>
      </Card>
    </div>
  );
}

// ---- Tab 9: Verdict ----
function TabVerdict({ aiData, matrix, killZones }: AnalysisViewerProps) {
  const v = aiData.verdict;
  const base = matrix.baseCase;
  const best = matrix.bestCase;
  const worst = matrix.worstCase;
  const verdictColor = v.decision === "GO" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    : v.decision === "NO-GO" ? "bg-red-500/15 text-red-400 border-red-500/30"
    : "bg-amber-500/15 text-amber-400 border-amber-500/30";

  return (
    <div className="space-y-3">
      <div className={`rounded-xl border p-4 text-center ${verdictColor}`}>
        <div className="text-2xl font-black">{v.decision}</div>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Badge text={aiData.data_tier.tier} variant={aiData.data_tier.tier === "Tier 3" ? "green" : "amber"} />
          <Badge text={aiData.data_tier.confidence} variant={aiData.data_tier.confidence === "HIGH" ? "green" : aiData.data_tier.confidence === "LOW" ? "red" : "amber"} />
        </div>
      </div>

      <Card title="Base Case Returns">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div><div className="text-[10px] text-zinc-500">Profit</div><div className={`text-sm font-bold font-mono ${profitColor(base.grossProfit)}`}>{fmt(base.grossProfit)}</div></div>
          <div><div className="text-[10px] text-zinc-500">ROI</div><div className="text-sm font-bold font-mono text-zinc-200">{pct(base.roi)}</div></div>
          <div><div className="text-[10px] text-zinc-500">$/Hour</div><div className="text-sm font-bold font-mono text-zinc-200">${Math.round(base.dollarPerHour)}</div></div>
          <div><div className="text-[10px] text-zinc-500">Timeline</div><div className="text-sm font-bold font-mono text-zinc-200">{Math.round(base.totalMonths * 10) / 10}mo</div></div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Card title="Best Realistic">
          <div className="text-center">
            <div className={`text-lg font-bold font-mono ${profitColor(best.grossProfit)}`}>{fmt(best.grossProfit)}</div>
            <div className="text-[10px] text-zinc-500">{pct(best.roi)} ROI · {Math.round(best.totalMonths * 10) / 10}mo</div>
          </div>
        </Card>
        <Card title="Worst Realistic">
          <div className="text-center">
            <div className={`text-lg font-bold font-mono ${profitColor(worst.grossProfit)}`}>{fmt(worst.grossProfit)}</div>
            <div className="text-[10px] text-zinc-500">{pct(worst.roi)} ROI · {Math.round(worst.totalMonths * 10) / 10}mo</div>
          </div>
        </Card>
      </div>

      <Card title="This Deal Works IF AND ONLY IF">
        <div className="space-y-1.5">
          {v.conditions.map((c, i) => (
            <div key={i} className="flex gap-2 text-[11px]">
              <span className="text-amber-400 font-bold shrink-0">{i + 1}.</span>
              <span className="text-zinc-300">{c}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
        <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">MAX PURCHASE FOR $30K PROFIT</p>
        <p className="text-xl font-black font-mono text-amber-400">{fmt(killZones.maxPurchaseFor30kProfit)}</p>
      </div>

      {aiData.data_tier.missing.length > 0 && (
        <Card title="Missing Data — Do Not Commit Without">
          <div className="space-y-1.5">
            {aiData.data_tier.missing.map((m, i) => (
              <div key={i} className="flex items-start gap-2">
                <Badge text={m.severity} variant={m.severity === "CRITICAL" ? "red" : m.severity === "HIGH" ? "red" : "amber"} />
                <div>
                  <span className="text-xs text-zinc-300">{m.item}</span>
                  <p className="text-[10px] text-zinc-500">{m.how_to_fix}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {v.data_upgrade_opportunities.length > 0 && (
        <Card title="Data Upgrade Opportunities">
          <div className="space-y-2">
            {v.data_upgrade_opportunities.map((o, i) => (
              <div key={i} className="bg-zinc-800/50 rounded-lg p-2">
                <p className="text-xs text-zinc-200">{o.action}</p>
                <p className="text-[10px] text-emerald-400/70">{o.impact}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Analysis Summary">
        <p className="text-xs text-zinc-400 whitespace-pre-line">{v.summary}</p>
      </Card>
    </div>
  );
}

// ---- Main Component ----
const TABS = ["Overview", "Market & Comps", "Rehab", "Exit", "9-Cell Matrix", "Financing", "Risk", "Kill Zones", "Verdict"];

export function AnalysisViewer(props: AnalysisViewerProps) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      <div className="flex overflow-x-auto border-b border-zinc-800 bg-zinc-900/80 -mx-4 px-4">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-3.5 py-2 text-xs whitespace-nowrap border-b-2 transition-colors ${
              activeTab === i
                ? "text-amber-400 border-amber-400 font-bold"
                : "text-zinc-500 border-transparent hover:text-zinc-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="pt-4">
        {activeTab === 0 && <TabOverview {...props} />}
        {activeTab === 1 && <TabComps {...props} />}
        {activeTab === 2 && <TabRehab {...props} />}
        {activeTab === 3 && <TabExit {...props} />}
        {activeTab === 4 && <TabMatrix {...props} />}
        {activeTab === 5 && <TabFinancing {...props} />}
        {activeTab === 6 && <TabRisk {...props} />}
        {activeTab === 7 && <TabKillZones {...props} />}
        {activeTab === 8 && <TabVerdict {...props} />}
      </div>
    </div>
  );
}
