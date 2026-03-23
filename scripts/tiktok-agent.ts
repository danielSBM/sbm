import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { siteConfig } from "../config/site.config";
import { creativeBriefTemplate } from "../config/creative-brief-template";
import {
  searchTikTok,
  scrapeComments,
  type TikTokSearchResult,
  type TikTokVideo,
  type TikTokComment,
} from "./utils/tiktok";
import {
  batchAnalyzeHooks,
  type HookAnalysis,
} from "./utils/gemini";

// ─── CLI Args ──────────────────────────────────────────────
interface AgentConfig {
  keyword: string;
  maxVideos: number;
  dateFrom?: string;
  dateTo?: string;
  topN: number; // how many top videos to deep-analyze
  commentsPerVideo: number;
  outputDir: string;
}

function parseArgs(): AgentConfig {
  const args = process.argv.slice(2);
  const config: AgentConfig = {
    keyword: "",
    maxVideos: 20,
    topN: 5,
    commentsPerVideo: 50,
    outputDir: path.join(process.cwd(), "output", "tiktok-briefs"),
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--keyword":
      case "-k":
        config.keyword = args[++i];
        break;
      case "--max-videos":
      case "-n":
        config.maxVideos = parseInt(args[++i], 10);
        break;
      case "--date-from":
        config.dateFrom = args[++i];
        break;
      case "--date-to":
        config.dateTo = args[++i];
        break;
      case "--top":
      case "-t":
        config.topN = parseInt(args[++i], 10);
        break;
      case "--comments":
      case "-c":
        config.commentsPerVideo = parseInt(args[++i], 10);
        break;
      case "--output":
      case "-o":
        config.outputDir = args[++i];
        break;
      default:
        if (!config.keyword && !args[i].startsWith("-")) {
          config.keyword = args[i];
        }
    }
  }

  if (!config.keyword) {
    console.log(`
🎯 TikTok Analysis Agent — Seen By Many

Usage:
  npx tsx scripts/tiktok-agent.ts --keyword "ugc ads" [options]

Options:
  -k, --keyword      Search keyword (required)
  -n, --max-videos   Max videos to fetch (default: 20)
  --date-from        Start date YYYY-MM-DD
  --date-to          End date YYYY-MM-DD
  -t, --top          Top N videos to deep-analyze with Gemini (default: 5)
  -c, --comments     Comments per video to scrape (default: 50)
  -o, --output       Output directory (default: output/tiktok-briefs)

Example:
  npx tsx scripts/tiktok-agent.ts -k "ugc skincare ads" -n 30 --date-from 2025-01-01 -t 10
`);
    process.exit(1);
  }

  return config;
}

// ─── Step 1: Search & Collect ──────────────────────────────
async function step1_search(config: AgentConfig): Promise<TikTokSearchResult> {
  console.log("\n" + "═".repeat(60));
  console.log("  STEP 1: SEARCH TIKTOK");
  console.log("═".repeat(60));

  return searchTikTok({
    keyword: config.keyword,
    maxVideos: config.maxVideos,
    dateFrom: config.dateFrom,
    dateTo: config.dateTo,
    sortBy: "likes",
  });
}

// ─── Step 2: Scrape Comments ───────────────────────────────
async function step2_comments(
  topVideos: TikTokVideo[],
  commentsPerVideo: number
): Promise<TikTokVideo[]> {
  console.log("\n" + "═".repeat(60));
  console.log("  STEP 2: SCRAPE COMMENTS");
  console.log("═".repeat(60));

  for (const video of topVideos) {
    try {
      video.comments = await scrapeComments(video.url, commentsPerVideo);
    } catch (e) {
      console.log(`   ⚠️  Failed to scrape comments for ${video.id}: ${e}`);
      video.comments = [];
    }
    // Rate limit
    await new Promise((r) => setTimeout(r, 1500));
  }

  return topVideos;
}

// ─── Step 3: Gemini Video Analysis ─────────────────────────
async function step3_hookAnalysis(
  topVideos: TikTokVideo[]
): Promise<HookAnalysis[]> {
  console.log("\n" + "═".repeat(60));
  console.log("  STEP 3: GEMINI HOOK ANALYSIS");
  console.log("═".repeat(60));

  return batchAnalyzeHooks(
    topVideos.map((v) => ({
      videoUrl: v.videoUrl,
      videoId: v.id,
      caption: v.caption,
    }))
  );
}

// ─── Step 4: AI Comment Analysis ───────────────────────────
interface CommentInsights {
  topQuestions: string[];
  painPoints: string[];
  desires: string[];
  objections: string[];
  sentimentSummary: string;
  keyThemes: string[];
}

async function step4_commentAnalysis(
  allComments: TikTokComment[],
  keyword: string
): Promise<CommentInsights> {
  console.log("\n" + "═".repeat(60));
  console.log("  STEP 4: AI COMMENT ANALYSIS");
  console.log("═".repeat(60));
  console.log(`   Analyzing ${allComments.length} comments...`);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Take the most engaging comments (sorted by likes)
  const topComments = [...allComments]
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 200);

  const questions = allComments.filter((c) => c.isQuestion);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `You are a consumer insights analyst for a performance marketing agency.

Analyze these TikTok comments from videos about "${keyword}" and extract actionable insights.

TOP COMMENTS (by engagement):
${topComments.map((c) => `- [${c.likes} likes] ${c.text}`).join("\n")}

QUESTIONS FROM COMMENTS:
${questions.map((c) => `- ${c.text}`).join("\n")}

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

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const jsonStr = text
    .trim()
    .replace(/^```json?\n?/i, "")
    .replace(/\n?```$/i, "");
  return JSON.parse(jsonStr);
}

// ─── Step 5: Generate Creative Brief ───────────────────────
async function step5_generateBrief(
  config: AgentConfig,
  searchResult: TikTokSearchResult,
  topVideos: TikTokVideo[],
  hookAnalyses: HookAnalysis[],
  commentInsights: CommentInsights
): Promise<string> {
  console.log("\n" + "═".repeat(60));
  console.log("  STEP 5: GENERATE CREATIVE BRIEF");
  console.log("═".repeat(60));

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const totalComments = topVideos.reduce(
    (sum, v) => sum + v.comments.length,
    0
  );

  // Build context for Claude
  const dataContext = `
SEARCH RESULTS OVERVIEW:
- Keyword: "${config.keyword}"
- Videos analyzed: ${searchResult.totalVideos}
- Date range: ${searchResult.dateRange.from} → ${searchResult.dateRange.to}
- Avg views: ${searchResult.avgEngagement.views.toLocaleString()}
- Avg likes: ${searchResult.avgEngagement.likes.toLocaleString()}
- Avg comments: ${searchResult.avgEngagement.comments.toLocaleString()}
- Avg engagement rate: ${searchResult.avgEngagement.engagementRate}%

TOP HASHTAGS:
${searchResult.topHashtags.map((h) => `#${h.tag} (${h.count} videos)`).join(", ")}

TOP ${topVideos.length} VIDEOS:
${topVideos
  .map(
    (v, i) => `
${i + 1}. @${v.author.uniqueId} — ${v.stats.views.toLocaleString()} views, ${v.stats.likes.toLocaleString()} likes, ${v.engagement.rate.toFixed(1)}% ER
   Caption: "${v.caption.slice(0, 200)}"
   URL: ${v.url}
`
  )
  .join("")}

HOOK ANALYSES:
${hookAnalyses
  .map(
    (h) => `
Video ${h.videoId}:
  Hook: "${h.hookText}"
  Type: ${h.hookType} | Emotion: ${h.emotionalTrigger} | Visual: ${h.visualTechnique}
  Score: ${h.overallScore}/10
  Strengths: ${h.strengths.join(", ")}
  Replication: ${h.replicationNotes}
`
  )
  .join("")}

COMMENT INSIGHTS (from ${totalComments} comments):
- Sentiment: ${commentInsights.sentimentSummary}
- Key themes: ${commentInsights.keyThemes.join(", ")}

Top Questions:
${commentInsights.topQuestions.map((q) => `- ${q}`).join("\n")}

Pain Points:
${commentInsights.painPoints.map((p) => `- ${p}`).join("\n")}

Desires:
${commentInsights.desires.map((d) => `- ${d}`).join("\n")}

Objections:
${commentInsights.objections.map((o) => `- ${o}`).join("\n")}
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

  const brief =
    response.content[0].type === "text" ? response.content[0].text : "";
  return brief;
}

// ─── Main Agent ────────────────────────────────────────────
async function main() {
  const config = parseArgs();
  const startTime = Date.now();

  console.log("\n🎯 TikTok Analysis Agent — Seen By Many");
  console.log("━".repeat(50));
  console.log(`Keyword:    ${config.keyword}`);
  console.log(`Max Videos: ${config.maxVideos}`);
  console.log(`Top N:      ${config.topN}`);
  if (config.dateFrom) console.log(`Date From:  ${config.dateFrom}`);
  if (config.dateTo) console.log(`Date To:    ${config.dateTo}`);
  console.log("━".repeat(50));

  // Step 1: Search TikTok
  const searchResult = await step1_search(config);

  if (searchResult.videos.length === 0) {
    console.error("\n❌ No videos found. Try a different keyword or date range.");
    process.exit(1);
  }

  // Get top N videos for deep analysis
  const topVideos = searchResult.videos
    .sort((a, b) => b.stats.likes - a.stats.likes)
    .slice(0, config.topN);

  console.log(
    `\n🏆 Top ${topVideos.length} videos selected for deep analysis:`
  );
  for (const v of topVideos) {
    console.log(
      `   @${v.author.uniqueId} — ${v.stats.views.toLocaleString()} views, ${v.stats.likes.toLocaleString()} likes`
    );
  }

  // Step 2 & 3 run in sequence (comments first, then Gemini)
  const videosWithComments = await step2_comments(
    topVideos,
    config.commentsPerVideo
  );
  const hookAnalyses = await step3_hookAnalysis(topVideos);

  // Step 4: Analyze all collected comments
  const allComments = videosWithComments.flatMap((v) => v.comments);
  let commentInsights: CommentInsights;
  if (allComments.length > 0) {
    commentInsights = await step4_commentAnalysis(allComments, config.keyword);
  } else {
    console.log("\n⚠️  No comments collected, using empty insights");
    commentInsights = {
      topQuestions: [],
      painPoints: [],
      desires: [],
      objections: [],
      sentimentSummary: "No comments available for analysis.",
      keyThemes: [],
    };
  }

  // Step 5: Generate the creative brief
  const brief = await step5_generateBrief(
    config,
    searchResult,
    topVideos,
    hookAnalyses,
    commentInsights
  );

  // ─── Save outputs ────────────────────────────────────────
  fs.mkdirSync(config.outputDir, { recursive: true });

  const slug = config.keyword
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const date = new Date().toISOString().split("T")[0];
  const baseName = `${date}-${slug}`;

  // Save creative brief
  const briefPath = path.join(config.outputDir, `${baseName}-brief.md`);
  fs.writeFileSync(briefPath, brief);

  // Save raw data as JSON for reference
  const dataPath = path.join(config.outputDir, `${baseName}-data.json`);
  fs.writeFileSync(
    dataPath,
    JSON.stringify(
      {
        config,
        searchResult,
        hookAnalyses,
        commentInsights,
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n" + "═".repeat(60));
  console.log("  ✅ COMPLETE");
  console.log("═".repeat(60));
  console.log(`\n📄 Creative Brief: ${briefPath}`);
  console.log(`📊 Raw Data:       ${dataPath}`);
  console.log(`⏱️  Total time:     ${elapsed}s`);
  console.log(`📹 Videos:         ${searchResult.totalVideos} found, ${topVideos.length} deep-analyzed`);
  console.log(`💬 Comments:       ${allComments.length} scraped`);
  console.log(`🎬 Hooks:          ${hookAnalyses.length} analyzed by Gemini`);
  console.log();
}

main().catch((e) => {
  console.error("\n❌ Agent failed:", e.message || e);
  process.exit(1);
});
