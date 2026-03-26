import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 45;

interface DealData {
  address: string;
  asking_price: number;
  beds: number;
  baths: number;
  sqft: number;
  year_built: number;
  estimated_arv: number;
  estimated_rehab: number;
  source: string;
  notes: string;
  listing_url: string;
}

interface PropertyData {
  tax_assessed_value: number;
  annual_property_tax: number;
  prior_sales: Array<{ date: string; price: number }>;
  zestimate: number;
  lot_size: string;
  features: string[];
}

interface Comp {
  address: string;
  sale_price: number;
  sqft: number;
  price_per_sf: number;
  beds: number;
  baths: number;
  year_built: number;
  condition: string;
  sale_date: string;
  dom: number;
  status: "Sold" | "Active";
  distance: string;
  source: string;
  relevance_note: string;
}

interface MarketIndicators {
  median_price: number;
  median_price_per_sf: number;
  avg_dom: number;
  yoy_change_pct: number;
  inventory_trend: string;
  market_type: string;
  active_similar_listings: number;
}

interface RehabBenchmarks {
  cost_per_sf_low: number;
  cost_per_sf_mid: number;
  cost_per_sf_high: number;
  source: string;
}

interface MarketAnalysisResponse {
  property_data: PropertyData;
  comps: Comp[];
  market_indicators: MarketIndicators;
  rehab_benchmarks: RehabBenchmarks;
  search_queries_used: string[];
  data_quality_notes: string;
}

export async function POST(request: NextRequest) {
  const start = Date.now();

  try {
    const body = await request.json();
    const deal: DealData = body.deal;

    if (!deal || !deal.address) {
      return NextResponse.json(
        { error: "Deal with address is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY environment variable is not set");
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const searchQueries = [
      `${deal.address} Zillow Redfin property details`,
      `${deal.address} recent sold comps comparable homes`,
      `${deal.address} renovated properties market`,
      `${deal.address} median home price area`,
      `${deal.address} days on market housing`,
      `${deal.address} housing market forecast`,
      `Omaha Nebraska rehab cost per square foot benchmarks`,
      `Omaha NE pre-1960 foundation issues radon lead paint`,
    ];

    const prompt = `You are a real estate investment analyst specializing in fix-and-flip deals. Analyze this property and provide comprehensive market research data.

PROPERTY DETAILS:
Address: ${deal.address}
Asking Price: $${deal.asking_price}
Beds: ${deal.beds}, Baths: ${deal.baths}
Square Feet: ${deal.sqft}
Year Built: ${deal.year_built}
Estimated ARV: $${deal.estimated_arv}
Estimated Rehab: $${deal.estimated_rehab}
Listing URL: ${deal.listing_url}
Notes: ${deal.notes}

RESEARCH REQUIREMENTS:
1. Search for the property on Zillow/Redfin to find: tax assessed value, annual property tax, prior sales history, Zestimate, lot size, and features
2. Find recent sold comparables in the area (within 0.5-1 mile, similar beds/baths, sold in last 90 days)
3. Find renovated/updated comparables in the market
4. Determine median home price and median price per square foot in the area
5. Find average days on market (DOM) for similar properties
6. Research housing market forecast for the area
7. Find rehab cost per SF benchmarks for this property type

OMAHA, NE SPECIFIC CONTEXT:
- Properties pre-1960 often have foundation issues (crack risk, water intrusion)
- Properties pre-1978 have lead paint exposure concerns
- Radon testing is important (Omaha is in EPA Zone 1 - high potential area)
- Standard selling costs: 8% of sale price
- Local market: typically slower moving than metro areas, but stable

RESPONSE FORMAT:
Return ONLY valid JSON (no markdown, no backticks) with this exact structure. Fill in all fields with the most accurate data you can find through your searches. Use 0 for unknown numeric values and empty strings for unknown text fields:

{
  "property_data": {
    "tax_assessed_value": 0,
    "annual_property_tax": 0,
    "prior_sales": [{"date":"","price":0}],
    "zestimate": 0,
    "lot_size": "",
    "features": []
  },
  "comps": [
    {
      "address": "",
      "sale_price": 0,
      "sqft": 0,
      "price_per_sf": 0,
      "beds": 0,
      "baths": 0,
      "year_built": 0,
      "condition": "",
      "sale_date": "",
      "dom": 0,
      "status": "Sold",
      "distance": "",
      "source": "WEB_SEARCH",
      "relevance_note": ""
    }
  ],
  "market_indicators": {
    "median_price": 0,
    "median_price_per_sf": 0,
    "avg_dom": 0,
    "yoy_change_pct": 0,
    "inventory_trend": "",
    "market_type": "",
    "active_similar_listings": 0
  },
  "rehab_benchmarks": {
    "cost_per_sf_low": 0,
    "cost_per_sf_mid": 0,
    "cost_per_sf_high": 0,
    "source": ""
  },
  "search_queries_used": [],
  "data_quality_notes": ""
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
          },
        ],
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(
        `Anthropic API error (${response.status}):`,
        errorData
      );
      return NextResponse.json(
        { error: "Failed to call Anthropic API" },
        { status: 500 }
      );
    }

    const data = await response.json();

    // Extract text content from response
    let jsonContent = "";
    if (data.content && Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block.type === "text") {
          jsonContent += block.text;
        }
      }
    }

    if (!jsonContent) {
      console.error("No text content in Anthropic response");
      return NextResponse.json(
        { error: "No analysis data returned from API" },
        { status: 500 }
      );
    }

    // Robust JSON extraction
    const jsonStart = jsonContent.indexOf("{");
    const jsonEnd = jsonContent.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
      console.error("Could not find JSON in response:", jsonContent.substring(0, 500));
      return NextResponse.json(
        { error: "Invalid response format from analysis" },
        { status: 500 }
      );
    }

    const jsonStr = jsonContent.substring(jsonStart, jsonEnd + 1);
    let analysisData: MarketAnalysisResponse;

    try {
      analysisData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Failed JSON string:", jsonStr.substring(0, 500));
      return NextResponse.json(
        { error: "Failed to parse analysis response" },
        { status: 500 }
      );
    }

    const timing = Date.now() - start;
    console.log(`Step 1 completed in ${timing}ms`);

    return NextResponse.json({
      data: analysisData,
      timing,
    });
  } catch (error) {
    console.error("Step 1 error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: `Analysis failed: ${message}` },
      { status: 500 }
    );
  }
}
