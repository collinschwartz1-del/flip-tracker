import type { ConfidenceLevel } from "@/lib/types";
import type { PipelineDeal } from "@/lib/types";

interface EnrichmentContext {
  hasCMAComps: boolean;
  hasListingUrl: boolean;
  hasPhotos: boolean;
  hasContractorBid: boolean;
}

export function getEnrichmentContext(deal: PipelineDeal, photoCount: number): EnrichmentContext {
  return {
    hasCMAComps: (deal.cma_comps?.length || 0) > 0,
    hasListingUrl: !!deal.listing_url,
    hasPhotos: photoCount > 0,
    hasContractorBid: false,
  };
}

export function getEffectiveConfidence(
  field: string,
  baseConfidence: ConfidenceLevel,
  ctx: EnrichmentContext
): ConfidenceLevel {
  switch (field) {
    case "comps":
      if (ctx.hasCMAComps) return "MLS_VERIFIED";
      return baseConfidence;

    case "arv":
      if (ctx.hasCMAComps) return "MLS_VERIFIED";
      if (ctx.hasListingUrl) return "WEB_SEARCH";
      return baseConfidence;

    case "holding_costs":
      if (ctx.hasListingUrl) return "WEB_SEARCH";
      return baseConfidence;

    case "rehab":
      if (ctx.hasContractorBid) return "CONTRACTOR_BID";
      if (ctx.hasPhotos) return "PHOTO_VERIFIED";
      return baseConfidence;

    case "market_data":
      return baseConfidence === "ASSUMED" || baseConfidence === "ESTIMATED"
        ? "WEB_SEARCH"
        : baseConfidence;

    default:
      return baseConfidence;
  }
}

export function getEffectiveTier(
  baseTier: string,
  ctx: EnrichmentContext
): { tier: string; upgrades: string[] } {
  const upgrades: string[] = [];

  if (ctx.hasCMAComps) upgrades.push("MLS comps loaded → ARV validation upgraded");
  if (ctx.hasListingUrl) upgrades.push("Listing data loaded → tax/property data upgraded");
  if (ctx.hasPhotos) upgrades.push("Photos available → rehab confidence upgraded");
  if (ctx.hasContractorBid) upgrades.push("Contractor bid → rehab estimate verified");

  let effectiveTier = baseTier;
  if (ctx.hasCMAComps && ctx.hasPhotos) effectiveTier = "Tier 3";
  else if (ctx.hasCMAComps || ctx.hasPhotos || ctx.hasListingUrl) effectiveTier = "Tier 2";

  return { tier: effectiveTier, upgrades };
}
