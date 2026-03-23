import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { comments, keyword } = await req.json();

    if (!comments?.length) {
      return NextResponse.json({
        topQuestions: [],
        painPoints: [],
        desires: [],
        objections: [],
        sentimentSummary: "No comments available for analysis.",
        keyThemes: [],
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    const topComments = [...comments]
      .sort((a: { likes: number }, b: { likes: number }) => b.likes - a.likes)
      .slice(0, 200);
    const questions = comments.filter((c: { isQuestion: boolean }) => c.isQuestion);

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `You are a consumer insights analyst for a performance marketing agency.

Analyze these TikTok comments from videos about "${keyword}" and extract actionable insights.

TOP COMMENTS (by engagement):
${topComments.map((c: { likes: number; text: string }) => `- [${c.likes} likes] ${c.text}`).join("\n")}

QUESTIONS FROM COMMENTS:
${questions.map((c: { text: string }) => `- ${c.text}`).join("\n")}

Return a JSON object with these exact fields:
{
  "topQuestions": ["The 5-8 most common/important questions people are asking"],
  "painPoints": ["5-8 specific pain points, frustrations, or problems mentioned"],
  "desires": ["5-8 desires, goals, or aspirations expressed"],
  "objections": ["3-5 objections, doubts, or concerns about products/services"],
  "sentimentSummary": "2-3 sentence summary of the overall sentiment and mood",
  "keyThemes": ["5-8 recurring themes across all comments"]
}

Return ONLY valid JSON, no markdown fences.`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonStr = text.trim().replace(/^```json?\n?/i, "").replace(/\n?```$/i, "");
    const insights = JSON.parse(jsonStr);

    return NextResponse.json(insights);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
