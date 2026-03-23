import { NextRequest, NextResponse } from "next/server";
import { ApifyClient } from "apify-client";

export const maxDuration = 60;

function isQuestion(text: string): boolean {
  const patterns = [
    /\?/,
    /^(how|what|where|when|why|who|which|can|do|does|is|are|will|would|should|could)\b/i,
    /anyone know/i, /tell me/i, /help me/i, /looking for/i,
  ];
  return patterns.some((p) => p.test(text.trim()));
}

export async function POST(req: NextRequest) {
  try {
    const { videoUrl, maxComments = 50 } = await req.json();

    if (!videoUrl) {
      return NextResponse.json({ error: "videoUrl is required" }, { status: 400 });
    }

    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "APIFY_API_TOKEN not configured" }, { status: 500 });
    }

    const client = new ApifyClient({ token });

    const run = await client.actor("clockworks/free-tiktok-scraper").call({
      postURLs: [videoUrl],
      commentsPerPost: maxComments,
      maxRepliesPerComment: 5,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    const comments: Array<{
      text: string;
      likes: number;
      replies: number;
      createTime: number;
      isQuestion: boolean;
    }> = [];

    for (const item of items) {
      const rawComments = (item.comments || []) as Array<Record<string, unknown>>;

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

      // Try commentsDatasetUrl fallback
      if (
        comments.length === 0 &&
        typeof item.commentsDatasetUrl === "string" &&
        item.commentsDatasetUrl
      ) {
        try {
          const match = (item.commentsDatasetUrl as string).match(/datasets\/([^/]+)/);
          if (match) {
            const commentsDataset = await client.dataset(match[1]).listItems();
            for (const c of commentsDataset.items) {
              const rec = c as Record<string, unknown>;
              const text = String(rec.text || rec.comment || "");
              if (!text) continue;
              comments.push({
                text,
                likes: Number(rec.diggCount || rec.likes || 0),
                replies: Number(rec.replyCommentTotal || rec.replies || 0),
                createTime: Number(rec.createTime || 0),
                isQuestion: isQuestion(text),
              });
            }
          }
        } catch {
          // Ignore dataset fetch failures
        }
      }
    }

    return NextResponse.json({
      videoUrl,
      totalComments: comments.length,
      questions: comments.filter((c) => c.isQuestion).length,
      comments,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
