// ============================================================
// FLIP FINANCIAL CALCULATOR
// Pure functions — no side effects, no API calls
// ============================================================

export interface FinancingTerms {
  type: "hard_money" | "cash";
  ltv: number;       // 0.90 = 90% LTV
  rate: number;      // 0.12 = 12% annual
  points: number;    // 0.02 = 2 points
}

export interface MonthlyHoldingCosts {
  taxes: number;
  insurance: number;
  utilities: number;
  lawnSnow: number;
}

export interface RehabScenarioInput {
  cost: number;
  contingencyPct: number;  // 0.10, 0.15, 0.25
  timelineWeeks: number;
  scope: string;
}

export interface ExitScenarioInput {
  arv: number;
  marketingMonths: number;
  concessionPct: number;   // 0.00, 0.02, 0.03
  sellCostsPct: number;    // 0.08
}

export interface FlipCalculatorInputs {
  purchasePrice: number;
  buyClosingPct: number;  // 0.015 default
  financing: FinancingTerms;
  monthlyHolding: MonthlyHoldingCosts;
  rehab: {
    light: RehabScenarioInput;
    moderate: RehabScenarioInput;
    heavy: RehabScenarioInput;
  };
  exit: {
    best: ExitScenarioInput;
    base: ExitScenarioInput;
    worst: ExitScenarioInput;
  };
}

// ---- Loan Calculation ----

export interface LoanCalc {
  loanAmount: number;
  equityRequired: number;
  originationPoints: number;
  monthlyInterest: number;
}

export function calcLoan(
  purchasePrice: number,
  financing: FinancingTerms
): LoanCalc {
  if (financing.type === "cash") {
    return {
      loanAmount: 0,
      equityRequired: purchasePrice,
      originationPoints: 0,
      monthlyInterest: 0,
    };
  }
  const loanAmount = purchasePrice * financing.ltv;
  const equityRequired = purchasePrice - loanAmount;
  const originationPoints = loanAmount * financing.points;
  const monthlyInterest = loanAmount * (financing.rate / 12);
  return { loanAmount, equityRequired, originationPoints, monthlyInterest };
}

// ---- Single Cell Calculation ----

export interface CellResult {
  rehabScenario: string;
  exitScenario: string;
  purchasePrice: number;
  buyClosing: number;
  rehabCost: number;
  contingency: number;
  rehabTotal: number;
  loanPoints: number;
  rehabMonths: number;
  marketingMonths: number;
  totalMonths: number;
  monthlyHoldingBase: number;
  monthlyLoanInterest: number;
  monthlyHoldingTotal: number;
  totalHoldingCosts: number;
  totalInvestment: number;
  grossSalePrice: number;
  sellCosts: number;
  concessions: number;
  netProceeds: number;
  grossProfit: number;
  cashInvested: number;
  roi: number;
  annualizedRoi: number;
  profitPerMonth: number;
  dollarPerHour: number;
  color: "green" | "amber" | "red";
}

export function calcCell(
  purchasePrice: number,
  buyClosingPct: number,
  rehab: RehabScenarioInput,
  exit: ExitScenarioInput,
  financing: FinancingTerms,
  monthlyHolding: MonthlyHoldingCosts,
  rehabLabel: string,
  exitLabel: string
): CellResult {
  const buyClosing = purchasePrice * buyClosingPct;
  const rehabCost = rehab.cost;
  const contingency = rehab.cost * rehab.contingencyPct;
  const rehabTotal = rehabCost + contingency;

  const loan = calcLoan(purchasePrice, financing);

  const rehabMonths = rehab.timelineWeeks / 4.33;
  const totalMonths = rehabMonths + exit.marketingMonths;

  const monthlyHoldingBase =
    monthlyHolding.taxes +
    monthlyHolding.insurance +
    monthlyHolding.utilities +
    monthlyHolding.lawnSnow;
  const monthlyHoldingTotal = monthlyHoldingBase + loan.monthlyInterest;
  const totalHoldingCosts = monthlyHoldingTotal * totalMonths;

  const totalInvestment =
    purchasePrice +
    buyClosing +
    rehabTotal +
    totalHoldingCosts +
    loan.originationPoints;

  const grossSalePrice = exit.arv;
  const sellCosts = grossSalePrice * exit.sellCostsPct;
  const concessions = grossSalePrice * exit.concessionPct;
  const netProceeds = grossSalePrice - sellCosts - concessions;

  const grossProfit = netProceeds - totalInvestment;

  const cashInvested =
    loan.equityRequired +
    rehabTotal +
    buyClosing +
    totalHoldingCosts +
    loan.originationPoints;

  const roi = cashInvested > 0 ? (grossProfit / cashInvested) * 100 : 0;
  const annualizedRoi =
    totalMonths > 0 && cashInvested > 0
      ? (Math.pow(1 + grossProfit / cashInvested, 12 / totalMonths) - 1) * 100
      : 0;
  const profitPerMonth = totalMonths > 0 ? grossProfit / totalMonths : 0;
  const dollarPerHour = grossProfit / 200;

  const color: "green" | "amber" | "red" =
    grossProfit > 30000 && roi > 15
      ? "green"
      : grossProfit > 10000 || roi > 5
      ? "amber"
      : "red";

  return {
    rehabScenario: rehabLabel,
    exitScenario: exitLabel,
    purchasePrice, buyClosing, rehabCost, contingency, rehabTotal,
    loanPoints: loan.originationPoints, rehabMonths,
    marketingMonths: exit.marketingMonths, totalMonths,
    monthlyHoldingBase, monthlyLoanInterest: loan.monthlyInterest,
    monthlyHoldingTotal, totalHoldingCosts, totalInvestment,
    grossSalePrice, sellCosts, concessions, netProceeds,
    grossProfit, cashInvested, roi, annualizedRoi,
    profitPerMonth, dollarPerHour, color,
  };
}

// ---- Full 9-Cell Matrix ----

export interface MatrixResult {
  cells: Record<string, CellResult>;
  baseCase: CellResult;
  bestCase: CellResult;
  worstCase: CellResult;
}

export function calcFullMatrix(inputs: FlipCalculatorInputs): MatrixResult {
  const rehabKeys = ["light", "moderate", "heavy"] as const;
  const exitKeys = ["best", "base", "worst"] as const;
  const cells: Record<string, CellResult> = {};

  for (const r of rehabKeys) {
    for (const e of exitKeys) {
      const key = `${r}_${e}`;
      cells[key] = calcCell(
        inputs.purchasePrice, inputs.buyClosingPct,
        inputs.rehab[r], inputs.exit[e],
        inputs.financing, inputs.monthlyHolding, r, e
      );
    }
  }

  return {
    cells,
    baseCase: cells["moderate_base"],
    bestCase: cells["light_best"],
    worstCase: cells["heavy_worst"],
  };
}

// ---- Kill Zone Calculations ----

export interface KillZones {
  maxPurchaseFor30kProfit: number;
  arvFloorBreakeven: number;
  rehabCeiling20kProfit: number;
  maxHoldMonths: number;
}

export function calcKillZones(
  inputs: FlipCalculatorInputs,
  baseCase: CellResult
): KillZones {
  const baseExit = inputs.exit.base;
  const netProceedsFactor = 1 - baseExit.sellCostsPct - baseExit.concessionPct;
  const baseNetProceeds = baseExit.arv * netProceedsFactor;
  const fixedCosts = baseCase.rehabTotal + baseCase.totalHoldingCosts + baseCase.loanPoints;
  const maxPurchaseFor30kProfit = Math.round(
    (baseNetProceeds - 30000 - fixedCosts) / (1 + inputs.buyClosingPct)
  );
  const arvFloorBreakeven = Math.round(baseCase.totalInvestment / netProceedsFactor);
  const rehabCeiling20kProfit = Math.round(baseCase.rehabTotal + (baseCase.grossProfit - 20000));
  const maxHoldMonths = baseCase.monthlyHoldingTotal > 0
    ? baseCase.grossProfit / baseCase.monthlyHoldingTotal : 99;

  return {
    maxPurchaseFor30kProfit: Math.max(0, maxPurchaseFor30kProfit),
    arvFloorBreakeven,
    rehabCeiling20kProfit: Math.max(0, rehabCeiling20kProfit),
    maxHoldMonths: Math.round(maxHoldMonths * 10) / 10,
  };
}

// ---- Opportunity Cost ----

export interface OpportunityCost {
  riskFreeReturn: number;
  baseProfit: number;
  exceedsHurdle: boolean;
  hurdleMultiple: number;
}

export function calcOpportunityCost(
  cashInvested: number, totalMonths: number,
  baseProfit: number, riskFreeRate: number = 0.05
): OpportunityCost {
  const riskFreeReturn = cashInvested * riskFreeRate * (totalMonths / 12);
  const hurdleMultiple = riskFreeReturn > 0 ? baseProfit / riskFreeReturn : 99;
  return {
    riskFreeReturn: Math.round(riskFreeReturn),
    baseProfit: Math.round(baseProfit),
    exceedsHurdle: baseProfit > riskFreeReturn * 3,
    hurdleMultiple: Math.round(hurdleMultiple * 10) / 10,
  };
}

// ---- All-Cash Comparison ----

export function calcCashComparison(
  inputs: FlipCalculatorInputs
): { hardMoney: CellResult; allCash: CellResult } {
  const cashInputs: FlipCalculatorInputs = {
    ...inputs,
    financing: { type: "cash", ltv: 0, rate: 0, points: 0 },
  };
  const hardMoney = calcCell(
    inputs.purchasePrice, inputs.buyClosingPct,
    inputs.rehab.moderate, inputs.exit.base,
    inputs.financing, inputs.monthlyHolding, "moderate", "base"
  );
  const allCash = calcCell(
    cashInputs.purchasePrice, cashInputs.buyClosingPct,
    cashInputs.rehab.moderate, cashInputs.exit.base,
    cashInputs.financing, cashInputs.monthlyHolding, "moderate", "base"
  );
  return { hardMoney, allCash };
}

// ---- Default Inputs Builder (converts AI data to calculator inputs) ----

export function buildDefaultInputs(
  purchasePrice: number,
  aiData: {
    rehabLight?: number; rehabModerate?: number; rehabHeavy?: number;
    rehabLightWeeks?: number; rehabModerateWeeks?: number; rehabHeavyWeeks?: number;
    rehabLightScope?: string; rehabModerateScope?: string; rehabHeavyScope?: string;
    arvBest?: number; arvBase?: number; arvWorst?: number;
    monthlyTaxes?: number; monthlyInsurance?: number;
    monthlyUtilities?: number; monthlyLawnSnow?: number;
  }
): FlipCalculatorInputs {
  const moderate = aiData.rehabModerate || 50000;
  return {
    purchasePrice,
    buyClosingPct: 0.015,
    financing: { type: "hard_money", ltv: 0.90, rate: 0.12, points: 0.02 },
    monthlyHolding: {
      taxes: aiData.monthlyTaxes || 200,
      insurance: aiData.monthlyInsurance || 150,
      utilities: aiData.monthlyUtilities || 200,
      lawnSnow: aiData.monthlyLawnSnow || 100,
    },
    rehab: {
      light: {
        cost: aiData.rehabLight || Math.round(moderate * 0.6),
        contingencyPct: 0.10,
        timelineWeeks: aiData.rehabLightWeeks || 6,
        scope: aiData.rehabLightScope || "Cosmetic refresh: paint, flooring, fixtures",
      },
      moderate: {
        cost: moderate, contingencyPct: 0.15,
        timelineWeeks: aiData.rehabModerateWeeks || 12,
        scope: aiData.rehabModerateScope || "Full cosmetic + mechanical updates",
      },
      heavy: {
        cost: aiData.rehabHeavy || Math.round(moderate * 1.6),
        contingencyPct: 0.25,
        timelineWeeks: aiData.rehabHeavyWeeks || 20,
        scope: aiData.rehabHeavyScope || "Gut rehab + structural + all mechanical",
      },
    },
    exit: {
      best: {
        arv: aiData.arvBest || Math.round((aiData.arvBase || 250000) * 1.05),
        marketingMonths: 1, concessionPct: 0, sellCostsPct: 0.08,
      },
      base: {
        arv: aiData.arvBase || 250000,
        marketingMonths: 2, concessionPct: 0.02, sellCostsPct: 0.08,
      },
      worst: {
        arv: aiData.arvWorst || Math.round((aiData.arvBase || 250000) * 0.90),
        marketingMonths: 4, concessionPct: 0.03, sellCostsPct: 0.08,
      },
    },
  };
}
