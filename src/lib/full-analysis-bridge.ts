import type { PipelineDeal, MLSComp } from "./types";

/**
 * Generates a prompt with ALL deal data for pasting into Claude chat.
 * The flip-deal-analyzer skill will fire automatically when this is pasted.
 */
export function generateFullAnalysisPrompt(deal: PipelineDeal): string {
  const lines: string[] = [
    `Analyze this flip: ${deal.address}`,
    ``,
    `Asking price: $${deal.asking_price?.toLocaleString()}`,
  ];

  if (deal.beds) lines.push(`Beds: ${deal.beds}`);
  if (deal.baths) lines.push(`Baths: ${deal.baths}`);
  if (deal.sqft) lines.push(`SqFt: ${deal.sqft?.toLocaleString()}`);
  if (deal.year_built) lines.push(`Year Built: ${deal.year_built}`);
  if ((deal as any).lot_size) lines.push(`Lot Size: ${(deal as any).lot_size}`);
  if (deal.estimated_arv) lines.push(`Wholesaler ARV estimate: $${deal.estimated_arv.toLocaleString()}`);
  if (deal.estimated_rehab) lines.push(`Wholesaler rehab estimate: $${deal.estimated_rehab.toLocaleString()}`);
  if (deal.source) lines.push(`Source: ${deal.source}${deal.source_contact ? ` (${deal.source_contact})` : ""}`);
  if (deal.listing_url) lines.push(`Zillow/Redfin link: ${deal.listing_url}`);
  if (deal.notes) lines.push(`Notes: ${deal.notes}`);

  // Include CMA comps if available
  if (deal.cma_comps && deal.cma_comps.length > 0) {
    lines.push(``);
    lines.push(`MLS Comps (from uploaded CMA — verified):`);
    deal.cma_comps.forEach((c: MLSComp, i: number) => {
      const parts = [`${i + 1}. ${c.address}`];
      if (c.sale_price) parts.push(`$${c.sale_price.toLocaleString()}`);
      if (c.sqft) parts.push(`${c.sqft}sf`);
      if (c.price_per_sf) parts.push(`$${c.price_per_sf}/sf`);
      if (c.beds) parts.push(`${c.beds}bd`);
      if (c.baths) parts.push(`${c.baths}ba`);
      if (c.dom != null) parts.push(`${c.dom} DOM`);
      if (c.condition) parts.push(c.condition);
      if (c.sale_date) parts.push(c.sale_date);
      lines.push(parts.join(" | "));
    });
  }

  return lines.join("\n");
}

/**
 * Copies the prompt to clipboard and optionally opens Claude in a new tab.
 */
export async function launchFullAnalysis(
  deal: PipelineDeal,
  toast: (msg: string, type?: "success" | "error") => void
): Promise<void> {
  const prompt = generateFullAnalysisPrompt(deal);

  try {
    await navigator.clipboard.writeText(prompt);
    toast("Deal data copied to clipboard! Paste it into Claude.");

    // Open Claude in a new tab
    window.open("https://claude.ai/new", "_blank");
  } catch {
    // Clipboard API may fail on some mobile browsers
    // Fall back to execCommand copy
    const textarea = document.createElement("textarea");
    textarea.value = prompt;
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);

    toast("Deal data copied! Paste it into Claude.");
    window.open("https://claude.ai/new", "_blank");
  }
}
