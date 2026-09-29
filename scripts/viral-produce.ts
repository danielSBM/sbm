import fs from "fs";
import path from "path";
import { viralConfig } from "../config/viral.config";
import { createAvatarVideo, resolveAvatar, waitForVideos } from "./viral/heygen";
import type { VideoIdea } from "./viral/ideas";
import { loadHistory, loadPending, saveHistory, savePending, type ProducedVideo } from "./viral/store";
import { postToSlack, header, section, divider } from "./viral/slack";

/**
 * STEP 2 of the Viral Video Engine: render approved ideas with HeyGen avatars.
 *
 *   npm run viral:produce -- 1,3        render ideas #1 and #3
 *   npm run viral:produce -- --auto     render the top VIDEOS_PER_DAY ideas
 *   add --download to save the MP4s to output/videos/
 */
async function produceVideos(args: string[]) {
  const pending = loadPending();
  if (!pending || pending.ideas.length === 0) throw new Error("No pending ideas. Run `npm run viral:scout` first.");

  const history = loadHistory();
  const alreadyMade = new Set(
    history.videos.filter((v) => v.ideaDate === pending.date && v.status !== "failed").map((v) => v.ideaId)
  );

  const auto = args.includes("--auto") || process.env.IDEA_IDS === "auto";
  const idArg = args.find((a) => /^\d+(,\s*\d+)*$/.test(a)) || process.env.IDEA_IDS || "";

  let selected: VideoIdea[];
  if (auto) {
    selected = [...pending.ideas]
      .filter((i) => !alreadyMade.has(i.id))
      .sort((a, b) => b.viralPotential - a.viralPotential)
      .slice(0, viralConfig.videosPerDay);
  } else {
    const ids = idArg.split(",").map((s) => parseInt(s.trim(), 10)).filter(Boolean);
    if (ids.length === 0) throw new Error("Pass idea ids (e.g. `1,3`) or --auto");
    selected = pending.ideas.filter((i) => ids.includes(i.id));
    const skipped = selected.filter((i) => alreadyMade.has(i.id));
    if (skipped.length) console.log(`⏭️  Already rendered: ${skipped.map((i) => i.id).join(", ")}`);
    selected = selected.filter((i) => !alreadyMade.has(i.id));
  }

  if (selected.length === 0) {
    console.log("Nothing to render.");
    return;
  }

  console.log(`🎬 Rendering ${selected.length} video(s) with HeyGen\n`);

  // 1. Submit every render up front — HeyGen renders them in parallel
  const submitted: { idea: VideoIdea; videoId?: string; error?: string }[] = [];
  for (const idea of selected) {
    const avatar = resolveAvatar(idea.avatar);
    try {
      const videoId = await createAvatarVideo({
        title: `${idea.id}. ${idea.title}`,
        script: idea.script,
        avatar,
        callbackId: `${pending.date}#${idea.id}`,
      });
      console.log(`  🚀 #${idea.id} "${idea.title}" → ${avatar.name} (video_id ${videoId})`);
      submitted.push({ idea, videoId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ❌ #${idea.id} failed to submit: ${msg}`);
      submitted.push({ idea, error: msg });
    }
  }

  // 2. Wait for renders
  const ids = submitted.flatMap((s) => (s.videoId ? [s.videoId] : []));
  console.log(`\n⏳ Waiting for ${ids.length} render(s) (up to ${viralConfig.heygen.maxWaitMinutes} min)...`);
  const statuses = await waitForVideos(ids, (id, st) =>
    console.log(`  ${st.status === "completed" ? "✅" : "❌"} ${id}: ${st.status}${st.error ? ` — ${JSON.stringify(st.error)}` : ""}`)
  );

  // 3. Record results
  const produced: ProducedVideo[] = submitted.map(({ idea, videoId, error }) => {
    const st = videoId ? statuses.get(videoId) : undefined;
    return {
      ideaId: idea.id,
      ideaDate: pending.date,
      title: idea.title,
      avatar: idea.avatar,
      heygenVideoId: videoId || "",
      status: error ? "failed" : st?.status || "processing",
      videoUrl: st?.video_url,
      thumbnailUrl: st?.thumbnail_url,
      captionUrl: st?.caption_url,
      caption: idea.caption,
      hashtags: idea.hashtags,
      sourceUrls: idea.sourceUrls,
      error: error || (st?.error ? JSON.stringify(st.error) : undefined),
      createdAt: new Date().toISOString(),
    };
  });

  history.videos.push(...produced);
  const ok = produced.filter((p) => p.status !== "failed");
  history.usedSourceUrls = [...new Set([...history.usedSourceUrls, ...ok.flatMap((p) => p.sourceUrls)])];
  saveHistory(history);

  if (pending.ideas.every((i) => history.videos.some((v) => v.ideaDate === pending.date && v.ideaId === i.id))) {
    savePending({ ...pending, status: "produced" });
  }

  if (args.includes("--download") || process.env.DOWNLOAD_VIDEOS === "true") await download(produced);
  await sendResults(produced);
}

async function download(videos: ProducedVideo[]) {
  const dir = path.join(process.cwd(), "output/videos");
  fs.mkdirSync(dir, { recursive: true });

  for (const v of videos.filter((v) => v.videoUrl)) {
    const slug = v.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
    const base = path.join(dir, `${v.ideaDate.slice(0, 10)}-${v.ideaId}-${slug}`);
    const res = await fetch(v.videoUrl!);
    fs.writeFileSync(`${base}.mp4`, Buffer.from(await res.arrayBuffer()));
    fs.writeFileSync(`${base}.txt`, `${v.caption}\n\n${v.hashtags.map((h) => `#${h}`).join(" ")}\n`);
    console.log(`  💾 ${base}.mp4`);
  }
}

async function sendResults(videos: ProducedVideo[]) {
  const line = (v: ProducedVideo) => {
    const tags = v.hashtags.map((h) => `#${h}`).join(" ");
    if (v.status === "completed")
      return `✅ *${v.ideaId}. ${v.title}* (${v.avatar})\n<${v.videoUrl}|▶️ Download MP4>${v.captionUrl ? ` · <${v.captionUrl}|captions>` : ""}\n📝 ${v.caption}\n${tags}`;
    if (v.status === "failed") return `❌ *${v.ideaId}. ${v.title}* — ${v.error || "render failed"}`;
    return `⏳ *${v.ideaId}. ${v.title}* — still rendering (video_id \`${v.heygenVideoId}\`). Check HeyGen.`;
  };

  await postToSlack(
    [
      header(`🎥 ${videos.filter((v) => v.status === "completed").length}/${videos.length} avatar videos ready`),
      section("_HeyGen links expire after ~7 days — download or schedule them soon._"),
      divider,
      ...videos.map((v) => section(line(v))),
    ],
    videos.map(line).join("\n\n")
  );
}

if (require.main === module) {
  produceVideos(process.argv.slice(2))
    .then(() => console.log("\n✅ Production complete"))
    .catch((err) => {
      console.error("❌ Production failed:", err);
      process.exit(1);
    });
}

export { produceVideos };
