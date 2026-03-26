/**
 * Multi-step agentic analysis orchestrator.
 * Runs 4 sequential API calls from the frontend, each focused on one job.
 * The server never holds state — all intermediate data passes through here.
 */

import type { PipelineDeal } from "./types";
import {
  buildDefaultInputs,
  calcFullMatrix,
  calcKillZones,
  calcCashComparison,
  calcOpportunityCost,
  type FlipCalculatorInputs,
  type MatrixResult,
  type KillZones,
  type CellResult,
  type OpportunityCost,
} from "./flip-calculator";

// ============================================================
// TYPES
// ============================================================

export interface AnalysisProgress {
  step: number;
  totalSteps: number;
  message: string;
}

export type AnalysisStatus =
  | "complete"
  | "partial_success"
  | "partial_failure"
  | "validation_failure"
  | "calculator_failure";

export interface FullAnalysisResult {
  status: AnalysisStatus;
  failedStep?: number | string;
  error?: string;
  fallbackMessage?: string;
  note?: string;
  step1Data?: any;
  step2Data?: any;
  step3Data?: any;
  step4Data?: any;
  calcInputs?: FlipCalculatorInputs;
  matrix?: MatrixResult;
  killZones?: KillZones;
  financing?: { hardMoney: CellResult; allCash: CellResult };
  oppCost?: OpportunityCost;
  timings?: { step1: number; step2: number; step3: number; step4: number; total: number };
}

// ============================================================
// HELPERS
// ============================================================

async function callStep(url: string, body: any): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errMsg = `Step failed (${res.status})`;
    try {
      const errData = await res.json();
      errMsg = errData.error || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  const result = await res.json();
  return result.data;
}

function buildMatrixSummary(
  matrix: MatrixResult,
  killZones: KillZones,
  oppCost: OpportunityCost,
  financing: { hardMoney: CellResult; allCash: CellResult }
): string {
  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;
  const cells = matrix.cells;
  const lines: string[] = [
    "9-CELL PROFIT MATRIX (calculated by app, not by you):",
    "",
    "         | Light Rehab | Moderate Rehab | Heavy Rehab",
    "---------|------------|----------------|------------",
  ];

  for (const exit of ["best", "base", "worst"]) {
    const row = ["light", "moderate", "heavy"]
      .map((rehab) => {
        const key = `${rehab}_${exit}`;
        const c = cells[key];
        return c ? `${fmt(c.grossProfit)} (${c.roi.toFixed(0)}% ROI) [${c.color}]` : "N/A";
      })
      .join(" | ");
    lines.push(`${exit.padEnd(9)}| ${row}`);
  }

  lines.push("");
  lines.push(`BASE CASE (Moderate Rehab × Base Exit): ${fmt(matrix.baseCase.grossProfit)} profit, ${matrix.baseCase.roi.toFixed(0)}% ROI, ${matrix.baseCase.totalMonths.toFixed(1)} months`);
  lines.push(`BEST CASE: ${fmt(matrix.bestCase.grossProfit)} | WORST CASE: ${fmt(matrix.worstCase.grossProfit)}`);
  lines.push("");
  lines.push("KILL ZONES:");
  lines.push(`  Max purchase for $30K profit: ${fmt(killZones.maxPurchaseFor30kProfit)}`);
  lines.push(`  ARV floor (breakeven): ${fmt(killZones.arvFloorBreakeven)}`);
  lines.push(`  Rehab ceiling ($20K profit): ${fmt(killZones.rehabCeiling20kProfit)}`);
  lines.push(`  Max hold months: ${killZones.maxHoldMonths}`);
  lines.push("");
  lines.push(`OPPORTUNITY COST: Risk-free return on same capital = ${fmt(oppCost.riskFreeReturn)} vs base profit ${fmt(oppCost.baseProfit)}. Hurdle multiple: ${oppCost.hurdleMultiple.toFixed(1)}x`);
  lines.push("");
  lines.push(`FINANCING: Hard money base profit = ${fmt(financing.hardMoney.grossProfit)} | All-cash base profit = ${fmt(financing.allCash.grossProfit)}`);

  // Count red cells
  const redCount = Object.values(cells).filter((c: any) => c.color === "red").length;
  const amberCount = Object.values(cells).filter((c: any) => c.color === "amber").length;
  const greenCount = Object.values(cells).filter((c: any) => c.color === "green").length;
  lines.push(`MATRIX HEALTH: ${greenCount} green, ${amberCount} amber, ${redCount} red out of 9 cells`);

  return lines.join("\n");
}

/**
 * Runtime validation of Step 2 output before passing to calculator.
 * Catches type mismatches, nulls, NaN, zero/negative values.
 */
function validateStep2ForCalculator(step2: any): string[] {
  const errors: string[] = [];
  const checks: [string, any][] = [
    ["rehab_assessment.light.cost", step2?.rehab_assessment?.light?.cost],
    ["rehab_assessment.moderate.cost", step2?.rehab_assessment?.moderate?.cost],
    ["rehab_assessment.heavy.cost", step2?.rehab_assessment?.heavy?.cost],
    ["rehab_assessment.light.timeline_weeks", step2?.rehab_assessment?.light?.timeline_weeks],
    ["rehab_assessment.moderate.timeline_weeks", step2?.rehab_assessment?.moderate?.timeline_weeks],
    ["rehab_assessment.heavy.timeline_weeks", step2?.rehab_assessment?.heavy?.timeline_weeks],
    ["arv_validation.independent_arv_base", step2?.arv_validation?.independent_arv_base],
    ["arv_validation.independent_arv_low", step2?.arv_validation?.independent_arv_low],
    ["arv_validation.independent_arv_high", step2?.arv_validation?.independent_arv_high],
  ];
  for (const [path, val] of checks) {
    if (val === null || val === undefined) {
      errors.push(`${path} is missing`);
    } else if (isNaN(Number(val))) {
      errors.push(`${path} is not a number: "${val}"`);
    } else if (Number(val) <= 0) {
      errors.push(`${path} is zero or negative: ${val}`);
    }
  }
  return errors;
}

// ============================================================
// MAIN ORCHESTRATOR
// ============================================================

export async function runFullAnalysis(
  deal: PipelineDeal,
  onProgress: (progress: AnalysisProgress) => void
): Promise<FullAnalysisResult> {
  const totalStart = Date.now();
  const timings = { step1: 0, step2: 0, step3: 0, step4: 0, total: 0 };

  // ---- STEP 1: Market Research (web search) ----
  onProgress({ step: 1, totalSteps: 4, message: "Searching market data and comps..." });
  let step1Data: any;
  try {
    const t = Date.now();
    step1Data = await callStep("/api/analysis/step1-market", { deal });
    timings.step1 = Date.now() - t;
  } catch (err: any) {
    return {
      status: "partial_failure",
      failedStep: 1,
      error: err.message,
      fallbackMessage: "Market search failed. Check your connection and try again, or use Quick Screen.",
      timings: { ...timings, total: Date.now() - totalStart },
    };
  }

  // ---- STEP 2: Property Assessment ----
  onProgress({ step: 2, totalSteps: 4, message: "Analyzing property and building rehab scenarios..." });
  let step2Data: any;
  try {
    const t = Date.now();
    step2Data = await callStep("/api/analysis/step2-assess", {
      deal,
      step1Data,
      cmaComps: deal.cma_comps || [],
      calibrationText: "", // Session 2 will populate this from learning system
    });
    timings.step2 = Date.now() - t;
  } catch (err: any) {
    return {
      status: "partial_failure",
      failedStep: 2,
      error: err.message,
      fallbackMessage: "Market data was found but property assessment failed. Use Quick Screen or re-run.",
      step1Data,
      timings: { ...timings, total: Date.now() - totalStart },
    };
  }

  // ---- VALIDATE Step 2 before calculator ----
  const validationErrors = validateStep2ForCalculator(step2Data);
  if (validationErrors.length > 0) {
    return {
      status: "validation_failure",
      failedStep: "step2_validation",
      error: `Assessment data invalid: ${validationErrors.join(", ")}`,
      fallbackMessage: "Assessment data couldn't be processed. Use Quick Screen or re-run.",
      step1Data,
      step2Data,
      timings: { ...timings, total: Date.now() - totalStart },
    };
  }

  // ---- RUN CALCULATOR between Steps 2 and 3 ----
  const calcInputs = buildDefaultInputs(deal.asking_price || 0, {
    rehabLight: Number(step2Data.rehab_assessment?.light?.cost) || undefined,
    rehabModerate: Number(step2Data.rehab_assessment?.moderate?.cost) || undefined,
    rehabHeavy: Number(step2Data.rehab_assessment?.heavy?.cost) || undefined,
    rehabLightWeeks: Number(step2Data.rehab_assessment?.light?.timeline_weeks) || undefined,
    rehabModerateWeeks: Number(step2Data.rehab_assessment?.moderate?.timeline_weeks) || undefined,
    rehabHeavyWeeks: Number(step2Data.rehab_assessment?.heavy?.timeline_weeks) || undefined,
    rehabLightScope: step2Data.rehab_assessment?.light?.scope,
    rehabModerateScope: step2Data.rehab_assessment?.moderate?.scope,
    rehabHeavyScope: step2Data.rehab_assessment?.heavy?.scope,
    arvBest: Number(step2Data.arv_validation?.independent_arv_high) || undefined,
    arvBase: Number(step2Data.arv_validation?.independent_arv_base) || undefined,
    arvWorst: Number(step2Data.arv_validation?.independent_arv_low) || undefined,
    monthlyTaxes: Number(step2Data.holding_costs?.monthly_taxes) || undefined,
    monthlyInsurance: Number(step2Data.holding_costs?.monthly_insurance) || undefined,
    monthlyUtilities: Number(step2Data.holding_costs?.monthly_utilities) || undefined,
    monthlyLawnSnow: Number(step2Data.holding_costs?.monthly_lawn_snow) || undefined,
  });

  const matrix = calcFullMatrix(calcInputs);
  const killZones = calcKillZones(calcInputs, matrix.baseCase);
  const financing = calcCashComparison(calcInputs);
  const oppCost = calcOpportunityCost(
    matrix.baseCase.cashInvested,
    matrix.baseCase.totalMonths,
    matrix.baseCase.grossProfit
  );

  // Verify calculator didn't produce NaN
  if (isNaN(matrix.baseCase.grossProfit)) {
    return {
      status: "calculator_failure",
      failedStep: "calculator",
      error: "Financial calculations produced invalid results.",
      fallbackMessage: "Use Quick Screen or re-run analysis.",
      step1Data,
      step2Data,
      timings: { ...timings, total: Date.now() - totalStart },
    };
  }

  // Build matrix summary text for Step 3
  const matrixSummary = buildMatrixSummary(matrix, killZones, oppCost, financing);

  // ---- STEP 3: Verdict ----
  onProgress({ step: 3, totalSteps: 4, message: "Synthesizing verdict and conditions..." });
  let step3Data: any;
  try {
    const t = Date.now();
    step3Data = await callStep("/api/analysis/step3-verdict", {
      deal,
      step1Data,
      step2Data,
      matrixSummary,
      killZones: {
        maxPurchaseFor30kProfit: killZones.maxPurchaseFor30kProfit,
        arvFloorBreakeven: killZones.arvFloorBreakeven,
        rehabCeiling20kProfit: killZones.rehabCeiling20kProfit,
        maxHoldMonths: killZones.maxHoldMonths,
      },
    });
    timings.step3 = Date.now() - t;
  } catch (err: any) {
    // Steps 1-2 + calculator succeeded. Show partial with a note.
    return {
      status: "partial_success",
      failedStep: 3,
      error: err.message,
      note: "Market data + assessment + financials are complete. Verdict generation failed \u2014 review the numbers and form your own verdict.",
      step1Data,
      step2Data,
      calcInputs,
      matrix,
      killZones,
      financing,
      oppCost,
      timings: { ...timings, total: Date.now() - totalStart },
    };
  }

  // ---- STEP 4: Self-Check (advisory) ----
  onProgress({ step: 4, totalSteps: 4, message: "Verifying consistency..." });
  let step4Data: any;
  try {
    const t = Date.now();
    step4Data = await callStep("/api/analysis/step4-check", {
      step1Data,
      step2Data,
      step3Data,
      matrixSummary,
    });
    timings.step4 = Date.now() - t;
  } catch {
    // Step 4 failure is non-critical
    step4Data = { consistency_check: "SKIPPED", flags: [], auto_corrections: [] };
  }

  timings.total = Date.now() - totalStart;

  return {
    status: "complete",
    step1Data,
    step2Data,
    step3Data,
    step4Data,
    calcInputs,
    matrix,
    killZones,
    financing,
    oppCost,
    timings,
  };
}
