import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, listing_url } = body;

    let fullPrompt = prompt;

    // If a Zillow/Redfin URL is provided, fetch and inject the content
    if (listing_url) {
      try {
        const pageRes = await fetch(listing_url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });

        if (pageRes.ok) {
          const html = await pageRes.text();
          const cleaned = html
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<nav[\s\S]*?<\/nav>/gi, "")
            .replace(/<footer[\s\S]*?<\/footer>/gi, "")
            .replace(/<header[\s\S]*?<\/header>/gi, "")
            .replace(/<!--[\s\S]*?-->/g, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 12000);

          // Inject listing data into prompt where the placeholder is
          if (fullPrompt.includes("PROPERTY LISTING DATA (from Zillow/Redfin")) {
            fullPrompt = fullPrompt.replace(
              "PROPERTY LISTING DATA (from Zillow/Redfin — treat as WEB_SEARCH):",
              `PROPERTY LISTING DATA (from Zillow/Redfin — treat as WEB_SEARCH):\n${cleaned}`
            );
          } else {
            fullPrompt += `\n\nPROPERTY LISTING DATA (from ${listing_url}):\n${cleaned}`;
          }
        }
      } catch (fetchErr) {
        console.warn("Could not fetch listing URL:", fetchErr);
        fullPrompt +=
          "\n\n[NOTE: A Zillow/Redfin URL was provided but could not be fetched. Proceed with available data.]";
      }
    }

    // Call Anthropic API with web search enabled
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 6000,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
          },
        ],
        messages: [{ role: "user", content: fullPrompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Anthropic API error:", error);
      return NextResponse.json(
        { error: `Anthropic API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract text content from response
    // When web search is used, response may contain tool_use + tool_result + text blocks
    // We only need the final text block(s) which contain the JSON
    const textContent = data.content
      ?.filter((c: any) => c.type === "text")
      ?.map((c: any) => c.text || "")
      ?.join("") || "";

    return NextResponse.json({ content: textContent });
  } catch (error: any) {
    console.error("Analysis API error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
