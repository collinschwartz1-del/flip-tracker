import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

interface Step1Data {
  address: string;
  purchasePrice: number;
  closingCosts: number;
  holdingMonths: number;
  monthlyHoldingCost: number;
  rehabEstimate: number;
  propertyAge?: number;
  foundationType?: string;
  [key: string]: any;
}

interface Step2Data {
  arv: number;
  compMedianPricePerSf: number;
  avgRehabCostPerSf: number;
  [key: string]: any;
}

interface Step3Data {
  verdict: {
    decision: "GO" | "CONDITIONAL GO" | "NO-GO";
    conditions?: string[];
    summary?: string;
  };
  field_confidence?: Record<string, string>;
}

interface RequestBody {
  step1Data: Step1Data;
  step2Data: Step2Data;
  step3Data: Step3Data;
  matrixSummary: string;
}

interface Flag {
  field: string;
  severity: "WARNING" | "ERROR";
  problem: string;
  original_value: any;
  suggested_value: any;
  reason: string;
  user_action_required: boolean;
}

interface AutoCorrection {
  field: string;
  problem: string;
  original: any;
  corrected: any;
  reason: string;
  user_action_required: boolean;
}

interface ConsistencyCheckResponse {
  consistency_check: "PASS" | "FLAGS_FOUND";
  flags: Flag[];
  auto_corrections: AutoCorrection[];
}

function parseJsonResponse(text: string): ConsistencyCheckResponse {
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
    const { step1Data, step2Data, step3Data, matrixSummary } = body;

    if (!step1Data || !step2Data || !step3Data || !matrixSummary) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const subjectSf = step1Data.subjectSquareFeet || 1;
    const arvMedianExpected = step2Data.compMedianPricePerSf * subjectSf;
    const arvDifference = Math.abs(step2Data.arv - arvMedianExpected) / arvMedianExpected;

    const rehabPerSf = step1Data.rehabEstimate / subjectSf;
    const rehabDifference = Math.abs(rehabPerSf - step2Data.avgRehabCostPerSf) / step2Data.avgRehabCostPerSf;

    const prompt = `You are a quality assurance analyst checking a real estate flip analysis for internal consistency.

## Data Being Checked

### Step 1 Data (Property Profile)
${JSON.stringify(step1Data, null, 2)}

### Step 2 Data (Market Analysis)
${JSON.stringify(step2Data, null, 2)}

### Step 3 Data (Verdict)
${JSON.stringify(step3Data, null, 2)}

### 9-Cell Matrix Summary
${matrixSummary}

## Your Task
Check for inconsistencies between steps. Flag problems but distinguish between:
1. **Auto-corrections** (factual errors, apply automatically) - e.g., pre-1950 foundation with LOW risk rating
2. **Flags** (judgment calls, user decides) - e.g., ARV varies from comp median

### Specific Checks

1. **ARV vs Comp Median**
   - Expected ARV: $${arvMedianExpected?.toLocaleString() || "N/A"} (${step2Data.compMedianPricePerSf || "N/A"} $/SF × ${subjectSf || "N/A"} SF)
   - Actual ARV: $${step2Data.arv?.toLocaleString() || "N/A"}
   - Current difference: ${(arvDifference * 100).toFixed(1)}%
   - Flag if >8% difference

2. **Rehab Estimate vs Benchmarks**
   - Subject rehab/SF: $${rehabPerSf?.toFixed(2) || "N/A"}
   - Market average: $${step2Data.avgRehabCostPerSf?.toFixed(2) || "N/A"} /SF
   - Current difference: ${(rehabDifference * 100).toFixed(1)}%
   - Flag if >25% off

3. **Risk Rating vs Property Age**
   - Property age: ${step1Data.propertyAge || "unknown"} years
   - Foundation type: ${step1Data.foundationType || "unknown"}
   - AUTO-CORRECT: If pre-1950 + foundation "LOW" risk = must be "HIGH"

4. **Verdict vs Matrix**
   - Verdict: ${step3Data.verdict?.decision || "unknown"}
   - Matrix cells with RED (negative profit): check matrix summary
   - AUTO-FLAG: If 5+ red cells, verdict cannot be "GO"

5. **Monthly Holding Costs**
   - Current: $${step1Data.monthlyHoldingCost || "N/A"}
   - FLAG if <$400 (unrealistic) or >$3000 (seems high)

6. **Internal Contradictions**
   - Check if verdict matches reasoning
   - Check if conditions are achievable
   - Check for circular logic or contradictions

## Response Format
Return ONLY valid JSON (no markdown, no code blocks):

{
  "consistency_check": "PASS|FLAGS_FOUND",
  "flags": [
    {
      "field": "field name",
      "severity": "WARNING|ERROR",
      "problem": "what's wrong",
      "original_value": null,
      "suggested_value": null,
      "reason": "why this matters",
      "user_action_required": true
    }
  ],
  "auto_corrections": [
    {
      "field": "field name",
      "problem": "what was wrong",
      "original": null,
      "corrected": null,
      "reason": "why this is corrected",
      "user_action_required": false
    }
  ]
}

### Notes
- Auto-corrections are factual/rule-based errors that always apply
- Flags are judgment calls where user decides
- If PASS, both arrays should be empty
- Severity: WARNING (review), ERROR (significant issue)`;

    const response = await fetch("https://api.anthropic.com/v1/messages/claude-3-5-sonnet-20241022", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
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
