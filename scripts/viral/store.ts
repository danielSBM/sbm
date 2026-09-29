import fs from "fs";
import path from "path";
import type { ViralSource } from "./apify";
import type { VideoIdea } from "./ideas";

const DIR = path.join(process.cwd(), "content/video-ideas");
const PENDING = path.join(DIR, "pending.json");
const HISTORY = path.join(DIR, "history.json");

export interface PendingVideoIdeas {
  date: string;
  status: "pending_approval" | "produced";
  sources: ViralSource[];
  ideas: VideoIdea[];
}

export interface ProducedVideo {
  ideaId: number;
  ideaDate: string;
  title: string;
  avatar: string;
  heygenVideoId: string;
  status: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  captionUrl?: string;
  caption: string;
  hashtags: string[];
  sourceUrls: string[];
  error?: string;
  createdAt: string;
}

export interface VideoHistory {
  usedSourceUrls: string[];
  videos: ProducedVideo[];
}

function readJson<T>(file: string, fallback: T): T {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
}

function writeJson(file: string, data: unknown) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

export const loadPending = () => readJson<PendingVideoIdeas | null>(PENDING, null);
export const savePending = (data: PendingVideoIdeas) => writeJson(PENDING, data);
export const loadHistory = () => readJson<VideoHistory>(HISTORY, { usedSourceUrls: [], videos: [] });
export const saveHistory = (data: VideoHistory) => writeJson(HISTORY, data);
