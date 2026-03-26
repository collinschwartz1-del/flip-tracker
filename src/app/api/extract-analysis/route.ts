import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json({ error: "No content provided" }, { status: 400 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: `Extract ALL structured data from this flip analysis dashboard code. The code contains JavaScript constants with deal data, market data, comps, rehab scenarios, exit scenarios, financing terms, and risk assessments.

Return ONLY a JSON object (no markdown, no backticks) with this structure:

{
  "deal": { "address": "", "beds": 0, "baths": 0, "sqft": 0, "year_built": 0, "asking_price": 0, "claimed_arv": 0 },
  "market": { "median_price": 0, "price_per_sf": 0, "avg_dom": 0, "yoy_change": 0, "trend": "" },
  "comps": [{ "address": "", "price": 0, "sqft": 0, "price_per_sf": 0, "beds": 0, "baths": 0, "condition": "", "date": "", "dom": 0 }],
  "arv": { "independent_low": 0, "independent_base": 0, "independent_high": 0, "median_psf": 0, "methodology": "" },
  "rehab": {
    "light": { "cost": 0, "contingency_pct": 0, "total": 0, "weeks": 0, "scope": "" },
    "moderate": { "cost": 0, "contingency_pct": 0, "total": 0, "weeks": 0, "scope": "" },
    "heavy": { "cost": 0, "contingency_pct": 0, "total": 0, "weeks": 0, "scope": "" }
  },
  "exit": {
    "best": { "arv": 0, "marketing_months": 0, "concession_pct": 0, "sell_costs_pct": 0.08 },
    "base": { "arv": 0, "marketing_months": 0, "concession_pct": 0, "sell_costs_pct": 0.08 },
    "worst": { "arv": 0, "marketing_months": 0, "concession_pct": 0, "sell_costs_pct": 0.08 }
  },
  "holding": { "monthly_taxes": 0, "monthly_insurance": 0, "monthly_utilities": 0, "monthly_lawn_snow": 0 },
  "financing": { "type": "hard_money", "ltv": 0.90, "rate": 0.12, "points": 0.02 },
  "risks": [{ "name": "", "rating": "", "detail": "", "cost_impact": "" }],
  "verdict": { "decision": "", "conditions": [""], "missing_data": [""], "summary": "" }
}

Extract EVERY number precisely from the JavaScript constants. Do NOT estimate or round — use the exact values from the code.

Code to extract from:
${content.slice(0, 20000)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
    }

    const data = await response.json();
    const text = data.content
      ?.filter((c: any) => c.type === "text")
      ?.map((c: any) => c.text || "")
      ?.join("") || "";

    // Robust JSON extraction
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      return NextResponse.json({ error: "No JSON found in extraction" }, { status: 500 });
    }
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));

    return NextResponse.json({ data: parsed });
  } catch (error: any) {
    console.error("Extract analysis error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
