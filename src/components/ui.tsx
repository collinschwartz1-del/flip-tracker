"use client";

import { useEffect, type ReactNode } from "react";
import { STATUS_CONFIG, type DealStatus } from "@/lib/types";

// ============================================================
// TOAST
// ============================================================
export function Toast({
  message,
  type = "success",
  onClose,
}: {
  message: string;
  type?: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed top-4 left-4 right-4 z-50 p-4 rounded-xl text-sm font-medium shadow-2xl border backdrop-blur-sm animate-slide-down
      ${
        type === "success"
          ? "bg-emerald-900/90 border-emerald-500/30 text-emerald-100"
          : "bg-red-900/90 border-red-500/30 text-red-100"
      }`}
    >
      {message}
    </div>
  );
}

// ============================================================
// CONFIRM DIALOG
// ============================================================
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in">
        <h3 className="text-lg font-bold text-zinc-100 mb-2">{title}</h3>
        <p className="text-sm text-zinc-400 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-medium text-sm border border-zinc-700 active:bg-zinc-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium text-sm active:bg-red-500"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SPINNER
// ============================================================
export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-zinc-600 border-t-amber-400 rounded-full animate-spin" />
    </div>
  );
}

// ============================================================
// STATUS BADGE
// ============================================================
export function StatusBadge({
  status,
  small,
}: {
  status: DealStatus;
  small?: boolean;
}) {
  const s = STATUS_CONFIG[status] || STATUS_CONFIG.looking;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-white font-medium ${
        s.color
      } ${small ? "text-[10px]" : "text-xs"}`}
    >
      {s.label}
    </span>
  );
}

// ============================================================
// BOTTOM NAV
// ============================================================
const navItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  },
  {
    id: "add-expense",
    label: "Add Expense",
    icon: "M12 5v14 M5 12h14",
    accent: true,
  },
  {
    id: "deals",
    label: "Deals",
    icon: "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
  },
  {
    id: "expenses",
    label: "Export",
    icon: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M7 10l5 5 5-5 M12 15V3",
  },
];

export function BottomNav({
  activeTab,
  onNavigate,
}: {
  activeTab: string;
  onNavigate: (tab: string) => void;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/80">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((tab) => {
          const active =
            activeTab === tab.id ||
            (tab.id === "deals" && activeTab === "add-deal");
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className="flex flex-col items-center py-2 px-4 min-w-[64px] transition-colors"
            >
              {tab.accent ? (
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center -mt-3 shadow-lg ${
                    active
                      ? "bg-amber-500 shadow-amber-500/30"
                      : "bg-amber-500/80 shadow-amber-500/20"
                  }`}
                >
                  <SvgIcon d={tab.icon} size={20} className="text-zinc-950" />
                </div>
              ) : (
                <SvgIcon
                  d={tab.icon}
                  size={20}
                  className={active ? "text-amber-400" : "text-zinc-600"}
                />
              )}
              <span
                className={`text-[10px] mt-0.5 font-medium ${
                  tab.accent
                    ? "text-amber-400"
                    : active
                    ? "text-amber-400"
                    : "text-zinc-600"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="safe-bottom" />
    </div>
  );
}

// ============================================================
// SVG ICON HELPER
// ============================================================
export function SvgIcon({
  d,
  size = 20,
  className = "",
}: {
  d: string;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={d} />
    </svg>
  );
}
