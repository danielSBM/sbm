import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { websiteUrl, brandAnalysis } = await req.json();

    if (!brandAnalysis || brandAnalysis.trim().length < 50) {
      return NextResponse.json(
        { error: "Brand analysis text is required (minimum 50 characters)" },
        { status: 400 }
      );
    }

    const analysisPrompt = `You are a senior brand strategist and direct-response marketing expert. Your job is to deeply understand a brand so you can create high-converting advertorial funnels for them.

You have been given the following brand information:

WEBSITE: ${websiteUrl || "Not provided"}

BRAND ANALYSIS (prepared by the team):
${brandAnalysis}

=== YOUR TASK ===

Analyze this brand comprehensively and produce a structured JSON report. Be specific, opinionated, and actionable. Do NOT be generic.

Return a JSON object (no markdown fences) with this exact structure:

{
  "brandName": "...",
  "industry": "...",
  "productCategory": "...",
  "pricePoint": "...",
  "brandVoice": {
    "tone": "...",
    "personality": "...",
    "languageStyle": "...",
    "avoids": "..."
  },
  "coreProblemSolved": "...",
  "uniqueMechanism": "What makes their solution different from competitors — the belief shift",
  "emotionalDrivers": ["The deep emotional pain points their customers feel — not symptoms, but identity/life costs"],
  "targetDemographic": {
    "ageRange": "...",
    "gender": "...",
    "income": "...",
    "lifestyle": "...",
    "psychographics": "..."
  },
  "competitiveAdvantages": ["..."],
  "competitorWeaknesses": ["What competitors get wrong that this brand can exploit"],
  "keyObjections": ["Top objections a potential buyer would have"],
  "proofPoints": ["Existing trust signals, studies, endorsements, media mentions"],
  "productDetails": {
    "name": "...",
    "price": "...",
    "guarantee": "...",
    "keyFeatures": ["..."],
    "frictionKillers": ["Things that make buying easy — no prescription, free shipping, etc."]
  },
  "advertorialAngle": "The single most powerful angle for an advertorial campaign — be specific",
  "readinessScore": 1-10,
  "missingInfo": ["Any critical info still needed, or empty array if complete"],
  "summary": "2-3 sentence strategic summary of the brand opportunity"
}

Be ruthlessly specific. Every field must contain real, actionable intelligence — not filler.`;

    // Run Claude and Gemini in parallel
    const results = await Promise.allSettled([
      callClaude(analysisPrompt),
      callGemini(analysisPrompt),
    ]);

    const claudeResult =
      results[0].status === "fulfilled" ? results[0].value : null;
    const geminiResult =
      results[1].status === "fulfilled" ? results[1].value : null;

    const claudeError =
      results[0].status === "rejected" ? results[0].reason?.message : null;
    const geminiError =
      results[1].status === "rejected" ? results[1].reason?.message : null;

    // Parse JSON from both responses
    const claudeAnalysis = claudeResult ? parseJson(claudeResult) : null;
    const geminiAnalysis = geminiResult ? parseJson(geminiResult) : null;

    if (!claudeAnalysis && !geminiAnalysis) {
      return NextResponse.json(
        {
          error: "Both AI models failed to produce analysis",
          claudeError,
          geminiError,
        },
        { status: 500 }
      );
    }

    // Merge the analyses — Claude as primary, Gemini fills gaps
    const merged = mergeAnalyses(claudeAnalysis, geminiAnalysis);

    // Determine if we have enough info
    const score = typeof merged.readinessScore === "number" ? merged.readinessScore : 0;
    const missing = Array.isArray(merged.missingInfo) ? merged.missingInfo : [];
    const hasEnoughInfo = score >= 7 && missing.length === 0;

    return NextResponse.json({
      analysis: merged,
      hasEnoughInfo,
      sources: {
        claude: !!claudeAnalysis,
        gemini: !!geminiAnalysis,
        claudeError,
        geminiError,
      },
    });
  } catch (error) {
    console.error("Brand analysis failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}

async function callClaude(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

function parseJson(text: string): Record<string, unknown> | null {
  try {
    const cleaned = text
      .replace(/^```(?:json)?\s*\n?/m, "")
      .replace(/\n?```\s*$/m, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function mergeAnalyses(
  primary: Record<string, unknown> | null,
  secondary: Record<string, unknown> | null
): Record<string, unknown> {
  if (!primary) return secondary || {};
  if (!secondary) return primary;

  const merged = { ...primary };

  // For array fields, combine unique entries from both
  const arrayFields = [
    "emotionalDrivers",
    "competitiveAdvantages",
    "competitorWeaknesses",
    "keyObjections",
    "proofPoints",
  ];

  for (const field of arrayFields) {
    const pArr = Array.isArray(primary[field]) ? (primary[field] as string[]) : [];
    const sArr = Array.isArray(secondary[field]) ? (secondary[field] as string[]) : [];
    const combined = [...new Set([...pArr, ...sArr])];
    if (combined.length > 0) merged[field] = combined;
  }

  // For nested objects, merge deeply
  const objectFields = ["brandVoice", "targetDemographic", "productDetails"];
  for (const field of objectFields) {
    const pObj = typeof primary[field] === "object" && primary[field] ? primary[field] : {};
    const sObj = typeof secondary[field] === "object" && secondary[field] ? secondary[field] : {};
    merged[field] = { ...(sObj as Record<string, unknown>), ...(pObj as Record<string, unknown>) };
  }

  // Take the higher readiness score
  const pScore = typeof primary.readinessScore === "number" ? primary.readinessScore : 0;
  const sScore = typeof secondary.readinessScore === "number" ? secondary.readinessScore : 0;
  merged.readinessScore = Math.max(pScore, sScore);

  // Combine missing info
  const pMissing = Array.isArray(primary.missingInfo) ? (primary.missingInfo as string[]) : [];
  const sMissing = Array.isArray(secondary.missingInfo) ? (secondary.missingInfo as string[]) : [];
  merged.missingInfo = [...new Set([...pMissing, ...sMissing])];

  return merged;
}
