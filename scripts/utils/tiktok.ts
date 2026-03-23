import { ApifyClient } from "apify-client";

export interface TikTokVideo {
  id: string;
  url: string;
  caption: string;
  createTime: number;
  createDate: string;
  author: {
    uniqueId: string;
    nickname: string;
    followers: number;
  };
  stats: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
  engagement: {
    rate: number;
    likesToViews: number;
    commentsToViews: number;
    sharesToViews: number;
  };
  thumbnailUrl: string;
  videoUrl: string;
  duration: number;
  hashtags: string[];
  comments: TikTokComment[];
}

export interface TikTokComment {
  text: string;
  likes: number;
  replies: number;
  createTime: number;
  isQuestion: boolean;
}

export interface TikTokSearchParams {
  keyword: string;
  maxVideos?: number;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
  sortBy?: "relevance" | "likes" | "date";
}

export interface TikTokSearchResult {
  keyword: string;
  totalVideos: number;
  dateRange: { from: string; to: string };
  videos: TikTokVideo[];
  topHashtags: { tag: string; count: number }[];
  avgEngagement: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    engagementRate: number;
  };
}

function getApifyClient(): ApifyClient {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new Error(
      "APIFY_API_TOKEN is required. Get one at https://console.apify.com/account#/integrations"
    );
  }
  return new ApifyClient({ token });
}

function calcEngagement(stats: {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}) {
  const total = stats.likes + stats.comments + stats.shares;
  const views = Math.max(stats.views, 1);
  return {
    rate: (total / views) * 100,
    likesToViews: (stats.likes / views) * 100,
    commentsToViews: (stats.comments / views) * 100,
    sharesToViews: (stats.shares / views) * 100,
  };
}

function isQuestion(text: string): boolean {
  const questionPatterns = [
    /\?/,
    /^(how|what|where|when|why|who|which|can|do|does|is|are|will|would|should|could)\b/i,
    /anyone know/i,
    /tell me/i,
    /help me/i,
    /looking for/i,
  ];
  return questionPatterns.some((p) => p.test(text.trim()));
}

export async function searchTikTok(
  params: TikTokSearchParams
): Promise<TikTokSearchResult> {
  const {
    keyword,
    maxVideos = 20,
    dateFrom,
    dateTo,
    sortBy = "relevance",
  } = params;

  console.log(`\n🔍 Searching TikTok for "${keyword}"...`);
  if (dateFrom || dateTo) {
    console.log(`   Date range: ${dateFrom || "any"} → ${dateTo || "any"}`);
  }
  console.log(`   Max videos: ${maxVideos}`);

  const client = getApifyClient();

  // Use Apify's free TikTok Scraper actor
  const input: Record<string, unknown> = {
    searchQueries: [keyword],
    resultsPerPage: Math.min(maxVideos, 50),
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
  };

  const run = await client.actor("clockworks/free-tiktok-scraper").call(input);
  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  console.log(`   Found ${items.length} raw results`);

  // Parse results — field names match Apify's free-tiktok-scraper output:
  // Top-level: id, text, createTime, createTimeISO, webVideoUrl
  // Top-level stats: diggCount, shareCount, playCount, collectCount, commentCount
  // Nested: authorMeta { name, nickName, id, fans, following, ... }
  // Nested: hashtags [{ id, name, title }]
  // Nested: videoMeta { duration, coverUrl, ... }
  // Nested: mediaUrls [string]
  let videos: TikTokVideo[] = items
    .filter((item: Record<string, unknown>) => item.id)
    .map((item: Record<string, unknown>) => {
      const authorMeta = (item.authorMeta || {}) as Record<string, unknown>;
      const videoMeta = (item.videoMeta || {}) as Record<string, unknown>;
      const createTime = Number(item.createTime) || 0;

      // Stats are top-level fields in free-tiktok-scraper
      const stats = {
        views: Number(item.playCount || 0),
        likes: Number(item.diggCount || 0),
        comments: Number(item.commentCount || 0),
        shares: Number(item.shareCount || 0),
        saves: Number(item.collectCount || 0),
      };

      const hashtagsRaw = (item.hashtags || []) as Array<
        Record<string, unknown>
      >;

      // mediaUrls contains download URLs
      const mediaUrls = (item.mediaUrls || []) as string[];

      return {
        id: String(item.id),
        url: String(
          item.webVideoUrl ||
            `https://www.tiktok.com/@${authorMeta.name || "user"}/video/${item.id}`
        ),
        caption: String(item.text || ""),
        createTime,
        createDate: item.createTimeISO
          ? String(item.createTimeISO).split("T")[0]
          : createTime
            ? new Date(createTime * 1000).toISOString().split("T")[0]
            : "",
        author: {
          uniqueId: String(authorMeta.name || ""),
          nickname: String(authorMeta.nickName || authorMeta.name || ""),
          followers: Number(authorMeta.fans || 0),
        },
        stats,
        engagement: calcEngagement(stats),
        thumbnailUrl: String(videoMeta.coverUrl || ""),
        videoUrl: mediaUrls[0] || "",
        duration: Number(videoMeta.duration || item.duration || 0),
        hashtags: hashtagsRaw.map((h) => String(h.name || h.title || "")),
        comments: [],
      } as TikTokVideo;
    });

  // Date filtering
  if (dateFrom) {
    const fromTs = new Date(dateFrom).getTime() / 1000;
    videos = videos.filter((v) => v.createTime >= fromTs);
  }
  if (dateTo) {
    const toTs = new Date(dateTo).getTime() / 1000 + 86400;
    videos = videos.filter((v) => v.createTime <= toTs);
  }

  // Sort
  if (sortBy === "likes") {
    videos.sort((a, b) => b.stats.likes - a.stats.likes);
  } else if (sortBy === "date") {
    videos.sort((a, b) => b.createTime - a.createTime);
  }

  videos = videos.slice(0, maxVideos);

  console.log(`   ${videos.length} videos after filtering`);

  // Aggregate hashtags
  const hashtagCount = new Map<string, number>();
  for (const v of videos) {
    for (const tag of v.hashtags) {
      if (tag) hashtagCount.set(tag, (hashtagCount.get(tag) || 0) + 1);
    }
  }
  const topHashtags = Array.from(hashtagCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag, count]) => ({ tag, count }));

  // Average engagement
  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const avgEngagement = {
    views: Math.round(avg(videos.map((v) => v.stats.views))),
    likes: Math.round(avg(videos.map((v) => v.stats.likes))),
    comments: Math.round(avg(videos.map((v) => v.stats.comments))),
    shares: Math.round(avg(videos.map((v) => v.stats.shares))),
    engagementRate: Number(
      avg(videos.map((v) => v.engagement.rate)).toFixed(2)
    ),
  };

  const lastVideo = videos.length > 0 ? videos[videos.length - 1] : undefined;

  return {
    keyword,
    totalVideos: videos.length,
    dateRange: {
      from: dateFrom || lastVideo?.createDate || "",
      to: dateTo || videos[0]?.createDate || "",
    },
    videos,
    topHashtags,
    avgEngagement,
  };
}

export async function scrapeComments(
  videoUrl: string,
  maxComments: number = 100
): Promise<TikTokComment[]> {
  console.log(`   💬 Scraping comments for ${videoUrl}...`);

  const client = getApifyClient();

  // The free-tiktok-scraper supports post URLs with comment scraping
  const run = await client.actor("clockworks/free-tiktok-scraper").call({
    postURLs: [videoUrl],
    commentsPerPost: maxComments,
    maxRepliesPerComment: 5,
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  const comments: TikTokComment[] = [];

  for (const item of items) {
    // The scraper may return a commentsDatasetUrl, or embed comments
    // Try direct comment fields first, then check for nested comments array
    const rawComments = (item.comments || []) as Array<
      Record<string, unknown>
    >;

    if (rawComments.length > 0) {
      for (const c of rawComments) {
        const text = String(c.text || c.comment || "");
        if (!text) continue;
        comments.push({
          text,
          likes: Number(c.diggCount || c.likes || 0),
          replies: Number(c.replyCommentTotal || c.replies || 0),
          createTime: Number(c.createTime || 0),
          isQuestion: isQuestion(text),
        });
      }
    }

    // Some versions put the comment data URL in commentsDatasetUrl
    // If we got comments from the video post itself, those are in the dataset
    if (
      comments.length === 0 &&
      typeof item.commentsDatasetUrl === "string" &&
      item.commentsDatasetUrl
    ) {
      try {
        // Extract dataset ID from the URL
        const match = (item.commentsDatasetUrl as string).match(
          /datasets\/([^/]+)/
        );
        if (match) {
          const commentsDataset = await client
            .dataset(match[1])
            .listItems();
          for (const c of commentsDataset.items) {
            const text = String(
              (c as Record<string, unknown>).text ||
                (c as Record<string, unknown>).comment ||
                ""
            );
            if (!text) continue;
            comments.push({
              text,
              likes: Number((c as Record<string, unknown>).diggCount || (c as Record<string, unknown>).likes || 0),
              replies: Number(
                (c as Record<string, unknown>).replyCommentTotal ||
                  (c as Record<string, unknown>).replies ||
                  0
              ),
              createTime: Number((c as Record<string, unknown>).createTime || 0),
              isQuestion: isQuestion(text),
            });
          }
        }
      } catch (e) {
        console.log(`   ⚠️  Could not fetch comments dataset: ${e}`);
      }
    }
  }

  console.log(
    `   Found ${comments.length} comments (${comments.filter((c) => c.isQuestion).length} questions)`
  );
  return comments;
}
