import express from "express";
import path from "path";
import fs from "fs";
import {
  searchTikTok,
  scrapeComments,
  type TikTokSearchResult,
  type TikTokVideo,
  type TikTokComment,
} from "./utils/tiktok";
import { batchAnalyzeHooks, type HookAnalysis } from "./utils/gemini";
import Anthropic from "@anthropic-ai/sdk";
import { siteConfig } from "../config/site.config";
import { creativeBriefTemplate } from "../config/creative-brief-template";

const app = express();
const PORT = parseInt(process.env.DASHBOARD_PORT || "3100", 10);
const OUTPUT_DIR = path.join(process.cwd(), "output", "tiktok-briefs");

app.use(express.json());
app.use(express.static(path.join(__dirname, "dashboard")));

// ─── SSE helpers ───────────────────────────────────────────
type SSEClient = express.Response;
const activeClients = new Map<string, SSEClient>();

function sendEvent(
  jobId: string,
  event: string,
  data: Record<string, unknown>
) {
  const client = activeClients.get(jobId);
  if (client) {
    client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}

// ─── Past briefs ───────────────────────────────────────────
app.get("/api/briefs", (_req, res) => {
  if (!fs.existsSync(OUTPUT_DIR)) return res.json([]);
  const files = fs
    .readdirSync(OUTPUT_DIR)
    .filter((f) => f.endsWith("-brief.md"))
    .sort()
    .reverse();
  const briefs = files.map((f) => {
    const dataFile = f.replace("-brief.md", "-data.json");
    const dataPath = path.join(OUTPUT_DIR, dataFile);
    let meta: Record<string, unknown> = {};
    if (fs.existsSync(dataPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
        meta = {
          keyword: raw.config?.keyword,
          videosAnalyzed: raw.searchResult?.totalVideos,
          generatedAt: raw.generatedAt,
          avgEngagement: raw.searchResult?.avgEngagement,
        };
      } catch {}
    }
    return { file: f, ...meta };
  });
  res.json(briefs);
});

app.get("/api/briefs/:file", (req, res) => {
  const filePath = path.join(OUTPUT_DIR, req.params.file);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Not found" });
  res.type("text/markdown").send(fs.readFileSync(filePath, "utf-8"));
});

// ─── SSE endpoint ──────────────────────────────────────────
app.get("/api/stream/:jobId", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write(`event: connected\ndata: {}\n\n`);
  activeClients.set(req.params.jobId, res);
  req.on("close", () => activeClients.delete(req.params.jobId));
});

// ─── Run agent ─────────────────────────────────────────────
app.post("/api/run", async (req, res) => {
  const {
    keyword,
    maxVideos = 20,
    dateFrom,
    dateTo,
    topN = 5,
    commentsPerVideo = 50,
  } = req.body;

  if (!keyword) return res.status(400).json({ error: "keyword is required" });

  const jobId = `job-${Date.now()}`;
  res.json({ jobId });

  // Run the pipeline asynchronously
  runPipeline(jobId, {
    keyword,
    maxVideos,
    dateFrom,
    dateTo,
    topN,
    commentsPerVideo,
  }).catch((err) => {
    sendEvent(jobId, "error", { message: err.message || String(err) });
  });
});

interface PipelineConfig {
  keyword: string;
  maxVideos: number;
  dateFrom?: string;
  dateTo?: string;
  topN: number;
  commentsPerVideo: number;
}

async function runPipeline(jobId: string, config: PipelineConfig) {
  const startTime = Date.now();

  // ── Step 1: Search ──
  sendEvent(jobId, "step", {
    step: 1,
    title: "Searching TikTok",
    status: "running",
  });

  let searchResult: TikTokSearchResult;
  try {
    searchResult = await searchTikTok({
      keyword: config.keyword,
      maxVideos: config.maxVideos,
      dateFrom: config.dateFrom,
      dateTo: config.dateTo,
      sortBy: "likes",
    });
    sendEvent(jobId, "step", {
      step: 1,
      title: "Searching TikTok",
      status: "done",
      detail: `Found ${searchResult.totalVideos} videos`,
      data: {
        totalVideos: searchResult.totalVideos,
        avgEngagement: searchResult.avgEngagement,
        topHashtags: searchResult.topHashtags.slice(0, 10),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    sendEvent(jobId, "step", {
      step: 1,
      title: "Searching TikTok",
      status: "error",
      detail: msg,
    });
    sendEvent(jobId, "error", { message: `Search failed: ${msg}` });
    return;
  }

  if (searchResult.videos.length === 0) {
    sendEvent(jobId, "error", { message: "No videos found. Try a different keyword." });
    return;
  }

  const topVideos = searchResult.videos
    .sort((a, b) => b.stats.likes - a.stats.likes)
    .slice(0, config.topN);

  // Send video cards
  sendEvent(jobId, "videos", {
    videos: topVideos.map((v) => ({
      id: v.id,
      url: v.url,
      caption: v.caption.slice(0, 150),
      author: v.author.uniqueId,
      thumbnail: v.thumbnailUrl,
      views: v.stats.views,
      likes: v.stats.likes,
      comments: v.stats.comments,
      shares: v.stats.shares,
      engagementRate: v.engagement.rate.toFixed(1),
    })),
  });

  // ── Step 2: Comments ──
  sendEvent(jobId, "step", {
    step: 2,
    title: "Scraping Comments",
    status: "running",
  });

  for (let i = 0; i < topVideos.length; i++) {
    try {
      topVideos[i].comments = await scrapeComments(
        topVideos[i].url,
        config.commentsPerVideo
      );
      sendEvent(jobId, "step", {
        step: 2,
        title: "Scraping Comments",
        status: "running",
        detail: `${i + 1}/${topVideos.length} videos — ${topVideos[i].comments.length} comments`,
      });
    } catch {
      topVideos[i].comments = [];
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  const allComments = topVideos.flatMap((v) => v.comments);
  sendEvent(jobId, "step", {
    step: 2,
    title: "Scraping Comments",
    status: "done",
    detail: `${allComments.length} comments from ${topVideos.length} videos`,
  });

  // ── Step 3: Gemini Hook Analysis ──
  sendEvent(jobId, "step", {
    step: 3,
    title: "Gemini Analyzing Hooks",
    status: "running",
  });

  let hookAnalyses: HookAnalysis[] = [];
  try {
    hookAnalyses = await batchAnalyzeHooks(
      topVideos.map((v) => ({
        videoUrl: v.videoUrl,
        videoId: v.id,
        caption: v.caption,
      }))
    );
    sendEvent(jobId, "step", {
      step: 3,
      title: "Gemini Analyzing Hooks",
      status: "done",
      detail: `${hookAnalyses.length} hooks analyzed`,
      data: {
        hooks: hookAnalyses.map((h) => ({
          videoId: h.videoId,
          hookType: h.hookType,
          score: h.overallScore,
          hookText: h.hookText,
          emotionalTrigger: h.emotionalTrigger,
          visualTechnique: h.visualTechnique,
        })),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    sendEvent(jobId, "step", {
      step: 3,
      title: "Gemini Analyzing Hooks",
      status: "error",
      detail: msg,
    });
  }

  // ── Step 4: Comment Analysis ──
  sendEvent(jobId, "step", {
    step: 4,
    title: "AI Analyzing Comments",
    status: "running",
  });

  let commentInsights = {
    topQuestions: [] as string[],
    painPoints: [] as string[],
    desires: [] as string[],
    objections: [] as string[],
    sentimentSummary: "No comments available.",
    keyThemes: [] as string[],
  };

  if (allComments.length > 0) {
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
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

Analyze these TikTok comments from videos about "${config.keyword}" and extract actionable insights.

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
      commentInsights = JSON.parse(jsonStr);
    } catch {}
  }

  sendEvent(jobId, "step", {
    step: 4,
    title: "AI Analyzing Comments",
    status: "done",
    detail: `${commentInsights.topQuestions.length} questions, ${commentInsights.painPoints.length} pain points`,
    data: { insights: commentInsights },
  });

  // ── Step 5: Creative Brief ──
  sendEvent(jobId, "step", {
    step: 5,
    title: "Generating Creative Brief",
    status: "running",
  });

  let brief = "";
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const totalComments = allComments.length;

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

    brief =
      response.content[0].type === "text" ? response.content[0].text : "";
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    sendEvent(jobId, "step", {
      step: 5,
      title: "Generating Creative Brief",
      status: "error",
      detail: msg,
    });
    sendEvent(jobId, "error", { message: `Brief generation failed: ${msg}` });
    return;
  }

  // ── Save outputs ──
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const slug = config.keyword
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const date = new Date().toISOString().split("T")[0];
  const baseName = `${date}-${slug}`;

  const briefPath = path.join(OUTPUT_DIR, `${baseName}-brief.md`);
  fs.writeFileSync(briefPath, brief);

  const dataPath = path.join(OUTPUT_DIR, `${baseName}-data.json`);
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

  sendEvent(jobId, "step", {
    step: 5,
    title: "Generating Creative Brief",
    status: "done",
    detail: "Creative brief saved",
  });

  sendEvent(jobId, "complete", {
    briefFile: `${baseName}-brief.md`,
    brief,
    elapsed,
    stats: {
      videosFound: searchResult.totalVideos,
      videosAnalyzed: topVideos.length,
      commentsScraped: allComments.length,
      hooksAnalyzed: hookAnalyses.length,
    },
  });
}

// ─── Start server ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ┌─────────────────────────────────────────────┐
  │                                             │
  │   🎯 TikTok Analysis Dashboard             │
  │   Seen By Many                              │
  │                                             │
  │   → http://localhost:${PORT}                  │
  │                                             │
  └─────────────────────────────────────────────┘
  `);
});
