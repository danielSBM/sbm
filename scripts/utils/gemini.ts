import { GoogleGenerativeAI } from "@google/generative-ai";

export interface HookAnalysis {
  videoId: string;
  hookText: string;
  hookDuration: string;
  hookType: string;
  emotionalTrigger: string;
  visualTechnique: string;
  retentionTactic: string;
  ctaPresent: boolean;
  ctaType: string;
  pacing: string;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  replicationNotes: string;
}

function getGeminiClient(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is required. Get one at https://aistudio.google.com/apikey"
    );
  }
  return new GoogleGenerativeAI(key);
}

export async function analyzeVideoHook(
  videoUrl: string,
  videoId: string,
  caption: string
): Promise<HookAnalysis> {
  console.log(`   🎬 Gemini analyzing hook for video ${videoId}...`);

  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // Fetch the video as bytes for Gemini's multimodal input
  let videoPart: { inlineData: { data: string; mimeType: string } } | null =
    null;

  if (videoUrl) {
    try {
      const res = await fetch(videoUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          Referer: "https://www.tiktok.com/",
        },
      });
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const contentType = res.headers.get("content-type") || "video/mp4";
        videoPart = {
          inlineData: { data: base64, mimeType: contentType },
        };
        console.log(
          `   ✅ Video downloaded (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB)`
        );
      }
    } catch (e) {
      console.log(`   ⚠️  Could not download video, analyzing caption only`);
    }
  }

  const prompt = `You are an expert TikTok ad creative strategist analyzing a video for hook effectiveness.

VIDEO CAPTION: "${caption}"

Analyze this TikTok video and return a JSON object with these exact fields:
{
  "hookText": "The exact words or text shown in the first 1-3 seconds (the hook)",
  "hookDuration": "How long the hook lasts (e.g., '1.5 seconds')",
  "hookType": "One of: question, bold-claim, shock-value, curiosity-gap, social-proof, transformation, pain-point, controversy, tutorial-promise, trend-jack",
  "emotionalTrigger": "The primary emotion targeted (e.g., FOMO, curiosity, fear, aspiration, frustration)",
  "visualTechnique": "Key visual technique (e.g., zoom-in, text-overlay, split-screen, face-to-camera, product-demo, before-after)",
  "retentionTactic": "How the video keeps viewers watching (e.g., open-loop, countdown, step-by-step, story-arc, pattern-interrupt)",
  "ctaPresent": true/false,
  "ctaType": "Type of CTA if present (e.g., comment, follow, link-in-bio, share, save, none)",
  "pacing": "One of: rapid-fire, moderate, slow-build",
  "overallScore": 1-10 rating of hook effectiveness for paid ad creative,
  "strengths": ["list", "of", "strengths"],
  "weaknesses": ["list", "of", "weaknesses"],
  "replicationNotes": "Specific instructions for replicating this hook style in a new ad creative"
}

${videoPart ? "Analyze the actual video content closely — pay special attention to the FIRST 3 SECONDS (the hook)." : "Since no video is available, analyze based on the caption and common TikTok patterns."}

Return ONLY valid JSON, no markdown fences.`;

  const parts: Array<
    | { text: string }
    | { inlineData: { data: string; mimeType: string } }
  > = [];
  if (videoPart) parts.push(videoPart);
  parts.push({ text: prompt });

  const result = await model.generateContent(parts);
  const text = result.response.text().trim();

  // Parse JSON from response (strip markdown fences if present)
  const jsonStr = text.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "");
  const parsed = JSON.parse(jsonStr);

  return {
    videoId,
    hookText: parsed.hookText || "",
    hookDuration: parsed.hookDuration || "",
    hookType: parsed.hookType || "unknown",
    emotionalTrigger: parsed.emotionalTrigger || "",
    visualTechnique: parsed.visualTechnique || "",
    retentionTactic: parsed.retentionTactic || "",
    ctaPresent: Boolean(parsed.ctaPresent),
    ctaType: parsed.ctaType || "none",
    pacing: parsed.pacing || "moderate",
    overallScore: Number(parsed.overallScore) || 5,
    strengths: parsed.strengths || [],
    weaknesses: parsed.weaknesses || [],
    replicationNotes: parsed.replicationNotes || "",
  };
}

export async function batchAnalyzeHooks(
  videos: Array<{ videoUrl: string; videoId: string; caption: string }>,
  concurrency: number = 2
): Promise<HookAnalysis[]> {
  const results: HookAnalysis[] = [];

  // Process in batches to avoid rate limits
  for (let i = 0; i < videos.length; i += concurrency) {
    const batch = videos.slice(i, i + concurrency);
    console.log(
      `\n📹 Analyzing videos ${i + 1}-${Math.min(i + concurrency, videos.length)} of ${videos.length}...`
    );

    const batchResults = await Promise.allSettled(
      batch.map((v) => analyzeVideoHook(v.videoUrl, v.videoId, v.caption))
    );

    for (const r of batchResults) {
      if (r.status === "fulfilled") {
        results.push(r.value);
      } else {
        console.log(`   ⚠️  Analysis failed: ${r.reason}`);
      }
    }

    // Rate limit pause between batches
    if (i + concurrency < videos.length) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  return results;
}
