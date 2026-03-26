import type { PipelineDeal } from "./types";

/**
 * Builds a focused, concise screening prompt.
 * ~300 tokens of instructions (vs 4000+ in the old V2 prompt).
 * Designed to return in 15-20 seconds with web search.
 */
export function buildScreeningPrompt(deal: PipelineDeal): string {
  const parts: string[] = [
    `You are a flip deal screener for the Omaha, NE metro area. Quickly assess this deal. Use web search to find market data and comps. Respond ONLY with JSON (no markdown, no backticks, no preamble text).`,
    ``,
    `DEAL:`,
    `Address: ${deal.address}`,
    `Asking Price: $${deal.asking_price?.toLocaleString()}`,
  ];

  if (deal.beds) parts.push(`Beds: ${deal.beds}`);
  if (deal.baths) parts.push(`Baths: ${deal.baths}`);
  if (deal.sqft) parts.push(`SqFt: ${deal.sqft}`);
  if (deal.year_built) parts.push(`Year Built: ${deal.year_built}`);
  if (deal.estimated_arv) parts.push(`Seller ARV Claim: $${deal.estimated_arv.toLocaleString()}`);
  if (deal.estimated_rehab) parts.push(`Seller Rehab Claim: $${deal.estimated_rehab.toLocaleString()}`);
  if (deal.source) parts.push(`Source: ${deal.source}`);
  if (deal.notes) parts.push(`Notes: ${deal.notes}`);

  parts.push(``);
  parts.push(`OMAHA RULES: 8% selling costs. Pre-1960 = foundation risk. Pre-1978 = lead paint ($3-5K). Nebraska = radon ($150 test, $1200+ mitigation). Hard money default: 90% LTV, 12%, 2 points. Contingency: 10% light, 15% moderate, 25% heavy.`);
  parts.push(``);
  parts.push(`Search the web for: recent sold comps near this address, median home price for the area, and average days on market. Then assess the deal.`);
  parts.push(``);
  parts.push(`Return this exact JSON:`);
  parts.push(`{`);
  parts.push(`  "screen_verdict": "INVESTIGATE|PASS|DEAD",`);
  parts.push(`  "confidence": "LOW|MEDIUM|HIGH",`);
  parts.push(`  "estimated_arv_range": { "low": 0, "mid": 0, "high": 0 },`);
  parts.push(`  "arv_basis": "One sentence: how you estimated the ARV",`);
  parts.push(`  "estimated_rehab_range": { "light": 0, "moderate": 0, "heavy": 0 },`);
  parts.push(`  "estimated_profit_range": { "best_case": 0, "base_case": 0, "worst_case": 0 },`);
  parts.push(`  "market_snapshot": { "median_price": 0, "price_per_sf": 0, "avg_dom": 0, "trend": "rising|flat|declining" },`);
  parts.push(`  "top_risks": ["risk 1 — one sentence", "risk 2", "risk 3"],`);
  parts.push(`  "key_concern": "The single biggest issue with this deal in one sentence",`);
  parts.push(`  "worth_investigating_because": "Why this deal might work in one sentence",`);
  parts.push(`  "missing_critical_data": ["item 1", "item 2", "item 3"],`);
  parts.push(`  "comps_found": [{ "address": "", "price": 0, "sqft": 0, "beds": 0, "baths": 0, "condition": "", "date": "" }],`);
  parts.push(`  "quick_summary": "2-3 sentences. Be direct and adversarial. Is this worth the operator's time or not? What needs to be true for this deal to work?"`);
  parts.push(`}`);
  parts.push(``);
  parts.push(`CRITICAL: The wholesaler's ARV is a sales pitch. Validate independently from comps. If the deal only works at the top of the ARV range with minimum rehab, verdict is PASS. Be skeptical. The user is making real investment decisions.`);

  return parts.join("\n");
}
