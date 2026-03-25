"use client";

import { useState, useMemo } from "react";
import type { PipelineDeal } from "@/lib/types";
import { PIPELINE_STATUS_CONFIG } from "@/lib/types";
import type { AppActions, ScreenParams } from "@/components/AppShell";

type FilterTab = "active" | "passed" | "won" | "all";

export function PipelineList({
  deals,
  actions,
}: {
  deals: PipelineDeal[];
  actions: AppActions;
}) {
  const [filter, setFilter] = useState<FilterTab>("active");

  const filtered = useMemo(() => {
    switch (filter) {
      case "active":
        return deals.filter((d) =>
          ["new", "analyzing", "offer_made"].includes(d.status)
        );
      case "passed":
        return deals.filter((d) => ["passed", "dead"].includes(d.status));
      case "won":
        return deals.filter((d) => d.status === "won");
      case "all":
      default:
        return deals;
    }
  }, [deals, filter]);

  const filters: { id: FilterTab; label: string; count: number }[] = [
    {
      id: "active",
      label: "Active",
      count: deals.filter((d) =>
        ["new", "analyzing", "offer_made"].includes(d.status)
      ).length,
    },
    {
      id: "passed",
      label: "Passed",
      count: deals.filter((d) => ["passed", "dead"].includes(d.status)).length,
    },
    {
      id: "won",
      label: "Won",
      count: deals.filter((d) => d.status === "won").length,
    },
    { id: "all", label: "All", count: deals.length },
  ];

  const fmt = (n: number | null) =>
    n ? `$${Math.round(n).toLocaleString()}` : "—";

  return (
    <div className="pb-24">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Pipeline</h1>
            <p className="text-xs text-zinc-500">
              {deals.length} deal{deals.length !== 1 ? "s" : ""} tracked
            </p>
          </div>
          <button
            onClick={() => actions.navigate("add-pipeline" as any)}
            className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-semibold text-sm active:bg-amber-400"
          >
            + Add Deal
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f.id
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-zinc-800/50 text-zinc-500 border border-zinc-800"
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {/* Deal cards */}
      <div className="px-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-sm">
            No deals in this category
          </div>
        ) : (
          filtered.map((deal) => {
            const status = PIPELINE_STATUS_CONFIG[deal.status];
            return (
              <button
                key={deal.id}
                onClick={() =>
                  actions.navigate("pipeline-detail" as any, {
                    dealId: deal.id,
                  } as ScreenParams)
                }
                className="w-full text-left bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-4 active:bg-zinc-800/80 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-zinc-100 flex-1 mr-2">
                    {deal.address}
                  </h3>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-white ${status.color}`}
                  >
                    {status.label}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span>Ask: {fmt(deal.asking_price)}</span>
                  {deal.estimated_arv && (
                    <span>ARV: {fmt(deal.estimated_arv)}</span>
                  )}
                  {deal.offer_amount && (
                    <span className="text-amber-400">
                      Offer: {fmt(deal.offer_amount)}
                    </span>
                  )}
                </div>
                {deal.source && (
                  <p className="text-[10px] text-zinc-600 mt-1">
                    Source: {deal.source}
                  </p>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
