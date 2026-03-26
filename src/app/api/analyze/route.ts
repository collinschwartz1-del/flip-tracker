import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 45; // Vercel Pro allows up to 60s, set to 45 for safety

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json({ error: "No prompt provided" }, { status: 400 });
    }

    // Verify API key exists
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY is not set");
      return NextResponse.json(
        { error: "Server configuration error — API key missing" },
        { status: 500 }
      );
    }

    console.log("Starting analysis, prompt length:", prompt.length);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000, // Reduced from 6000 — Quick Screen needs less
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
          },
        ],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      return NextResponse.json(
        { error: `Analysis service error (${response.status}). Try again in a moment.` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract text content only (skip tool_use and tool_result blocks)
    const textBlocks = data.content?.filter(
      (c: any) => c.type === "text"
    ) || [];
    const textContent = textBlocks.map((c: any) => c.text || "").join("");

    if (!textContent) {
      console.error("No text content in response. Blocks:", JSON.stringify(data.content?.map((c: any) => c.type)));
      return NextResponse.json(
        { error: "Analysis returned no results. Try again." },
        { status: 500 }
      );
    }

    console.log("Analysis complete, response length:", textContent.length);

    return NextResponse.json({ content: textContent });
  } catch (error: any) {
    console.error("Analysis route error:", error);
    return NextResponse.json(
      { error: "Analysis failed — check your connection and try again." },
      { status: 500 }
    );
  }
}
