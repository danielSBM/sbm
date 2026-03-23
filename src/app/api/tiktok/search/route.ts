import { NextRequest, NextResponse } from "next/server";
import { ApifyClient } from "apify-client";

export const maxDuration = 60;

function calcEngagement(stats: {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}) {
  const total = stats.likes + stats.comments + stats.shares;
  const views = Math.max(stats.views, 1);
  return {
    rate: Number(((total / views) * 100).toFixed(2)),
    likesToViews: Number(((stats.likes / views) * 100).toFixed(2)),
    commentsToViews: Number(((stats.comments / views) * 100).toFixed(2)),
    sharesToViews: Number(((stats.shares / views) * 100).toFixed(2)),
  };
}

export async function POST(req: NextRequest) {
  try {
    const { keyword, maxVideos = 20, dateFrom, dateTo, sortBy = "likes" } = await req.json();

    if (!keyword) {
      return NextResponse.json({ error: "keyword is required" }, { status: 400 });
    }

    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "APIFY_API_TOKEN not configured" }, { status: 500 });
    }

    const client = new ApifyClient({ token });

    const run = await client.actor("clockworks/free-tiktok-scraper").call({
      searchQueries: [keyword],
      resultsPerPage: Math.min(maxVideos, 50),
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    let videos = items
      .filter((item: Record<string, unknown>) => item.id)
      .map((item: Record<string, unknown>) => {
        const authorMeta = (item.authorMeta || {}) as Record<string, unknown>;
        const videoMeta = (item.videoMeta || {}) as Record<string, unknown>;
        const createTime = Number(item.createTime) || 0;
        const mediaUrls = (item.mediaUrls || []) as string[];
        const hashtagsRaw = (item.hashtags || []) as Array<Record<string, unknown>>;

        const stats = {
          views: Number(item.playCount || 0),
          likes: Number(item.diggCount || 0),
          comments: Number(item.commentCount || 0),
          shares: Number(item.shareCount || 0),
          saves: Number(item.collectCount || 0),
        };

        return {
          id: String(item.id),
          url: String(item.webVideoUrl || `https://www.tiktok.com/@${authorMeta.name || "user"}/video/${item.id}`),
          caption: String(item.text || ""),
          createTime,
          createDate: item.createTimeISO
            ? String(item.createTimeISO).split("T")[0]
            : createTime ? new Date(createTime * 1000).toISOString().split("T")[0] : "",
          author: {
            uniqueId: String(authorMeta.name || ""),
            nickname: String(authorMeta.nickName || authorMeta.name || ""),
            followers: Number(authorMeta.fans || 0),
          },
          stats,
          engagement: calcEngagement(stats),
          thumbnailUrl: String(videoMeta.coverUrl || ""),
          videoUrl: mediaUrls[0] || "",
          duration: Number(videoMeta.duration || 0),
          hashtags: hashtagsRaw.map((h) => String(h.name || h.title || "")),
        };
      });

    // Date filtering
    if (dateFrom) {
      const fromTs = new Date(dateFrom).getTime() / 1000;
      videos = videos.filter((v: { createTime: number }) => v.createTime >= fromTs);
    }
    if (dateTo) {
      const toTs = new Date(dateTo).getTime() / 1000 + 86400;
      videos = videos.filter((v: { createTime: number }) => v.createTime <= toTs);
    }

    // Sort
    if (sortBy === "likes") {
      videos.sort((a: { stats: { likes: number } }, b: { stats: { likes: number } }) => b.stats.likes - a.stats.likes);
    } else if (sortBy === "date") {
      videos.sort((a: { createTime: number }, b: { createTime: number }) => b.createTime - a.createTime);
    }

    videos = videos.slice(0, maxVideos);

    // Aggregate hashtags
    const hashtagCount = new Map<string, number>();
    for (const v of videos) {
      for (const tag of (v as { hashtags: string[] }).hashtags) {
        if (tag) hashtagCount.set(tag, (hashtagCount.get(tag) || 0) + 1);
      }
    }
    const topHashtags = Array.from(hashtagCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));

    // Average engagement
    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const avgEngagement = {
      views: Math.round(avg(videos.map((v: { stats: { views: number } }) => v.stats.views))),
      likes: Math.round(avg(videos.map((v: { stats: { likes: number } }) => v.stats.likes))),
      comments: Math.round(avg(videos.map((v: { stats: { comments: number } }) => v.stats.comments))),
      shares: Math.round(avg(videos.map((v: { stats: { shares: number } }) => v.stats.shares))),
      engagementRate: Number(avg(videos.map((v: { engagement: { rate: number } }) => v.engagement.rate)).toFixed(2)),
    };

    const lastVideo = videos.length > 0 ? videos[videos.length - 1] : undefined;

    return NextResponse.json({
      keyword,
      totalVideos: videos.length,
      dateRange: {
        from: dateFrom || (lastVideo as { createDate: string } | undefined)?.createDate || "",
        to: dateTo || (videos[0] as { createDate: string } | undefined)?.createDate || "",
      },
      videos,
      topHashtags,
      avgEngagement,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
