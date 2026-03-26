import type { PipelineDeal, MLSComp } from "./types";

export function buildAnalysisPromptV2(
  deal: PipelineDeal,
  cmaComps?: MLSComp[],
  listingPageContent?: string
): string {
  let compSection = "";
  if (cmaComps && cmaComps.length > 0) {
    compSection = `\n\nREAL MLS COMP DATA (from uploaded CMA — treat as MLS_VERIFIED):
${cmaComps
  .map(
    (c, i) =>
      `${i + 1}. ${c.address} | ${c.status || "Sold"} ${c.sale_price ? "$" + c.sale_price.toLocaleString() : "N/A"} | ${c.sqft || "?"} SF | $${c.price_per_sf || "?"}/SF | ${c.beds || "?"}bd/${c.baths || "?"}ba | Built ${c.year_built || "?"} | ${c.dom || "?"} DOM | ${c.sale_date || ""} | ${c.condition || ""}`
  )
  .join("\n")}

CRITICAL: These are REAL MLS comps. Use them as the PRIMARY basis for ARV validation. Weight these heavily over web search data.`;
  }

  let listingSection = "";
  if (listingPageContent) {
    listingSection = `\n\nPROPERTY LISTING DATA (from Zillow/Redfin — treat as WEB_SEARCH):
${listingPageContent.slice(0, 10000)}

Use this data to: validate/adjust ARV, check prior sale history, use exact tax amount for holding costs, note property features for rehab scope.`;
  }

  return `You are an adversarial house flip analyst for Acreage Brothers in Omaha, NE.

DEAL:
- Address: ${deal.address}
- Asking Price: $${deal.asking_price?.toLocaleString()}
- Beds: ${deal.beds || "Unknown"}, Baths: ${deal.baths || "Unknown"}, SqFt: ${deal.sqft || "Unknown"}
- Year Built: ${deal.year_built || "Unknown"}
- Lot Size: ${deal.lot_size || "Unknown"}
- Seller/Wholesaler ARV Estimate: ${deal.estimated_arv ? "$" + deal.estimated_arv.toLocaleString() : "Not provided"}
- Seller/Wholesaler Rehab Estimate: ${deal.estimated_rehab ? "$" + deal.estimated_rehab.toLocaleString() : "Not provided"}
- Source: ${deal.source || "Unknown"}
- Notes: ${deal.notes || "None"}
${compSection}
${listingSection}

RESPOND ONLY WITH JSON (no markdown, no backticks, no preamble). Use the exact schema below.

YOUR JOB: Provide JUDGMENT and QUALITATIVE ASSESSMENT. The app computes all financial math from your inputs. Do NOT pre-calculate profits, ROI, or matrix cells. Return raw estimates and let the app do the arithmetic.

{
  "data_tier": {
    "tier": "Tier 1|Tier 2|Tier 3",
    "confidence": "LOW|MEDIUM|HIGH",
    "present": ["list what data is available, e.g. 'Address', 'Asking price', 'Basic specs'"],
    "missing": [
      {"item": "item name", "severity": "CRITICAL|HIGH|MEDIUM", "how_to_fix": "specific action to get this data"}
    ]
  },

  "property_profile": {
    "address": "${deal.address}",
    "beds": ${deal.beds || "null"},
    "baths": ${deal.baths || "null"},
    "sqft": ${deal.sqft || "null"},
    "year_built": ${deal.year_built || "null"},
    "lot_size": "${deal.lot_size || ""}",
    "property_type": "Single Family|Duplex|Townhome|etc",
    "condition_notes": "Your assessment of condition based on all available data",
    "key_features": ["notable features: garage type, basement, recent updates, HVAC age, roof, etc."],
    "red_flags": ["property-specific concerns based on age, location, condition notes"]
  },

  "market_snapshot": {
    "median_price": 0,
    "price_per_sf": 0,
    "avg_dom": 0,
    "yoy_change_pct": 0,
    "avg_home_value": 0,
    "inventory_trend": "rising|stable|declining",
    "market_type": "Seller|Balanced|Buyer",
    "active_competition": 0,
    "source": "WEB_SEARCH|MLS_VERIFIED",
    "notes": "2-3 sentence market context narrative — is this submarket rising, flat, or declining? What's the buyer demand like?"
  },

  "comps": {
    "source": "MLS_VERIFIED|WEB_SEARCH|ESTIMATED",
    "entries": [
      {
        "address": "Full address",
        "sale_price": 0,
        "sqft": 0,
        "price_per_sf": 0,
        "beds": 0,
        "baths": 0,
        "year_built": 0,
        "condition": "Renovated|Updated|Original|As-Is",
        "sale_date": "YYYY-MM-DD or 'Active'",
        "dom": 0,
        "status": "Sold|Active|Pending",
        "distance": "0.3 mi",
        "source": "MLS_VERIFIED|WEB_SEARCH",
        "relevance_note": "Why this comp matters or how it differs from subject"
      }
    ]
  },

  "arv_validation": {
    "independent_arv_low": 0,
    "independent_arv_base": 0,
    "independent_arv_high": 0,
    "median_renovated_psf": 0,
    "methodology": "Step-by-step: which comps used, what $/SF range, how you arrived at the number. Example: 'Renovated comps range $154-$188/SF. Median ~$165/SF. Subject 1,200 SF × $165 = $198,000.'",
    "seller_arv": ${deal.estimated_arv || "null"},
    "seller_arv_assessment": "Aligns|Slightly Aggressive|Aggressive|Very Aggressive",
    "constraints": ["constraints on ARV, e.g. '3BR/1BA limits buyer pool vs 2BA comps', 'No garage reduces appeal'"],
    "source": "MLS_VERIFIED|WEB_SEARCH|ESTIMATED"
  },

  "rehab_assessment": {
    "photos_available": false,
    "contractor_bid_available": false,
    "confidence": "LOW|MEDIUM|HIGH",
    "confidence_note": "Why this confidence level — e.g. 'No photos provided. Rehab estimated from property age and wholesaler description only.'",
    "light": {
      "cost": 0,
      "contingency_pct": 0.10,
      "timeline_weeks": 0,
      "scope": "Detailed scope: Paint interior ($3-4K), LVP flooring throughout ($4-5K), update fixtures ($1-2K), landscaping ($1K), minor touch-ups. Does NOT include any mechanical, structural, or major system work."
    },
    "moderate": {
      "cost": 0,
      "contingency_pct": 0.15,
      "timeline_weeks": 0,
      "scope": "Detailed scope: Everything in Light plus kitchen refresh ($8-12K: new countertops, cabinet paint/reface, appliances, backsplash), bathroom refresh ($3-5K per bath), minor plumbing updates, potential HVAC service."
    },
    "heavy": {
      "cost": 0,
      "contingency_pct": 0.25,
      "timeline_weeks": 0,
      "scope": "Detailed scope: Full gut cosmetic, complete kitchen remodel, bathroom remodel(s), possible rewire, possible replumb, foundation work if needed, all new mechanical. Worst-case scenario."
    }
  },

  "holding_costs": {
    "monthly_taxes": 0,
    "monthly_insurance": 150,
    "monthly_utilities": 200,
    "monthly_lawn_snow": 100,
    "source": "TAX_RECORDS|WEB_SEARCH|ESTIMATED",
    "notes": "How these were estimated. If tax records available from Zillow, use actual annual tax / 12."
  },

  "risk_tests": [
    {"name": "Rehab Scope Creep", "rating": "LOW|MEDIUM|HIGH|CRITICAL", "detail": "Explanation of risk", "cost_impact": "$X-$Y potential additional cost", "data_gap": true},
    {"name": "Foundation/Structural", "rating": "", "detail": "", "cost_impact": "", "data_gap": false},
    {"name": "Mechanical Systems", "rating": "", "detail": "", "cost_impact": "", "data_gap": false},
    {"name": "Roof", "rating": "", "detail": "", "cost_impact": "", "data_gap": false},
    {"name": "Environmental (Lead/Radon/Asbestos)", "rating": "", "detail": "", "cost_impact": "", "data_gap": false},
    {"name": "Market Timing", "rating": "", "detail": "", "cost_impact": "", "data_gap": false},
    {"name": "Holding Cost Bleed", "rating": "", "detail": "", "cost_impact": "", "data_gap": false},
    {"name": "ARV Compression", "rating": "", "detail": "", "cost_impact": "", "data_gap": false},
    {"name": "Competition at Exit", "rating": "", "detail": "", "cost_impact": "", "data_gap": false},
    {"name": "Permit & Code Risk", "rating": "", "detail": "", "cost_impact": "", "data_gap": false}
  ],

  "verdict": {
    "decision": "GO|CONDITIONAL GO|NO-GO",
    "conditions": ["3-5 specific conditions that must be true for this deal to work"],
    "summary": "2-3 paragraph plain English summary. What makes it attractive, what are the main risks, and what's the bottom line. Write for a busy operator who needs to decide in 5 minutes whether to pursue this deal further.",
    "data_upgrade_opportunities": [
      {"action": "What to do next", "impact": "How it improves analysis confidence and which data tier it upgrades to"}
    ]
  },

  "field_confidence": {
    "purchase_price": "USER_PROVIDED",
    "beds": "USER_PROVIDED|WEB_SEARCH|ASSUMED",
    "baths": "USER_PROVIDED|WEB_SEARCH|ASSUMED",
    "sqft": "USER_PROVIDED|WEB_SEARCH|ASSUMED",
    "year_built": "USER_PROVIDED|WEB_SEARCH|ASSUMED",
    "arv": "MLS_VERIFIED|WEB_SEARCH|USER_PROVIDED|ESTIMATED",
    "rehab": "CONTRACTOR_BID|PHOTO_VERIFIED|ESTIMATED|ASSUMED",
    "comps": "MLS_VERIFIED|WEB_SEARCH|ESTIMATED",
    "holding_costs": "TAX_RECORDS|WEB_SEARCH|ESTIMATED|ASSUMED",
    "market_data": "MLS_VERIFIED|WEB_SEARCH|ESTIMATED"
  }
}

OMAHA/NEBRASKA SPECIFICS:
- Pre-1960 = elevated foundation risk (possible stone foundation in Omaha). Rate foundation as HIGH risk minimum.
- Pre-1978 = lead paint. Budget $3-5K for testing + remediation. Flag automatically.
- Pre-1985 = possible asbestos. Flag if property in that range.
- Radon testing mandatory in Nebraska ($150 test, $1,200+ mitigation if needed). Always include in missing data.
- Winter (Nov-Mar) significantly slows exterior work and some interior work. Add 2-4 weeks to timeline if project spans winter.
- Douglas County reassesses regularly — post-renovation tax increase affects future buyer.
- West Omaha = premium $/SF ($180-220+). Midtown/Benson = gentrifying ($150-190). North/South Omaha = lower ($100-150).
- Selling costs = 8% total (3% listing agent + 3% buyer agent + 1% transfer tax + 1% title/closing).
- Hard money default: 90% LTV on purchase, 12% annual rate, 2 points origination.

YOUR CORE PRINCIPLES:
- If the flip only works at the top of the ARV range with the bottom of the rehab range, it doesn't work.
- The wholesaler's ARV is a sales pitch, not an appraisal. Validate independently.
- Missing data = risk factor, not assumption opportunity. Flag it, don't fill it with optimism.
- Photos don't lie, but they hide. Assume what you can't see is worse than what you can.
- Every extra month of hold compounds — model it explicitly.
- Do not optimize for making the deal work. Optimize for the truth.`;
}
