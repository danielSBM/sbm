import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const HOOK_PROMPT = (caption: string) => `You are an expert TikTok ad creative strategist analyzing a video for hook effectiveness.

VIDEO CAPTION: "${caption}"

Analyze based on the caption and common TikTok patterns. Infer the likely hook style from the caption text.

Return a JSON object with these exact fields:
{
  "hookText": "The likely opening hook text (first 1-3 seconds)",
  "hookDuration": "Estimated hook duration",
  "hookType": "One of: question, bold-claim, shock-value, curiosity-gap, social-proof, transformation, pain-point, controversy, tutorial-promise, trend-jack",
  "emotionalTrigger": "Primary emotion (FOMO, curiosity, fear, aspiration, frustration, etc.)",
  "visualTechnique": "Likely visual technique (zoom-in, text-overlay, split-screen, face-to-camera, product-demo, before-after)",
  "retentionTactic": "How it keeps viewers watching (open-loop, countdown, step-by-step, story-arc, pattern-interrupt)",
  "ctaPresent": true or false,
  "ctaType": "Type of CTA (comment, follow, link-in-bio, share, save, none)",
  "pacing": "One of: rapid-fire, moderate, slow-build",
  "overallScore": 1-10 rating of hook effectiveness for paid ad creative,
  "strengths": ["list of strengths"],
  "weaknesses": ["list of weaknesses"],
  "replicationNotes": "Specific instructions for replicating this hook style"
}

Return ONLY valid JSON, no markdown fences.`;

function parseHook(text: string, videoId: string, analyzedBy: string) {
  const jsonStr = text.trim().replace(/^```json?\n?/i, "").replace(/\n?```$/i, "");
  const p = JSON.parse(jsonStr);
  return {
    videoId,
    hookText: p.hookText || "",
    hookDuration: p.hookDuration || "",
    hookType: p.hookType || "unknown",
    emotionalTrigger: p.emotionalTrigger || "",
    visualTechnique: p.visualTechnique || "",
    retentionTactic: p.retentionTactic || "",
    ctaPresent: Boolean(p.ctaPresent),
    ctaType: p.ctaType || "none",
    pacing: p.pacing || "moderate",
    overallScore: Number(p.overallScore) || 5,
    strengths: p.strengths || [],
    weaknesses: p.weaknesses || [],
    replicationNotes: p.replicationNotes || "",
    analyzedBy,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { videos } = await req.json();
    // videos: Array<{ videoId, videoUrl, caption }>

    if (!videos?.length) {
      return NextResponse.json({ error: "videos array is required" }, { status: 400 });
    }

    const results = [];

    for (const v of videos) {
      // Try Gemini first, fall back to Claude
      if (process.env.GEMINI_API_KEY) {
        try {
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
          const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
          const result = await model.generateContent(HOOK_PROMPT(v.caption));
          results.push(parseHook(result.response.text(), v.videoId, "gemini"));
          continue;
        } catch {
          // Fall through to Claude
        }
      }

      // Claude fallback
      if (process.env.ANTHROPIC_API_KEY) {
        try {
          const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
          const response = await client.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2000,
            messages: [{ role: "user", content: HOOK_PROMPT(v.caption) }],
          });
          const text = response.content[0].type === "text" ? response.content[0].text : "";
          results.push(parseHook(text, v.videoId, "claude"));
        } catch (e) {
          results.push({
            videoId: v.videoId,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }

    return NextResponse.json({ hooks: results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
