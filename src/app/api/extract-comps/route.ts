import { NextRequest, NextResponse } from "next/server";

const EXTRACTION_PROMPT = `You are a real estate comp data extractor. You are reading a CMA (Comparative Market Analysis) or comp report exported from an MLS system (likely Paragon/GPRMLS).

Extract EVERY comparable property from this document. For each comp, extract as many of these fields as available:

Respond ONLY with a JSON array (no markdown, no backticks, no preamble):

[
  {
    "address": "Full street address",
    "sale_price": 0,
    "list_price": 0,
    "sqft": 0,
    "price_per_sf": 0,
    "beds": 0,
    "baths": 0,
    "year_built": 0,
    "sale_date": "YYYY-MM-DD",
    "list_date": "YYYY-MM-DD",
    "dom": 0,
    "lot_size": "",
    "condition": "Brief condition/renovation notes if mentioned",
    "status": "Sold or Active or Pending",
    "garage": "",
    "basement": "",
    "style": "Ranch, Split-level, 2-Story, etc.",
    "distance": "Distance from subject if shown",
    "mls_number": "",
    "notes": "Any other relevant details"
  }
]

RULES:
- Extract ALL properties shown in the document, not just a sample
- sale_price is the CLOSED sale price (not list price)
- If a field is not available in the document, use null
- price_per_sf should be calculated as sale_price / sqft if not explicitly shown
- DOM = Days on Market
- sale_date should be the closing date, not the listing date
- Include both sold AND active comps if the report contains both — mark the status field accordingly
- If the document includes a subject property (the property being analyzed), exclude it from the comp array
- If you cannot extract any comps, return an empty array []`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdf_base64 } = body;

    if (!pdf_base64) {
      return NextResponse.json(
        { error: "No PDF data provided" },
        { status: 400 }
      );
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
        system: EXTRACTION_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: pdf_base64,
                },
              },
              {
                type: "text",
                text: "Extract all comparable properties from this CMA/comp report.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", errorText);
      return NextResponse.json(
        { error: `AI extraction failed: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const text = data.content
      ?.map((c: any) => c.text || "")
      .filter(Boolean)
      .join("");

    const cleaned = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    const comps = JSON.parse(cleaned);

    return NextResponse.json({ success: true, comps });
  } catch (error: any) {
    console.error("Extract comps error:", error);
    return NextResponse.json(
      { error: error.message || "Extraction failed" },
      { status: 500 }
    );
  }
}
