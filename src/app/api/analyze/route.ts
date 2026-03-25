import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, listing_url } = body;

    let listingContext = "";

    // If a Zillow/Redfin URL is provided, fetch and extract it
    if (listing_url) {
      try {
        const pageRes = await fetch(listing_url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });

        if (pageRes.ok) {
          const html = await pageRes.text();

          // Clean the HTML — strip scripts, styles, nav, ads
          const cleaned = html
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<nav[\s\S]*?<\/nav>/gi, "")
            .replace(/<footer[\s\S]*?<\/footer>/gi, "")
            .replace(/<header[\s\S]*?<\/header>/gi, "")
            .replace(/<!--[\s\S]*?-->/g, "")
            .replace(/<[^>]+>/g, " ") // Strip all remaining HTML tags
            .replace(/\s+/g, " ")     // Collapse whitespace
            .trim()
            .slice(0, 12000);         // Cap token usage

          listingContext = `\n\n--- PROPERTY LISTING DATA (from ${listing_url}) ---\n${cleaned}\n--- END LISTING DATA ---\n\nIMPORTANT: Use this listing data to:\n1. Validate or adjust the ARV using the Zestimate/Redfin Estimate and tax assessed value\n2. Check prior sale history (what the seller paid)\n3. Use exact property tax amount for holding cost calculations\n4. Note any property features (basement, garage, HVAC, roof) for rehab scope\n5. Flag any discrepancies between the listing data and the wholesaler's claims\n6. If the property has been listed on MLS before, note how long and at what price`;
        }
      } catch (fetchErr) {
        // Don't fail the whole analysis if the listing fetch fails
        console.warn("Could not fetch listing URL:", fetchErr);
        listingContext =
          "\n\n[NOTE: A Zillow/Redfin URL was provided but could not be fetched. Proceed with available data.]\n";
      }
    }

    // Append listing context to the existing prompt
    const fullPrompt = prompt + listingContext;

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
        messages: [{ role: "user", content: fullPrompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Anthropic API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
