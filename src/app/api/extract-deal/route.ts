import { NextRequest, NextResponse } from "next/server";

const EXTRACTION_PROMPT = `You are a real estate deal sheet data extractor. Extract structured property information from the provided content and respond ONLY with a JSON object (no markdown, no backticks, no preamble).

Extract these fields. Use null for any field you cannot find:

{
  "address": "Full street address including city, state, zip",
  "asking_price": 0,
  "beds": 0,
  "baths": 0,
  "sqft": 0,
  "year_built": 0,
  "lot_size": "string description like '8,850 SF' or '0.15 acres'",
  "estimated_arv": 0,
  "estimated_rehab": 0,
  "description": "Property description if available, max 500 chars",
  "source": "Wholesaler company or platform name",
  "source_contact": "Wholesaler name + phone if available",
  "photo_urls": ["array of image URLs if found"],
  "property_type": "Single Family, Duplex, etc.",
  "notes": "Any other relevant info: deadline, assignment fee, special terms, etc."
}

RULES:
- asking_price should be the contract/assignment price, NOT the ARV
- If you see both a "price" and an "ARV", price = asking_price and ARV = estimated_arv
- If there's a "spread" mentioned, that's ARV minus asking_price (don't store separately)
- Phone numbers should include area code
- For photo_urls, only include direct image URLs (ending in .jpg, .jpeg, .png, .webp, or containing image hosting domains)
- If the content is unclear or you're not confident in a value, use null
- Respond with ONLY the JSON object`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, image_base64, image_media_type } = body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    let messages: any[];

    if (url) {
      // --- URL MODE: Fetch the page and extract ---
      const pageResponse = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; FlipTracker/1.0; +https://acreagebrothers.com)",
        },
      });

      if (!pageResponse.ok) {
        return NextResponse.json(
          { error: `Could not fetch URL: ${pageResponse.status}` },
          { status: 400 }
        );
      }

      const html = await pageResponse.text();

      // Strip scripts, styles, and excessive whitespace to reduce token usage
      const cleanedHtml = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<nav[\s\S]*?<\/nav>/gi, "")
        .replace(/<footer[\s\S]*?<\/footer>/gi, "")
        .replace(/\s+/g, " ")
        .slice(0, 15000); // Cap at ~15K chars to control cost

      messages = [
        {
          role: "user",
          content: `Extract deal information from this wholesaler deal sheet webpage.\n\nURL: ${url}\n\nPage content:\n${cleanedHtml}`,
        },
      ];
    } else if (image_base64 && image_media_type) {
      // --- IMAGE MODE: Send image to Claude for vision extraction ---
      messages = [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image_media_type,
                data: image_base64,
              },
            },
            {
              type: "text",
              text: "Extract deal information from this real estate deal sheet screenshot or photo.",
            },
          ],
        },
      ];
    } else {
      return NextResponse.json(
        { error: "Provide either a 'url' or 'image_base64' + 'image_media_type'" },
        { status: 400 }
      );
    }

    // Call Anthropic API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: EXTRACTION_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      return NextResponse.json(
        { error: `AI extraction failed: ${response.status} - ${errorText}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const text = data.content
      ?.map((c: any) => c.text || "")
      .filter(Boolean)
      .join("");

    // Parse the JSON response
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const extracted = JSON.parse(cleaned);

    return NextResponse.json({ success: true, data: extracted });
  } catch (error: any) {
    console.error("Extract deal error:", error);
    return NextResponse.json(
      { error: error.message || "Extraction failed" },
      { status: 500 }
    );
  }
}
