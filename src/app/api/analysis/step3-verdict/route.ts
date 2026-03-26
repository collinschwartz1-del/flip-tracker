import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

interface Step1Data {
  address: string;
  purchasePrice: number;
  closingCosts: number;
  holdingMonths: number;
  monthlyHoldingCost: number;
  rehabEstimate: number;
  [key: string]: any;
}

interface Step2Data {
  arv: number;
  compMedianPricePerSf: number;
  avgRehabCostPerSf: number;
  [key: string]: any;
}

interface KillZones {
  maxPurchaseFor30kProfit: number;
  arvFloorBreakeven: number;
  [key: string]: any;
}

interface RequestBody {
  deal: Record<string, any>;
  step1Data: Step1Data;
  step2Data: Step2Data;
  matrixSummary: string;
  killZones: KillZones;
}

interface Verdict {
  decision: "GO" | "CONDITIONAL GO" | "NO-GO";
  conditions: string[];
  summary: string;
  data_upgrade_opportunities: Array<{
    action: string;
    impact: string;
  }>;
}

interface FieldConfidence {
  purchase_price: string;
  arv: string;
  rehab: string;
  comps: string;
  holding_costs: string;
  market_data: string;
}

interface ResponseData {
  verdict: Verdict;
  field_confidence: FieldConfidence;
}

function parseJsonResponse(text: string): ResponseData {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON found in response");
  }
  return JSON.parse(jsonMatch[0]);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: RequestBody = await request.json();
    const { deal, step1Data, step2Data, matrixSummary, killZones } = body;

    if (!deal || !step1Data || !step2Data || !matrixSummary || !killZones) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const prompt = `You are a commercial real estate analyst synthesizing a flip deal verdict.

## Deal Overview
Address: ${step1Data.address}
Purchase Price: $${step1Data.purchasePrice?.toLocaleString() || "N/A"}
Closing Costs: $${step1Data.closingCosts?.toLocaleString() || "N/A"}
Rehab Estimate: $${step1Data.rehabEstimate?.toLocaleString() || "N/A"}
Holding Period: ${step1Data.holdingMonths || "N/A"} months
Monthly Holding Cost: $${step1Data.monthlyHoldingCost || "N/A"}

## Step 1 Data (Property Profile)
${JSON.stringify(step1Data, null, 2)}

## Step 2 Data (Market Analysis)
ARV (After-Repair Value): $${step2Data.arv?.toLocaleString() || "N/A"}
Comp Median $/SF: $${step2Data.compMedianPricePerSf || "N/A"}
Avg Rehab Cost/SF: $${step2Data.avgRehabCostPerSf || "N/A"}
${JSON.stringify(step2Data, null, 2)}

## 9-Cell Profit Matrix Summary
${matrixSummary}

## Kill Zones (Constraints & Limits)
${JSON.stringify(killZones, null, 2)}

## Your Task
Synthesize a VERDICT based on all available data. Be direct and specific.

### Quality Rules:
1. If the deal only works in Best×Light scenario = CONDITIONAL GO at best
2. If 5+ matrix cells show RED (negative profit) = cannot be GO
3. Missing or weak data = frame as risk, not assumption
4. Account for field confidence levels in your decision
5. Identify specific conditions that would upgrade CONDITIONAL GO to GO

### Decision Matrix:
- **GO**: Works across multiple scenarios (Best×Light minimum), strong margins, low uncertainty
- **CONDITIONAL GO**: Works in favorable conditions or with specific data upgrades, requires 1-3 conditions met
- **NO-GO**: Only works in Best scenario, too many red cells, kills zones violated, unrecoverable deal

### Response Format
Return ONLY valid JSON (no markdown, no code blocks):

{
  "verdict": {
    "decision": "GO|CONDITIONAL GO|NO-GO",
    "conditions": ["condition 1", "condition 2", ...],
    "summary": "2-3 paragraph plain English summary for a busy operator",
    "data_upgrade_opportunities": [
      {
        "action": "specific action to improve data quality",
        "impact": "how this improves the deal or confidence"
      }
    ]
  },
  "field_confidence": {
    "purchase_price": "USER_PROVIDED",
    "arv": "WEB_SEARCH|MLS_VERIFIED",
    "rehab": "ESTIMATED|PHOTO_VERIFIED|CONTRACTOR_BID",
    "comps": "WEB_SEARCH|MLS_VERIFIED",
    "holding_costs": "TAX_RECORDS|ESTIMATED",
    "market_data": "WEB_SEARCH"
  }
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages/claude-3-5-sonnet-20241022", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: "Claude API error", details: errorData },
        { status: 500 }
      );
    }

    const apiResponse = await response.json();
    const content = apiResponse.content[0]?.text || "";

    if (!content) {
      return NextResponse.json(
        { error: "No response from Claude" },
        { status: 500 }
      );
    }

    const parsedData = parseJsonResponse(content);
    const timing = Date.now() - startTime;

    return NextResponse.json({
      data: parsedData,
      timing,
    });
  } catch (error) {
    const timing = Date.now() - startTime;

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: "Failed to parse Claude response as JSON",
          details: error.message,
          timing,
        },
        { status: 500 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: error.message,
          timing,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Unknown error",
        timing,
      },
      { status: 500 }
    );
  }
}
