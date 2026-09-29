import { viralConfig } from "../../config/viral.config";

/** A normalized piece of viral content from any platform. */
export interface ViralSource {
  platform: "x" | "youtube";
  url: string;
  author: string;
  authorFollowers: number;
  /** Tweet text, or YouTube title + description excerpt. */
  text: string;
  title?: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  publishedAt: string;
  isShort?: boolean;
  topic: string;
  /** Outlier score — how much this over-performed relative to the author's audience. */
  viralityScore: number;
}

const APIFY_BASE = "https://api.apify.com/v2";

/**
 * Runs an Apify actor synchronously and returns its dataset items.
 * Actor IDs like "apidojo/tweet-scraper" are converted to the URL form "apidojo~tweet-scraper".
 */
export async function runActor<T = Record<string, unknown>>(
  actor: string,
  input: Record<string, unknown>,
  timeoutSecs = 280
): Promise<T[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN not set");

  const url = `${APIFY_BASE}/acts/${actor.replace("/", "~")}/run-sync-get-dataset-items?timeout=${timeoutSecs}&clean=true`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Apify ${actor} failed (${res.status}): ${body.slice(0, 300)}`);
  }

  return (await res.json()) as T[];
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseInt(v.replace(/[^0-9]/g, ""), 10) || 0;
  return 0;
}

function hoursSince(date: string): number {
  const t = Date.parse(date);
  if (Number.isNaN(t)) return 24 * 7;
  return Math.max(1, (Date.now() - t) / 3_600_000);
}

/**
 * Outlier score: engagement relative to audience size, boosted by velocity.
 * A 50k-like tweet from a 5k-follower account beats a 50k-like tweet from a 5M account.
 */
function score(engagement: number, followers: number, publishedAt: string): number {
  const audience = Math.max(followers, 1000);
  const outlier = engagement / audience;
  const velocity = engagement / hoursSince(publishedAt);
  return Math.round((Math.log10(1 + outlier * 100) * 50 + Math.log10(1 + velocity) * 20) * 10) / 10;
}

// ---------- X / Twitter ----------

interface RawTweet {
  url?: string;
  twitterUrl?: string;
  text?: string;
  fullText?: string;
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
  quoteCount?: number;
  viewCount?: number;
  createdAt?: string;
  isRetweet?: boolean;
  isReply?: boolean;
  author?: { userName?: string; followers?: number };
}

export async function scrapeX(topic: string): Promise<ViralSource[]> {
  const cfg = viralConfig.x;
  const query = `${topic} min_faves:${cfg.minLikes} -filter:replies -filter:retweets lang:${cfg.language} since:${daysAgo(cfg.lookbackDays)}`;

  const items = await runActor<RawTweet>(cfg.actor, {
    searchTerms: [query],
    sort: "Top",
    maxItems: cfg.maxItemsPerTopic,
    tweetLanguage: cfg.language,
  });

  return items
    .filter((t) => (t.text || t.fullText) && !t.isRetweet && !t.isReply)
    .map((t) => {
      const likes = num(t.likeCount);
      const shares = num(t.retweetCount) + num(t.quoteCount);
      const comments = num(t.replyCount);
      const followers = num(t.author?.followers);
      const publishedAt = t.createdAt || "";
      return {
        platform: "x" as const,
        url: t.url || t.twitterUrl || "",
        author: t.author?.userName ? `@${t.author.userName}` : "unknown",
        authorFollowers: followers,
        text: (t.text || t.fullText || "").trim(),
        views: num(t.viewCount),
        likes,
        comments,
        shares,
        publishedAt,
        topic,
        viralityScore: score(likes + shares * 2 + comments, followers, publishedAt),
      };
    })
    .filter((s) => s.url && s.likes >= cfg.minLikes);
}

// ---------- YouTube ----------

interface RawYouTube {
  title?: string;
  url?: string;
  text?: string;
  viewCount?: number;
  likes?: number;
  commentsCount?: number;
  date?: string;
  channelName?: string;
  numberOfSubscribers?: number;
  type?: string;
  duration?: string;
}

export async function scrapeYouTube(topic: string): Promise<ViralSource[]> {
  const cfg = viralConfig.youtube;
  const items = await runActor<RawYouTube>(cfg.actor, {
    searchQueries: [topic],
    maxResults: cfg.maxVideosPerTopic,
    maxResultsShorts: cfg.maxShortsPerTopic,
    maxResultStreams: 0,
    sortingOrder: "views",
    oldestPostDate: `${cfg.lookbackDays} days`,
  });

  return items
    .filter((v) => v.url && v.title)
    .map((v) => {
      const views = num(v.viewCount);
      const followers = num(v.numberOfSubscribers);
      const publishedAt = v.date || "";
      const isShort = v.type === "shorts" || /\/shorts\//.test(v.url || "");
      return {
        platform: "youtube" as const,
        url: v.url!,
        author: v.channelName || "unknown",
        authorFollowers: followers,
        title: v.title,
        text: `${v.title}\n\n${(v.text || "").slice(0, 600)}`.trim(),
        views,
        likes: num(v.likes),
        comments: num(v.commentsCount),
        shares: 0,
        publishedAt,
        isShort,
        topic,
        // Views are ~50x more common than likes, so scale down before scoring.
        viralityScore: score(views / 50 + num(v.likes) + num(v.commentsCount) * 2, followers, publishedAt),
      };
    })
    .filter((s) => s.views >= cfg.minViews);
}

/** Scrape every platform for every topic; one failing source never kills the run. */
export async function scrapeViral(topics: string[]): Promise<ViralSource[]> {
  const jobs = topics.flatMap((topic) => [
    { label: `X · ${topic}`, run: () => scrapeX(topic) },
    { label: `YouTube · ${topic}`, run: () => scrapeYouTube(topic) },
  ]);

  const results = await Promise.allSettled(jobs.map((j) => j.run()));
  const all: ViralSource[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      console.log(`  ✅ ${jobs[i].label}: ${r.value.length} viral posts`);
      all.push(...r.value);
    } else {
      console.warn(`  ⚠️  ${jobs[i].label}: ${r.reason instanceof Error ? r.reason.message : r.reason}`);
    }
  });

  // Dedupe by URL, highest score first
  const seen = new Set<string>();
  return all
    .sort((a, b) => b.viralityScore - a.viralityScore)
    .filter((s) => (seen.has(s.url) ? false : (seen.add(s.url), true)));
}
