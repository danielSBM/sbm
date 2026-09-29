import Anthropic from "@anthropic-ai/sdk";
import { siteConfig } from "../../config/site.config";
import { viralConfig, type AvatarProfile } from "../../config/viral.config";
import type { ViralSource } from "./apify";

export interface VideoIdea {
  id: number;
  title: string;
  /** First 1-3 seconds — the scroll-stopper. Also the first line of `script`. */
  hook: string;
  /** Full spoken script for the avatar, hook included. Plain text, no stage directions. */
  script: string;
  /** Post caption for IG / TikTok / Shorts / X. */
  caption: string;
  hashtags: string[];
  /** Which proven format this borrows (e.g. "contrarian take", "listicle", "story → lesson"). */
  format: string;
  /** Why the source went viral and how this idea adapts it. */
  whyItWillWork: string;
  /** URLs of the viral posts this idea is modeled on. */
  sourceUrls: string[];
  /** Name of the avatar (from viral.config.ts) that should present it. */
  avatar: string;
  /** Claude's 1-10 estimate of viral potential for our audience. */
  viralPotential: number;
  estimatedSeconds: number;
}

function formatSources(sources: ViralSource[]): string {
  return sources
    .map((s, i) => {
      const stats =
        s.platform === "x"
          ? `${s.likes.toLocaleString()} likes · ${s.shares.toLocaleString()} reposts · ${s.comments.toLocaleString()} replies`
          : `${s.views.toLocaleString()} views · ${s.likes.toLocaleString()} likes${s.isShort ? " · SHORT" : ""}`;
      return `[${i + 1}] ${s.platform.toUpperCase()} · ${s.author} (${s.authorFollowers.toLocaleString()} followers) · score ${s.viralityScore}
URL: ${s.url}
Stats: ${stats}
Content: ${s.text.replace(/\s+/g, " ").slice(0, 500)}`;
    })
    .join("\n\n");
}

function formatAvatars(avatars: AvatarProfile[]): string {
  if (avatars.length === 0) return `- "Default": the founder of ${siteConfig.name}`;
  return avatars.map((a) => `- "${a.name}": ${a.persona}`).join("\n");
}

export async function generateVideoIdeas(sources: ViralSource[]): Promise<VideoIdea[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { targetSeconds, wordsPerSecond } = viralConfig.script;
  const targetWords = Math.round(targetSeconds * wordsPerSecond);

  const prompt = `You are the head of short-form content for ${siteConfig.name} (${siteConfig.domain}) — ${siteConfig.description}
Founder: ${siteConfig.author.name}. Brand voice: ${siteConfig.tone}

Below is what is going viral RIGHT NOW on X and YouTube in our space, ranked by an outlier score
(engagement relative to the creator's audience size + velocity).

VIRAL SOURCES:
${formatSources(sources)}

OUR AI AVATARS (they will read the script to camera via HeyGen):
${formatAvatars(viralConfig.avatars)}

TASK: Create ${viralConfig.ideasPerRun} ORIGINAL talking-head video scripts for Reels / TikTok / Shorts, each modeled on
what made one or more of these sources take off. Do NOT copy wording — steal the mechanism (the tension, the
format, the claim, the emotion), then make it ours: relevant to business owners who buy advertising, positioning
${siteConfig.name}'s pay-per-result model where it's natural (never forced; at most a soft CTA at the end).

SCRIPT RULES:
- ~${targetWords} words (~${targetSeconds}s spoken). One single speaker, talking straight to camera.
- Line 1 is the hook: under 12 words, pattern-interrupt, curiosity gap or bold claim. No "Hey guys", no "In this video".
- Plain spoken English. Short sentences. Specific numbers. No emojis, hashtags, stage directions, or [brackets] in the script —
  every character in "script" is read aloud by a text-to-speech voice.
- End with a one-line payoff or CTA (e.g. "Follow for more" or "Link in bio if you want us to run it for you").
- Mix formats: contrarian take, myth-busting, breakdown of a viral ad, listicle, story → lesson, prediction.
- Pick the avatar whose persona fits best.

Respond with ONLY a JSON array. Each object has exactly these keys:
title (string, internal name), hook (string), script (string), caption (string, 1-3 lines, platform-ready, no hashtags),
hashtags (array of 4-8 strings without #), format (string), whyItWillWork (string, 2 sentences: why the source went viral + how we adapt it),
sourceUrls (array of source URLs used), avatar (string, one of the avatar names above), viralPotential (integer 1-10).`;

  const response = await client.messages.create({
    model: viralConfig.claudeModel,
    max_tokens: 12000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error(`Claude returned no JSON array:\n${text.slice(0, 500)}`);

  const raw = JSON.parse(jsonMatch[0]) as Omit<VideoIdea, "id" | "estimatedSeconds">[];
  const avatarNames = new Set(viralConfig.avatars.map((a) => a.name));

  return raw
    .filter((r) => r.script && r.hook)
    .map((r, i) => ({
      ...r,
      id: i + 1,
      hashtags: (r.hashtags || []).map((h) => h.replace(/^#/, "")),
      sourceUrls: r.sourceUrls || [],
      // Fall back to round-robin if Claude named an avatar we don't have
      avatar: avatarNames.has(r.avatar)
        ? r.avatar
        : viralConfig.avatars[i % Math.max(viralConfig.avatars.length, 1)]?.name || "Default",
      viralPotential: Number(r.viralPotential) || 5,
      estimatedSeconds: Math.round(r.script.split(/\s+/).length / wordsPerSecond),
    }));
}
