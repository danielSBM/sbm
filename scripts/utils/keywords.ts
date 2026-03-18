import Anthropic from "@anthropic-ai/sdk";
import { siteConfig } from "../../config/site.config";
import type { TrendData } from "./trends";

export interface KeywordOpportunity {
  title: string;
  slug: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  category: string;
  angle: string;
  searchIntent: string;
  estimatedDifficulty: "low" | "medium" | "high";
  peopleAlsoAsk: string[];
  customerGenerationReason: string;
}

export async function analyzeKeywords(
  trendData: TrendData[]
): Promise<KeywordOpportunity[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const trendSummary = trendData
    .map(
      (t) =>
        `Keyword: "${t.keyword}"\n  Related: ${t.relatedQueries.join(", ")}\n  Rising: ${t.risingQueries.join(", ")}`
    )
    .join("\n\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `You are an expert SEO strategist for ${siteConfig.name}, an AI-powered pay-per-result advertising agency.

BUSINESS CONTEXT:
- We help businesses get customers through AI-powered advertising
- We charge per qualified lead/customer — no retainers
- Platforms: Meta, Google, TikTok, YouTube ads
- Our audience: business owners, e-commerce brands, marketing managers

TRENDING DATA:
${trendSummary}

OUR TARGET NICHES:
${siteConfig.niches.join(", ")}

TASK: Based on the trending data and our niches, identify 6-8 blog article opportunities. For EACH one, provide:

1. A click-worthy title (60-70 chars, includes primary keyword naturally)
2. A URL-friendly slug
3. The primary keyword to target
4. 5-8 secondary/LSI keywords
5. The category (one of: Performance Marketing, AI Advertising, E-commerce Growth, Paid Social, Lead Generation, Business Growth)
6. A unique angle that positions ${siteConfig.name} as the expert
7. Search intent (informational, commercial, transactional)
8. Estimated keyword difficulty (low/medium/high) — prefer LOW difficulty
9. 5 "People Also Ask" questions related to the topic
10. A 2-3 sentence explanation of WHY this topic will generate customers for ${siteConfig.name}. Explain the business reasoning — what kind of reader will find this, why they're likely to need advertising help, and how this article positions our pay-per-result model as the solution.

PRIORITIZE:
- Low competition, high intent keywords
- Topics where we can naturally position our pay-per-result model
- Questions business owners are actively searching for
- Long-tail keywords with clear commercial intent
- Variety across different niches/categories

Respond in valid JSON format as an array of objects with these exact keys:
title, slug, primaryKeyword, secondaryKeywords (array), category, angle, searchIntent, estimatedDifficulty, peopleAlsoAsk (array), customerGenerationReason (string)`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Extract JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Failed to parse keyword analysis from Claude response");
  }

  return JSON.parse(jsonMatch[0]) as KeywordOpportunity[];
}
