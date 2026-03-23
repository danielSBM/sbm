import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const OUTPUT_DIR = path.join(process.cwd(), "output", "tiktok-briefs");

export async function GET() {
  if (!fs.existsSync(OUTPUT_DIR)) return NextResponse.json([]);
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
          keyword: raw.config?.keyword || raw.searchResult?.keyword,
          videosAnalyzed: raw.searchResult?.totalVideos,
          generatedAt: raw.generatedAt,
        };
      } catch {}
    }
    return { file: f, ...meta };
  });
  return NextResponse.json(briefs);
}
