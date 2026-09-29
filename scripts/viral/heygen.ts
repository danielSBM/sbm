import { viralConfig, type AvatarProfile } from "../../config/viral.config";

const HEYGEN_BASE = "https://api.heygen.com";

export interface HeyGenVideoStatus {
  status: "pending" | "waiting" | "processing" | "completed" | "failed";
  video_url?: string;
  thumbnail_url?: string;
  caption_url?: string;
  duration?: number;
  error?: { code?: string | number; message?: string; detail?: string } | null;
}

async function heygen<T>(path: string, init: RequestInit = {}): Promise<T> {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) throw new Error("HEYGEN_API_KEY not set");

  const res = await fetch(`${HEYGEN_BASE}${path}`, {
    ...init,
    headers: {
      "X-Api-Key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init.headers,
    },
  });

  const body = await res.text();
  if (!res.ok) throw new Error(`HeyGen ${path} failed (${res.status}): ${body.slice(0, 400)}`);

  const json = JSON.parse(body);
  if (json.error) throw new Error(`HeyGen ${path} error: ${JSON.stringify(json.error)}`);
  return json.data as T;
}

export function resolveAvatar(name: string): AvatarProfile {
  const avatars = viralConfig.avatars;
  if (avatars.length === 0) {
    throw new Error(
      "No HeyGen avatars configured. Run `npm run heygen:list`, then add them to config/viral.config.ts " +
        "or set HEYGEN_AVATAR_ID + HEYGEN_VOICE_ID."
    );
  }
  return avatars.find((a) => a.name === name) || avatars[0];
}

/** Submits a single-scene avatar video. Returns the HeyGen video_id. */
export async function createAvatarVideo(opts: {
  title: string;
  script: string;
  avatar: AvatarProfile;
  callbackId?: string;
}): Promise<string> {
  const { avatar } = opts;

  const character =
    avatar.type === "talking_photo"
      ? { type: "talking_photo", talking_photo_id: avatar.id }
      : { type: "avatar", avatar_id: avatar.id, avatar_style: "normal" };

  const videoInput: Record<string, unknown> = {
    character,
    voice: {
      type: "text",
      voice_id: avatar.voiceId,
      input_text: opts.script.slice(0, 5000),
      speed: avatar.voiceSpeed ?? 1.0,
    },
  };
  if (avatar.backgroundColor) {
    videoInput.background = { type: "color", value: avatar.backgroundColor };
  }

  const data = await heygen<{ video_id: string }>("/v2/video/generate", {
    method: "POST",
    body: JSON.stringify({
      title: opts.title.slice(0, 100),
      caption: viralConfig.heygen.caption,
      dimension: viralConfig.heygen.dimension,
      callback_id: opts.callbackId,
      video_inputs: [videoInput],
    }),
  });

  return data.video_id;
}

export async function getVideoStatus(videoId: string): Promise<HeyGenVideoStatus> {
  return heygen<HeyGenVideoStatus>(`/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`);
}

/** Polls until every video is completed or failed (or the timeout hits). */
export async function waitForVideos(
  videoIds: string[],
  onUpdate?: (id: string, status: HeyGenVideoStatus) => void
): Promise<Map<string, HeyGenVideoStatus>> {
  const results = new Map<string, HeyGenVideoStatus>();
  const deadline = Date.now() + viralConfig.heygen.maxWaitMinutes * 60_000;
  let pending = [...videoIds];

  while (pending.length > 0 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 20_000));
    const stillPending: string[] = [];

    for (const id of pending) {
      try {
        const status = await getVideoStatus(id);
        if (status.status === "completed" || status.status === "failed") {
          results.set(id, status);
          onUpdate?.(id, status);
        } else {
          stillPending.push(id);
        }
      } catch (err) {
        console.warn(`  ⚠️  Status check failed for ${id}: ${err instanceof Error ? err.message : err}`);
        stillPending.push(id);
      }
    }

    pending = stillPending;
    if (pending.length) console.log(`  ⏳ ${pending.length} video(s) still rendering...`);
  }

  for (const id of pending) results.set(id, { status: "processing" });
  return results;
}

export async function listAvatars() {
  return heygen<{
    avatars: { avatar_id: string; avatar_name: string; gender?: string; premium?: boolean }[];
    talking_photos: { talking_photo_id: string; talking_photo_name: string }[];
  }>("/v2/avatars");
}

export async function listVoices() {
  return heygen<{
    voices: { voice_id: string; name: string; language: string; gender?: string }[];
  }>("/v2/voices");
}
