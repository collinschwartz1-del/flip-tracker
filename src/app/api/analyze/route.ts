import { NextRequest, NextResponse } from "next/server";

// Increase Vercel function timeout (requires Pro plan for >10s)
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, listing_url } = body;

    console.log("[analyze] Starting analysis, prompt length:", prompt?.length);
    console.log("[analyze] API key exists:", !!process.env.ANTHROPIC_API_KEY);
    console.log("[analyze] Listing URL:", listing_url || "none");

    let fullPrompt = prompt;

    // If a Zillow/Redfin URL is provided, fetch and inject the content
    if (listing_url) {
      try {
        console.log("[analyze] Fetching listing URL...");
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout for URL fetch

        const pageRes = await fetch(listing_url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);
        console.log("[analyze] Listing fetch status:", pageRes.status);

        if (pageRes.ok) {
          const html = await pageRes.text();
          console.log("[analyze] Listing content length:", html.length);
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

          // Always append listing data to the prompt
          fullPrompt += `\n\nPROPERTY LISTING DATA (from ${listing_url} — treat as WEB_SEARCH):\n${cleaned}\n\nUse this listing data to: validate/adjust ARV, check prior sale history, use exact tax amount for holding costs, note property features for rehab scope.`;
        } else {
          console.warn("[analyze] Listing fetch failed with status:", pageRes.status);
          fullPrompt +=
            `\n\n[NOTE: Listing URL (${listing_url}) returned HTTP ${pageRes.status}. Proceed with available data and use web search to find property info.]`;
        }
      } catch (fetchErr: any) {
        console.warn("[analyze] Could not fetch listing URL:", fetchErr.message);
        fullPrompt +=
          "\n\n[NOTE: A Zillow/Redfin URL was provided but could not be fetched. Proceed with available data and use web search to find property info.]";
      }
    }

    console.log("[analyze] Final prompt length:", fullPrompt.length);
    console.log("[analyze] Calling Anthropic API...");

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

    console.log("[analyze] Anthropic response status:", response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error("[analyze] Anthropic API error:", response.status, error);
      return NextResponse.json(
        { error: `Anthropic API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract text content from response
    // When web search is used, response may contain tool_use + tool_result + text blocks
    // We only need the final text block(s) which contain the JSON
    const allBlocks = data.content || [];
    console.log("[analyze] Response block types:", allBlocks.map((c: any) => c.type).join(", "));

    const textContent = allBlocks
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text || "")
      .join("") || "";

    console.log("[analyze] Extracted text length:", textContent.length);

    if (!textContent) {
      console.error("[analyze] No text content in response. Stop reason:", data.stop_reason);
      return NextResponse.json(
        { error: "AI returned no text content. It may have only performed web searches without producing a final answer. Try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ content: textContent });
  } catch (error: any) {
    console.error("[analyze] Analysis API error:", error.message, error.stack);
    return NextResponse.json(
      { error: error.message || "Unknown analysis error" },
      { status: 500 }
    );
  }
}
