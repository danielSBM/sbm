/**
 * Viral Video Engine config
 *
 * Scrape what's going viral on X + YouTube (via Apify) → have Claude turn the
 * winners into short-form scripts → render them with your HeyGen avatars.
 *
 * Run `npm run heygen:list` to print your avatar + voice IDs, then paste them
 * into `avatars` below (or set HEYGEN_AVATAR_ID / HEYGEN_VOICE_ID for one default).
 */

export interface AvatarProfile {
  /** Your label for this avatar — Claude uses it to pick who presents each idea. */
  name: string;
  /** "avatar" = studio / instant avatar, "talking_photo" = photo avatar. */
  type: "avatar" | "talking_photo";
  /** avatar_id (type "avatar") or talking_photo_id (type "talking_photo"). */
  id: string;
  voiceId: string;
  /** What this avatar should present — helps Claude match ideas to avatars. */
  persona: string;
  /** Optional solid background color (hex). Omit to keep the avatar's own background. */
  backgroundColor?: string;
  voiceSpeed?: number;
}

const envAvatar: AvatarProfile[] =
  process.env.HEYGEN_AVATAR_ID && process.env.HEYGEN_VOICE_ID
    ? [
        {
          name: "Default",
          type: (process.env.HEYGEN_AVATAR_TYPE as AvatarProfile["type"]) || "avatar",
          id: process.env.HEYGEN_AVATAR_ID,
          voiceId: process.env.HEYGEN_VOICE_ID,
          persona: "Founder of Seen By Many — direct, data-driven, contrarian about agencies.",
        },
      ]
    : [];

export const viralConfig = {
  /** Topics to hunt for. Each becomes an X search + a YouTube search. */
  searchTopics: [
    "Meta ads",
    "AI marketing",
    "TikTok ads",
    "ecommerce growth",
    "lead generation",
    "marketing agency",
    "UGC ads",
    "customer acquisition",
  ],

  /** How many topics to scrape per run (randomly rotated to keep the feed fresh + cheap). */
  topicsPerRun: 4,

  x: {
    /** Apify actor: https://apify.com/apidojo/tweet-scraper */
    actor: "apidojo/tweet-scraper",
    maxItemsPerTopic: 50,
    minLikes: 300,
    lookbackDays: 7,
    language: "en",
  },

  youtube: {
    /** Apify actor: https://apify.com/streamers/youtube-scraper */
    actor: "streamers/youtube-scraper",
    maxVideosPerTopic: 10,
    maxShortsPerTopic: 15,
    minViews: 20000,
    lookbackDays: 14,
  },

  /** How many viral sources get sent to Claude for ideation. */
  topSourcesForIdeation: 25,
  /** How many video ideas Claude should return. */
  ideasPerRun: 8,
  /** Auto mode: how many of the ideas get rendered without approval. */
  videosPerDay: parseInt(process.env.VIDEOS_PER_DAY || "2", 10),

  script: {
    targetSeconds: 45,
    /** ~150 spoken words per minute */
    wordsPerSecond: 2.5,
  },

  heygen: {
    /** 9:16 vertical for Reels / TikTok / Shorts. 1080x1920 needs a plan with 1080p export. */
    dimension: {
      width: parseInt(process.env.HEYGEN_WIDTH || "720", 10),
      height: parseInt(process.env.HEYGEN_HEIGHT || "1280", 10),
    },
    /** Ask HeyGen to generate captions (returned as caption_url). */
    caption: true,
    /** Give up waiting for a render after this long. */
    maxWaitMinutes: 30,
  },

  claudeModel: process.env.CLAUDE_MODEL || "claude-sonnet-5-5",

  avatars: [
    // {
    //   name: "Daniel — Studio",
    //   type: "avatar",
    //   id: "YOUR_AVATAR_ID",
    //   voiceId: "YOUR_VOICE_ID",
    //   persona: "Founder talking-head. Hot takes on agencies, ad spend, pay-per-result.",
    // },
    // {
    //   name: "Daniel — Casual",
    //   type: "talking_photo",
    //   id: "YOUR_TALKING_PHOTO_ID",
    //   voiceId: "YOUR_VOICE_ID",
    //   persona: "Casual explainer. Breakdowns of viral ads, tactics, quick tips.",
    // },
    ...envAvatar,
  ] as AvatarProfile[],
};
