import { NextRequest } from "next/server";

// Edge Runtime: 30s limit on free tier (vs 10s for serverless)
// Also supports streaming which keeps the connection alive
export const runtime = "edge";

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
          signal: AbortSignal.timeout(8000),
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

          fullPrompt += `\n\nPROPERTY LISTING DATA (from ${listing_url} — treat as WEB_SEARCH):\n${cleaned}\n\nUse this listing data to: validate/adjust ARV, check prior sale history, use exact tax amount for holding costs, note property features for rehab scope.`;
        } else {
          fullPrompt +=
            `\n\n[NOTE: Listing URL (${listing_url}) returned HTTP ${pageRes.status}. Proceed with available data and use web search to find property info.]`;
        }
      } catch (fetchErr: any) {
        fullPrompt +=
          "\n\n[NOTE: A Zillow/Redfin URL was provided but could not be fetched. Proceed with available data and use web search to find property info.]";
      }
    }

    // Call Anthropic API with streaming enabled
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
        stream: true,
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
      return new Response(
        JSON.stringify({ error: `Anthropic API error: ${response.status}`, detail: error }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Stream the Anthropic SSE response, collecting text blocks and forwarding
    // progress events to the client as newline-delimited JSON (NDJSON)
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        let buffer = "";
        let collectedText = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;

              try {
                const event = JSON.parse(data);

                // Collect text deltas
                if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
                  collectedText += event.delta.text || "";
                  // Send progress ping to keep connection alive
                  controller.enqueue(encoder.encode(`data: {"type":"progress"}\n\n`));
                }

                // On message_stop, send the final collected text
                if (event.type === "message_stop") {
                  const payload = JSON.stringify({ type: "done", content: collectedText });
                  controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
                }

                // Forward errors
                if (event.type === "error") {
                  const payload = JSON.stringify({ type: "error", error: event.error?.message || "Unknown streaming error" });
                  controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
                }
              } catch {
                // Skip malformed SSE lines
              }
            }
          }

          // If stream ended without message_stop, send what we have
          if (collectedText) {
            const payload = JSON.stringify({ type: "done", content: collectedText });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
        } catch (err: any) {
          const payload = JSON.stringify({ type: "error", error: err.message || "Stream read error" });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Unknown analysis error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
