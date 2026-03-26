"use client";

import type { ConfidenceLevel } from "@/lib/types";

const TAG_CONFIG: Record<ConfidenceLevel, { label: string; color: string; bg: string }> = {
  MLS_VERIFIED:   { label: "MLS VERIFIED",   color: "#22C55E", bg: "rgba(34,197,94,0.12)" },
  TAX_RECORDS:    { label: "TAX RECORDS",    color: "#22C55E", bg: "rgba(34,197,94,0.12)" },
  CONTRACTOR_BID: { label: "CONTRACTOR BID", color: "#22C55E", bg: "rgba(34,197,94,0.12)" },
  PHOTO_VERIFIED: { label: "PHOTO VERIFIED", color: "#22C55E", bg: "rgba(34,197,94,0.12)" },
  WEB_SEARCH:     { label: "WEB SEARCH",     color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  USER_PROVIDED:  { label: "USER PROVIDED",  color: "#38BDF8", bg: "rgba(56,189,248,0.12)" },
  ESTIMATED:      { label: "ESTIMATED",      color: "#94A3B8", bg: "rgba(148,163,184,0.12)" },
  ASSUMED:        { label: "ASSUMED",         color: "#64748B", bg: "rgba(100,116,139,0.12)" },
};

export function ConfidenceTag({ level }: { level: ConfidenceLevel }) {
  const config = TAG_CONFIG[level] || TAG_CONFIG.ASSUMED;
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider ml-1.5"
      style={{ backgroundColor: config.bg, color: config.color, letterSpacing: "0.5px" }}
    >
      {config.label}
    </span>
  );
}

export function DataGapBadge() {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider ml-1.5"
      style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#EF4444", letterSpacing: "0.5px" }}
    >
      DATA GAP
    </span>
  );
}
