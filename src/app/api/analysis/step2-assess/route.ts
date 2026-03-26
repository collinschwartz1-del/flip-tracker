export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';

interface Step2Request {
  deal: {
    address: string;
    askingPrice: number;
    beds: number;
    baths: number;
    sqft: number;
    yearBuilt: number;
    condition?: string;
    notes?: string;
  };
  step1Data: {
    comps: Array<{
      address: string;
      soldPrice: number;
      soldDate: string;
      beds: number;
      baths: number;
      sqft: number;
      pricePerSqft: number;
      daysOnMarket: number;
    }>;
    marketIndicators: {
      averagePricePerSqft: number;
      priceRange: { low: number; high: number };
      marketTrend: string;
      absorptionRate: number;
    };
    propertyData: {
      taxValue: number;
      taxRate: number;
      yearBuilt: number;
      condition: string;
      features: string[];
      redFlags: string[];
    };
    rehabBenchmarks: {
      lightCostPerSqft: number;
      moderateCostPerSqft: number;
      heavyCostPerSqft: number;
      lightTimeWeeks: number;
      moderateTimeWeeks: number;
      heavyTimeWeeks: number;
      contingencyLight: number;
      contingencyModerate: number;
      contingencyHeavy: number;
    };
  };
  cmaComps?: Array<{
    address: string;
    soldPrice: number;
    soldDate: string;
    beds: number;
    baths: number;
    sqft: number;
    pricePerSqft: number;
    mlsNumber?: string;
  }>;
  calibrationText?: string;
}

interface Step2Response {
  arv_validation: {
    independent_arv_low: number;
    independent_arv_base: number;
    independent_arv_high: number;
    median_renovated_psf: number;
    methodology: string;
    seller_arv_assessment: string;
    constraints: string[];
    comps_used: string[];
  };
  rehab_assessment: {
    confidence: string;
    confidence_note: string;
    light: {
      cost: number;
      contingency_pct: number;
      timeline_weeks: number;
      scope: string;
    };
    moderate: {
      cost: number;
      contingency_pct: number;
      timeline_weeks: number;
      scope: string;
    };
    heavy: {
      cost: number;
      contingency_pct: number;
      timeline_weeks: number;
      scope: string;
    };
  };
  holding_costs: {
    monthly_taxes: number;
    monthly_insurance: number;
    monthly_utilities: number;
    monthly_lawn_snow: number;
    source: string;
    notes: string;
  };
  risk_tests: Array<{
    name: string;
    rating: string;
    detail: string;
    cost_impact: string;
    data_gap: boolean;
  }>;
  property_profile: {
    condition_notes: string;
    key_features: string[];
    red_flags: string[];
  };
  data_tier: {
    tier: string;
    confidence: string;
    present: string[];
    missing: Array<{
      item: string;
      severity: string;
      how_to_fix: string;
    }>;
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: Step2Request = await request.json();

    if (!body.deal || !body.step1Data) {
      return NextResponse.json(
        { error: 'Missing required fields: deal or step1Data' },
        { status: 400 }
      );
    }

    // Build the analysis prompt with all required data
    const prompt = buildAnalysisPrompt(body);

    // Call Anthropic API without web_search tool
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorBody = await anthropicResponse.text();
      console.error('Anthropic API error:', anthropicResponse.status, errorBody);
      return NextResponse.json(
        { error: `Anthropic API error: ${anthropicResponse.status}` },
        { status: 500 }
      );
    }

    const anthropicData = await anthropicResponse.json();

    // Extract JSON from response using robust parsing
    const textContent = anthropicData.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');

    if (!textContent) {
      return NextResponse.json(
        { error: 'No text content in API response' },
        { status: 500 }
      );
    }

    // Parse JSON using indexOf/lastIndexOf for robustness
    const jsonStart = textContent.indexOf('{');
    const jsonEnd = textContent.lastIndexOf('}') + 1;

    if (jsonStart === -1 || jsonEnd <= jsonStart) {
      console.error('JSON extraction failed. Response:', textContent.substring(0, 500));
      return NextResponse.json(
        { error: 'Failed to extract JSON from API response' },
        { status: 500 }
      );
    }

    const jsonString = textContent.substring(jsonStart, jsonEnd);
    const parsed: Step2Response = JSON.parse(jsonString);

    const timing = Date.now() - startTime;

    return NextResponse.json(
      {
        data: parsed,
        timing,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Step2 analysis error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Analysis failed: ${message}` },
      { status: 500 }
    );
  }
}

function buildAnalysisPrompt(body: Step2Request): string {
  const { deal, step1Data, cmaComps, calibrationText } = body;

  // Format comps
  let compsText = '';
  if (cmaComps && cmaComps.length > 0) {
    compsText += '## MLS_VERIFIED Comps (Higher Confidence):\n';
    cmaComps.forEach((comp) => {
      compsText += `- ${comp.address}: $${comp.soldPrice.toLocaleString()} (${comp.sqft} sqft, $${comp.pricePerSqft.toFixed(2)}/sqft) sold ${comp.soldDate}${comp.mlsNumber ? ` MLS#${comp.mlsNumber}` : ''}\n`;
    });
    compsText += '\n';
  }

  if (step1Data.comps && step1Data.comps.length > 0) {
    compsText += '## Market Comps (Step 1 Analysis):\n';
    step1Data.comps.forEach((comp) => {
      compsText += `- ${comp.address}: $${comp.soldPrice.toLocaleString()} (${comp.sqft} sqft, $${comp.pricePerSqft.toFixed(2)}/sqft) sold ${comp.soldDate}\n`;
    });
  }

  // Format calibration if provided
  let calibrationSection = '';
  if (calibrationText && calibrationText.trim()) {
    calibrationSection = `## Learning System Calibration Notes:\n${calibrationText}\n\n`;
  }

  const prompt = `You are a professional real estate investment analyst specializing in flip deals in Omaha, Nebraska. Perform a comprehensive Step 2 assessment covering property valuation, rehab scenarios, holding costs, and risk analysis.

## SUBJECT PROPERTY
- Address: ${deal.address}
- Asking Price: $${deal.askingPrice.toLocaleString()}
- Beds/Baths: ${deal.beds}/${deal.baths}
- Square Footage: ${deal.sqft.toLocaleString()} sqft
- Year Built: ${deal.yearBuilt}
${deal.condition ? `- Condition: ${deal.condition}` : ''}
${deal.notes ? `- Notes: ${deal.notes}` : ''}

## STEP 1 DATA PROVIDED

### Market Indicators:
- Average Price Per SqFt: $${step1Data.marketIndicators.averagePricePerSqft.toFixed(2)}
- Price Range: $${step1Data.marketIndicators.priceRange.low.toLocaleString()} - $${step1Data.marketIndicators.priceRange.high.toLocaleString()}
- Market Trend: ${step1Data.marketIndicators.marketTrend}
- Absorption Rate: ${(step1Data.marketIndicators.absorptionRate * 100).toFixed(1)}%

### Property Tax & Condition Data:
- Tax Assessed Value: $${step1Data.propertyData.taxValue.toLocaleString()}
- Annual Tax Rate: ${(step1Data.propertyData.taxRate * 100).toFixed(2)}%
- Year Built: ${step1Data.propertyData.yearBuilt}
- Condition Assessment: ${step1Data.propertyData.condition}
- Features: ${step1Data.propertyData.features.join(', ') || 'None listed'}
- Red Flags: ${step1Data.propertyData.redFlags.length > 0 ? step1Data.propertyData.redFlags.join(', ') : 'None identified'}

### Rehab Benchmarks (Step 1 Market Analysis):
- Light: $${step1Data.rehabBenchmarks.lightCostPerSqft.toFixed(2)}/sqft, ${step1Data.rehabBenchmarks.lightTimeWeeks} weeks
- Moderate: $${step1Data.rehabBenchmarks.moderateCostPerSqft.toFixed(2)}/sqft, ${step1Data.rehabBenchmarks.moderateTimeWeeks} weeks
- Heavy: $${step1Data.rehabBenchmarks.heavyCostPerSqft.toFixed(2)}/sqft, ${step1Data.rehabBenchmarks.heavyTimeWeeks} weeks
- Contingencies: Light ${(step1Data.rehabBenchmarks.contingencyLight * 100).toFixed(0)}%, Moderate ${(step1Data.rehabBenchmarks.contingencyModerate * 100).toFixed(0)}%, Heavy ${(step1Data.rehabBenchmarks.contingencyHeavy * 100).toFixed(0)}%

${compsText}

${calibrationSection}

## OMAHA-SPECIFIC RULES
- Pre-1960 properties: significant foundation risk assessment required
- Pre-1978 properties: lead paint abatement $3,000-$5,000
- Radon testing/mitigation: $150 inspection + $1,200-$2,500 remediation (foundation-dependent)
- Winter construction: adds 2-4 weeks to timeline (Nov-Mar)
- Selling costs: 8% of sale price (realtor, title, etc.)
- Hard money terms: 90% LTV, 12% APR, 2 points
- Standard contingency: 10% (light), 15% (moderate), 25% (heavy)

## YOUR TASK

Perform the following analysis and return ONLY valid JSON (no markdown, no explanation):

### 1. ARV VALIDATION
- Calculate independent ARV using: (median comp $/sqft) × (subject sqft) with LOW, BASE, HIGH scenarios
- Account for condition adjustments vs. renovated comps
- Assess if seller's asking price aligns with ARV
- List which comps you used and why
- Document any constraints (limited data, market conditions, time lag)

### 2. REHAB ASSESSMENT (Light/Moderate/Heavy Scenarios)
- Use Step 1 benchmarks as foundation
- Adjust based on subject property condition and age
- For each scenario: total cost, contingency %, timeline, scope description
- Confidence level based on data quality (LOW/MEDIUM/HIGH)

### 3. HOLDING COSTS (Monthly During Construction + Carrying)
- Taxes: annual property tax / 12
- Insurance: $150/month (standard estimate if unknown)
- Utilities: $200/month (vacant, minimal)
- Lawn/Snow: $100/month (seasonal Omaha winter costs)
- Source: TAX_RECORDS (if from assessor) or ESTIMATED
- Include notes on assumptions

### 4. RISK TESTS
Test each risk area and rate as LOW/MEDIUM/HIGH/CRITICAL:
- Age & Foundation (pre-1960 = automatic flag)
- Lead Paint (pre-1978 = $3-5K cost impact)
- Radon Risk (Omaha radon zone, $1,200+ mitigation)
- Environmental Issues (prior use, site conditions)
- Market Liquidity (area absorption, demand)
- Financing Risk (hard money terms 90% LTV 12%)
- Construction Timeline Risk (winter delay 2-4 weeks)
- Title/Legal Issues (liens, easements)

For each: name, rating, detail, cost_impact estimate, data_gap flag

### 5. PROPERTY PROFILE & DATA TIER
- Summarize condition, key features, red flags
- Assign data tier: Tier 1 (full tax, comps, interior), Tier 2 (partial), Tier 3 (limited)
- List present data categories
- List missing items with severity (CRITICAL/HIGH/MEDIUM) and how to fix

## RESPONSE FORMAT

Return ONLY this JSON structure (valid, parseable JSON):

\`\`\`json
{
  "arv_validation": {
    "independent_arv_low": <number>,
    "independent_arv_base": <number>,
    "independent_arv_high": <number>,
    "median_renovated_psf": <number>,
    "methodology": "<string>",
    "seller_arv_assessment": "Aligns|Slightly Aggressive|Aggressive|Very Aggressive",
    "constraints": [<string>],
    "comps_used": [<string>]
  },
  "rehab_assessment": {
    "confidence": "LOW|MEDIUM|HIGH",
    "confidence_note": "<string>",
    "light": {
      "cost": <number>,
      "contingency_pct": 0.10,
      "timeline_weeks": <number>,
      "scope": "<string>"
    },
    "moderate": {
      "cost": <number>,
      "contingency_pct": 0.15,
      "timeline_weeks": <number>,
      "scope": "<string>"
    },
    "heavy": {
      "cost": <number>,
      "contingency_pct": 0.25,
      "timeline_weeks": <number>,
      "scope": "<string>"
    }
  },
  "holding_costs": {
    "monthly_taxes": <number>,
    "monthly_insurance": 150,
    "monthly_utilities": 200,
    "monthly_lawn_snow": 100,
    "source": "TAX_RECORDS|ESTIMATED",
    "notes": "<string>"
  },
  "risk_tests": [
    {
      "name": "<string>",
      "rating": "LOW|MEDIUM|HIGH|CRITICAL",
      "detail": "<string>",
      "cost_impact": "<string>",
      "data_gap": <boolean>
    }
  ],
  "property_profile": {
    "condition_notes": "<string>",
    "key_features": [<string>],
    "red_flags": [<string>]
  },
  "data_tier": {
    "tier": "Tier 1|2|3",
    "confidence": "LOW|MEDIUM|HIGH",
    "present": [<string>],
    "missing": [
      {
        "item": "<string>",
        "severity": "CRITICAL|HIGH|MEDIUM",
        "how_to_fix": "<string>"
      }
    ]
  }
}
\`\`\`

Begin analysis now.`;

  return prompt;
}
