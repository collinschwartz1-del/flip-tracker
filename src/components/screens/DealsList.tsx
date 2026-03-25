"use client";

import { StatusBadge, SvgIcon } from "@/components/ui";
import { fmt, shortAddr } from "@/lib/utils";
import type { Deal } from "@/lib/types";
import type { AppActions } from "@/components/AppShell";

export function DealsList({
  deals,
  actions,
}: {
  deals: Deal[];
  actions: AppActions;
}) {
  return (
    <div className="pb-24">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <h1 className="text-base font-bold text-zinc-100">All Deals</h1>
        <button
          onClick={() => actions.navigate("add-deal")}
          className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 rounded-lg text-xs text-zinc-950 font-bold active:bg-amber-400"
        >
          <SvgIcon d="M12 5v14 M5 12h14" size={14} className="text-zinc-950" /> New Deal
        </button>
      </div>
      <div className="px-4 space-y-2">
        {deals.map((deal) => (
          <button
            key={deal.id}
            onClick={() => actions.navigate("deal-detail", { dealId: deal.id })}
            className="w-full text-left flex items-center justify-between p-3.5 bg-zinc-900/80 border border-zinc-800/80 rounded-xl active:bg-zinc-800 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-200 truncate">
                {shortAddr(deal.address)}
              </p>
              <p className="text-[11px] text-zinc-500">
                {fmt(deal.purchase_price)} · {deal.beds}bd/{deal.baths}ba
              </p>
            </div>
            <StatusBadge status={deal.status} small />
          </button>
        ))}
        {deals.length === 0 && (
          <div className="text-center py-12">
            <p className="text-zinc-500 text-sm">No deals yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
