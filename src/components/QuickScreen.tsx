"use client";

export interface QuickScreenResult {
  screen_verdict: "INVESTIGATE" | "PASS" | "DEAD";
  confidence: string;
  estimated_arv_range: { low: number; mid: number; high: number };
  arv_basis: string;
  estimated_rehab_range: { light: number; moderate: number; heavy: number };
  estimated_profit_range: { best_case: number; base_case: number; worst_case: number };
  market_snapshot: { median_price: number; price_per_sf: number; avg_dom: number; trend: string };
  top_risks: string[];
  key_concern: string;
  worth_investigating_because: string;
  missing_critical_data: string[];
  comps_found: Array<{ address: string; price: number; sqft: number; beds: number; baths: number; condition: string; date: string }>;
  quick_summary: string;
}

const fmt = (n: number) => {
  if (!n || isNaN(n)) return "$0";
  return n < 0
    ? `-$${Math.abs(Math.round(n)).toLocaleString()}`
    : `$${Math.round(n).toLocaleString()}`;
};

export function QuickScreenCard({
  result,
  onRunFull,
  onRerun,
}: {
  result: QuickScreenResult;
  onRunFull: () => void;
  onRerun: () => void;
}) {
  const verdictStyles = {
    INVESTIGATE: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    PASS: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    DEAD: "bg-red-500/15 text-red-400 border-red-500/30",
  };

  const profitColor = (n: number) =>
    n >= 30000 ? "text-emerald-400" : n >= 10000 ? "text-amber-400" : "text-red-400";

  const trendColor = (t: string) =>
    t === "rising" ? "text-emerald-400" : t === "declining" ? "text-red-400" : "text-amber-400";

  return (
    <div className="space-y-3">
      {/* Verdict */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 text-center">
        <span
          className={`text-lg font-bold px-5 py-1.5 rounded-full border ${
            verdictStyles[result.screen_verdict] || verdictStyles.PASS
          }`}
        >
          {result.screen_verdict}
        </span>
        <div className="flex items-center justify-center gap-3 mt-3">
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
            Quick Screen · Confidence: {result.confidence}
          </span>
          <button onClick={onRerun} className="text-[10px] text-zinc-500 underline">
            Re-run
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
        <p className="text-sm text-zinc-300 leading-relaxed">{result.quick_summary}</p>
      </div>

      {/* Key Numbers */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">ARV (Mid)</p>
          <p className="text-base font-bold text-zinc-200 font-mono">
            {fmt(result.estimated_arv_range?.mid)}
          </p>
          <p className="text-[9px] text-zinc-600">
            {fmt(result.estimated_arv_range?.low)} – {fmt(result.estimated_arv_range?.high)}
          </p>
        </div>
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Rehab (Mod)</p>
          <p className="text-base font-bold text-zinc-200 font-mono">
            {fmt(result.estimated_rehab_range?.moderate)}
          </p>
          <p className="text-[9px] text-zinc-600">
            {fmt(result.estimated_rehab_range?.light)} – {fmt(result.estimated_rehab_range?.heavy)}
          </p>
        </div>
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Profit (Base)</p>
          <p className={`text-base font-bold font-mono ${profitColor(result.estimated_profit_range?.base_case || 0)}`}>
            {fmt(result.estimated_profit_range?.base_case)}
          </p>
          <p className="text-[9px] text-zinc-600">
            {fmt(result.estimated_profit_range?.worst_case)} – {fmt(result.estimated_profit_range?.best_case)}
          </p>
        </div>
      </div>

      {/* Market Snapshot */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Market Snapshot</p>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-[10px] text-zinc-600">Median</p>
            <p className="text-xs font-bold text-zinc-300 font-mono">{fmt(result.market_snapshot?.median_price)}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-600">$/SF</p>
            <p className="text-xs font-bold text-zinc-300 font-mono">${result.market_snapshot?.price_per_sf || 0}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-600">Avg DOM</p>
            <p className="text-xs font-bold text-zinc-300 font-mono">{result.market_snapshot?.avg_dom || 0}d</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-600">Trend</p>
            <p className={`text-xs font-bold font-mono capitalize ${trendColor(result.market_snapshot?.trend || "flat")}`}>
              {result.market_snapshot?.trend || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* ARV Basis */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">ARV Basis</p>
        <p className="text-xs text-zinc-400">{result.arv_basis}</p>
      </div>

      {/* Comps Found */}
      {result.comps_found && result.comps_found.length > 0 && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
            Comps Found ({result.comps_found.length})
          </p>
          <div className="space-y-1.5">
            {result.comps_found.map((c, i) => (
              <div key={i} className="flex justify-between items-start py-1 border-b border-zinc-800/50 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-zinc-300 truncate">{c.address}</p>
                  <p className="text-[10px] text-zinc-600">
                    {c.beds}bd/{c.baths}ba · {c.sqft}sf · {c.condition} · {c.date}
                  </p>
                </div>
                <p className="text-xs font-bold text-zinc-200 font-mono ml-2">{fmt(c.price)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Worth Investigating */}
      {result.screen_verdict === "INVESTIGATE" && result.worth_investigating_because && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
          <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Worth Investigating Because</p>
          <p className="text-xs text-zinc-400 mt-1">{result.worth_investigating_because}</p>
        </div>
      )}

      {/* Key Concern */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
        <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Key Concern</p>
        <p className="text-xs text-zinc-400 mt-1">{result.key_concern}</p>
      </div>

      {/* Top Risks */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
        <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider mb-1.5">Top Risks</p>
        {result.top_risks?.map((r, i) => (
          <p key={i} className="text-xs text-zinc-400 py-0.5">
            <span className="text-red-400 mr-1.5">{i + 1}.</span> {r}
          </p>
        ))}
      </div>

      {/* Missing Data */}
      {result.missing_critical_data && result.missing_critical_data.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
          <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider mb-1.5">
            Missing Before Committing
          </p>
          {result.missing_critical_data.map((d, i) => (
            <p key={i} className="text-[11px] text-zinc-400 py-0.5">✗ {d}</p>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-zinc-800/50 border border-zinc-700/30 rounded-xl p-3">
        <p className="text-[10px] text-zinc-600 leading-relaxed">
          This is a QUICK SCREEN — not a full analysis. Numbers are rough estimates from
          limited web search data. DO NOT make investment decisions based on this alone.
          Run a Full Analysis for investment-grade underwriting.
        </p>
      </div>

      {/* Full Analysis CTA is handled by FullAnalysisBridge component rendered below */}
    </div>
  );
}
