"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import { BottomNav, Toast, Spinner } from "@/components/ui";
import { LoginScreen } from "@/components/screens/LoginScreen";
import { Dashboard } from "@/components/screens/Dashboard";
import { DealDetail } from "@/components/screens/DealDetail";
import { DealForm } from "@/components/screens/DealForm";
import { AddExpense } from "@/components/screens/AddExpense";
import { ExpensesList } from "@/components/screens/ExpensesList";
import { DealsList } from "@/components/screens/DealsList";
import * as data from "@/lib/data";
import type { Deal, Expense } from "@/lib/types";

export type Screen =
  | "dashboard"
  | "deal-detail"
  | "add-deal"
  | "edit-deal"
  | "add-expense"
  | "expenses"
  | "deals";

export interface ScreenParams {
  dealId?: string;
  filterDeal?: string;
}

export interface AppActions {
  navigate: (screen: Screen, params?: ScreenParams) => void;
  toast: (msg: string, type?: "success" | "error") => void;
  refreshData: () => Promise<void>;
  saveDeal: (
    id: string | null,
    deal: Partial<Deal>
  ) => Promise<void>;
  deleteDeal: (id: string) => Promise<void>;
  saveExpense: (expense: any) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
}

export default function AppShell() {
  const { user, loading: authLoading } = useAuth();
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [params, setParams] = useState<ScreenParams>({});
  const [deals, setDeals] = useState<Deal[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastState, setToastState] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const navigate = useCallback((s: Screen, p: ScreenParams = {}) => {
    setScreen(s);
    setParams(p);
    window.scrollTo(0, 0);
  }, []);

  const toast = useCallback(
    (msg: string, type: "success" | "error" = "success") => {
      setToastState({ msg, type });
    },
    []
  );

  const refreshData = useCallback(async () => {
    try {
      const [d, e] = await Promise.all([data.getDeals(), data.getExpenses()]);
      setDeals(d);
      setExpenses(e);
    } catch (err) {
      console.error("Failed to load data:", err);
    }
  }, []);

  // Load data when user is authenticated
  useEffect(() => {
    if (user) {
      setLoading(true);
      refreshData().finally(() => setLoading(false));
    }
  }, [user, refreshData]);

  const actions: AppActions = useMemo(
    () => ({
      navigate,
      toast,
      refreshData,
      saveDeal: async (id, dealData) => {
        if (id) {
          await data.updateDeal(id, dealData);
        } else {
          await data.createDeal(dealData as any);
        }
        await refreshData();
      },
      deleteDeal: async (id) => {
        await data.deleteDeal(id);
        await refreshData();
      },
      saveExpense: async (expense) => {
        await data.createExpense(expense);
        await refreshData();
      },
      deleteExpense: async (id) => {
        await data.deleteExpense(id);
        await refreshData();
      },
    }),
    [navigate, toast, refreshData]
  );

  // Show login if not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {screen === "dashboard" && (
        <Dashboard
          deals={deals}
          expenses={expenses}
          loading={loading}
          actions={actions}
        />
      )}
      {screen === "deal-detail" && (
        <DealDetail
          dealId={params.dealId || ""}
          deals={deals}
          expenses={expenses}
          actions={actions}
          userEmail={user.email || ""}
        />
      )}
      {screen === "add-deal" && (
        <DealForm deals={deals} dealId={null} actions={actions} />
      )}
      {screen === "edit-deal" && (
        <DealForm
          deals={deals}
          dealId={params.dealId || null}
          actions={actions}
        />
      )}
      {screen === "add-expense" && (
        <AddExpense
          deals={deals}
          preselectedDealId={params.dealId}
          actions={actions}
          userEmail={user.email || ""}
        />
      )}
      {screen === "expenses" && (
        <ExpensesList
          deals={deals}
          expenses={expenses}
          filterDealId={params.filterDeal}
          actions={actions}
        />
      )}
      {screen === "deals" && (
        <DealsList deals={deals} actions={actions} />
      )}

      <BottomNav activeTab={screen} onNavigate={(tab) => navigate(tab as Screen)} />

      {toastState && (
        <Toast
          message={toastState.msg}
          type={toastState.type}
          onClose={() => setToastState(null)}
        />
      )}
    </div>
  );
}
