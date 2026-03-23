import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { analysis } = await req.json();

    if (!analysis) {
      return NextResponse.json(
        { error: "Brand analysis data is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey });

    const prompt = `You are a world-class direct response strategist who specializes in native advertising funnels. You deeply understand customer psychology, emotional buying triggers, and advertorial architecture.

You have been given a comprehensive brand analysis. Your job is to identify the 5 best customer avatars to target with advertorial campaigns.

=== BRAND ANALYSIS ===
${JSON.stringify(analysis, null, 2)}

=== YOUR TASK ===

Generate exactly 5 distinct customer avatars. Each avatar represents a different psychological entry point into the product.

These are NOT generic demographics. Each avatar is a STORY — a specific person with a specific life situation that makes them emotionally ready to buy.

For each avatar, think about:
- What specific life moment makes them ready to buy NOW (not someday)?
- What have they already tried and failed with?
- What emotional wound does the product heal for them?
- What's the "Lily's whisper" moment — the devastating micro-moment that breaks their heart?

Return a JSON array (no markdown fences) with exactly 5 objects, each with this structure:

[
  {
    "id": "avatar-1",
    "name": "The [Descriptive Name]",
    "age": 55,
    "profession": "Retired elementary school teacher",
    "lifeSituation": "2-3 sentences describing their specific life context right now",
    "triggerMoment": "The specific recent event that made them start looking for a solution",
    "emotionalWound": "The deeper identity/connection loss they're experiencing",
    "failedAttempts": ["What they've already tried"],
    "heartbreakMoment": "The 'Lily's whisper' — the specific devastating micro-moment to use in the advertorial",
    "buyingMotivation": "What they're really buying — not the product, but what it gives back to them",
    "characterDetails": {
      "firstName": "A realistic first name",
      "definingDetail": "One vivid professional/life detail that makes them feel real (e.g., 'designed cathedrals')",
      "lovedOne": "The specific person in their life the story centers around",
      "lovedOneRelationship": "granddaughter / spouse / best friend / etc."
    },
    "advertorialAngle": "The headline angle for this avatar's advertorial",
    "expectedResonance": "Why this avatar will convert — which emotional lever does it pull?"
  }
]

RULES:
- Each avatar must target a DIFFERENT emotional entry point
- At least one avatar should be the primary buyer, one should be someone buying FOR a loved one
- Ages and life situations must be realistic for the product's actual market
- The heartbreak moments must be specific enough to make someone's chest tight
- Character details must be precise enough that fiction feels like journalism
- DO NOT use generic marketing personas. These are STORY SEEDS for advertorials.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 6000,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse the JSON array
    let avatars;
    try {
      const cleaned = rawText
        .replace(/^```(?:json)?\s*\n?/m, "")
        .replace(/\n?```\s*$/m, "")
        .trim();
      avatars = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse avatar data from AI response" },
        { status: 500 }
      );
    }

    if (!Array.isArray(avatars) || avatars.length === 0) {
      return NextResponse.json(
        { error: "AI did not return valid avatar array" },
        { status: 500 }
      );
    }

    return NextResponse.json({ avatars });
  } catch (error) {
    console.error("Avatar generation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Avatar generation failed" },
      { status: 500 }
    );
  }
}
