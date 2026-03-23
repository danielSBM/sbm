import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { siteConfig } from "../../../../../config/site.config";
import { creativeBriefTemplate } from "../../../../../config/creative-brief-template";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { searchResult, topVideos, hookAnalyses, commentInsights } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    const totalComments = (topVideos || []).reduce(
      (sum: number, v: { comments?: unknown[] }) => sum + (v.comments?.length || 0),
      0
    );

    const dataContext = `
SEARCH RESULTS OVERVIEW:
- Keyword: "${searchResult.keyword}"
- Videos analyzed: ${searchResult.totalVideos}
- Date range: ${searchResult.dateRange?.from || "N/A"} to ${searchResult.dateRange?.to || "N/A"}
- Avg views: ${searchResult.avgEngagement?.views?.toLocaleString() || 0}
- Avg likes: ${searchResult.avgEngagement?.likes?.toLocaleString() || 0}
- Avg comments: ${searchResult.avgEngagement?.comments?.toLocaleString() || 0}
- Avg engagement rate: ${searchResult.avgEngagement?.engagementRate || 0}%

TOP HASHTAGS:
${(searchResult.topHashtags || []).map((h: { tag: string; count: number }) => `#${h.tag} (${h.count} videos)`).join(", ")}

TOP ${(topVideos || []).length} VIDEOS:
${(topVideos || [])
  .map(
    (v: { author: { uniqueId: string }; stats: { views: number; likes: number }; engagement: { rate: number }; caption: string; url: string }, i: number) => `
${i + 1}. @${v.author.uniqueId} — ${v.stats.views.toLocaleString()} views, ${v.stats.likes.toLocaleString()} likes, ${v.engagement.rate.toFixed(1)}% ER
   Caption: "${(v.caption || "").slice(0, 200)}"
   URL: ${v.url}
`
  )
  .join("")}

HOOK ANALYSES:
${(hookAnalyses || [])
  .filter((h: { error?: string }) => !h.error)
  .map(
    (h: { videoId: string; hookText: string; hookType: string; emotionalTrigger: string; visualTechnique: string; overallScore: number; strengths: string[]; replicationNotes: string }) => `
Video ${h.videoId}:
  Hook: "${h.hookText}"
  Type: ${h.hookType} | Emotion: ${h.emotionalTrigger} | Visual: ${h.visualTechnique}
  Score: ${h.overallScore}/10
  Strengths: ${(h.strengths || []).join(", ")}
  Replication: ${h.replicationNotes}
`
  )
  .join("")}

COMMENT INSIGHTS (from ${totalComments} comments):
- Sentiment: ${commentInsights?.sentimentSummary || "N/A"}
- Key themes: ${(commentInsights?.keyThemes || []).join(", ")}

Top Questions:
${(commentInsights?.topQuestions || []).map((q: string) => `- ${q}`).join("\n")}

Pain Points:
${(commentInsights?.painPoints || []).map((p: string) => `- ${p}`).join("\n")}

Desires:
${(commentInsights?.desires || []).map((d: string) => `- ${d}`).join("\n")}

Objections:
${(commentInsights?.objections || []).map((o: string) => `- ${o}`).join("\n")}
`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: `You are a senior creative strategist at ${siteConfig.name}, an AI-powered pay-per-result advertising agency.

BRAND BIBLE:
- Agency: ${siteConfig.name} — ${siteConfig.tagline}
- Tone: ${siteConfig.tone}
- Niches: ${siteConfig.niches.join(", ")}
- CTA: ${siteConfig.cta.text} (${siteConfig.cta.url})

BRIEF TEMPLATE SECTIONS:
${creativeBriefTemplate.sections.map((s) => `- ${s.name}: ${s.description}`).join("\n")}

Using the TikTok research data below, generate a comprehensive creative brief in markdown format.

${dataContext}

REQUIREMENTS:
1. Follow the template sections exactly
2. Include specific, actionable creative concepts (not generic advice)
3. Each creative concept should include: hook script, visual direction, CTA, estimated format/length
4. Reference specific videos and hooks from the data
5. Tie everything back to the brand's tone and positioning
6. Include specific ad creative recommendations that a video editor or UGC creator could execute immediately
7. Be bold, data-driven, and specific — no fluff

Generate the full creative brief now as markdown.`,
        },
      ],
    });

    const brief = response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ brief });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
